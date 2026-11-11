import hashlib
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache
from rest_framework.exceptions import AuthenticationFailed
from users.models import UserSession, UserActivityLog


class SessionService:
    @staticmethod
    def get_session_data(user, token_hash: str) -> dict:
        cache_key = f"user_session:{user.id}:{token_hash}"
        cached_data = cache.get(cache_key)

        session_created_at = None
        session_last_seen = None
        ip_address = ""
        device = ""

        if cached_data:
            try:
                session_created_at = timezone.datetime.fromisoformat(cached_data['created_at'])
                session_last_seen = timezone.datetime.fromisoformat(cached_data['last_seen'])
                ip_address = cached_data.get('ip_address', '')
                device = cached_data.get('device', '')
            except (KeyError, ValueError, TypeError):
                cached_data = None

        if not cached_data:
            try:
                session = UserSession.objects.get(user=user, token_hash=token_hash)
                session_created_at = session.created_at
                session_last_seen = session.last_seen
                ip_address = session.ip_address
                device = session.device

                cache_data = {
                    'ip_address': ip_address,
                    'device': device,
                    'created_at': session_created_at.isoformat(),
                    'last_seen': session_last_seen.isoformat(),
                }
                cache.set(cache_key, cache_data, timeout=settings.SESSION_ABSOLUTE_TIMEOUT_HOURS * 3600)
            except UserSession.DoesNotExist:
                eviction_key = f"evicted_session:{user.id}:{token_hash}"
                evicted_data = cache.get(eviction_key)
                if evicted_data:
                    raise AuthenticationFailed(
                        detail={
                            "detail": "Session replaced on another device or expired",
                            "code": "session_evicted",
                            "evicted_by_ip": evicted_data.get("evicted_by_ip", ""),
                            "evicted_at": evicted_data.get("evicted_at", "")
                        }
                    )
                raise AuthenticationFailed("Session replaced on another device or expired")

        return {
            'session_created_at': session_created_at,
            'session_last_seen': session_last_seen,
            'ip_address': ip_address,
            'device': device,
        }

    @staticmethod
    def check_timeouts(user, token_hash: str, session_data: dict) -> None:
        now = timezone.now()
        session_last_seen = session_data['session_last_seen']
        session_created_at = session_data['session_created_at']

        idle_limit = now - timedelta(minutes=settings.SESSION_IDLE_TIMEOUT_MINUTES)
        absolute_limit = now - timedelta(hours=settings.SESSION_ABSOLUTE_TIMEOUT_HOURS)

        if session_last_seen < idle_limit or session_created_at < absolute_limit:
            cache_key = f"user_session:{user.id}:{token_hash}"
            UserSession.objects.filter(user=user, token_hash=token_hash).delete()
            cache.delete(cache_key)

            UserActivityLog.objects.create(
                user=user,
                username=user.username,
                action='SESSION_EXPIRED',
                ip_address=session_data['ip_address'],
                device=session_data['device']
            )
            raise AuthenticationFailed("Session replaced on another device or expired")

    @staticmethod
    def update_last_seen(user, token_hash: str, session_data: dict) -> None:
        now = timezone.now()
        session_last_seen = session_data['session_last_seen']

        if now - session_last_seen > timedelta(minutes=1):
            cache_key = f"user_session:{user.id}:{token_hash}"
            cache_data = {
                'ip_address': session_data['ip_address'],
                'device': session_data['device'],
                'created_at': session_data['session_created_at'].isoformat(),
                'last_seen': now.isoformat(),
            }
            cache.set(cache_key, cache_data, timeout=settings.SESSION_ABSOLUTE_TIMEOUT_HOURS * 3600)

            # Throttle database write-back to once every 5 minutes
            db_update_cache_key = f"user_session_db_update:{user.id}:{token_hash}"
            last_db_update = cache.get(db_update_cache_key)
            
            should_update_db = True
            if last_db_update:
                try:
                    last_db_update_dt = timezone.datetime.fromisoformat(last_db_update)
                    if now - last_db_update_dt < timedelta(minutes=5):
                        should_update_db = False
                except (ValueError, TypeError):
                    pass
            
            if should_update_db:
                try:
                    UserSession.objects.filter(user=user, token_hash=token_hash).update(last_seen=now)
                    cache.set(db_update_cache_key, now.isoformat(), timeout=settings.SESSION_ABSOLUTE_TIMEOUT_HOURS * 3600)
                except Exception:
                    pass

    @staticmethod
    def lock_session(user, token_hash: str) -> None:
        """
        Record session as locked in cache and invalidate Go API token cache.
        """
        lock_key = f"locked_session:{user.id}:{token_hash}"
        lock_ttl = getattr(settings, 'SESSION_LOCK_GRACE_PERIOD_SECONDS', 900)
        cache.set(
            lock_key,
            {
                "locked_at": timezone.now().isoformat(),
            },
            timeout=lock_ttl
        )

        # Invalidate Go API verification cache so read requests drop immediately
        try:
            import redis
            r = redis.Redis.from_url(settings.REDIS_CACHE_URL)
            r.delete(f"verify_token:{token_hash}")
        except Exception:
            pass

    @staticmethod
    def unlock_session(user, token_hash: str) -> None:
        """
        Remove locked state for session in cache.
        """
        lock_key = f"locked_session:{user.id}:{token_hash}"
        cache.delete(lock_key)

        try:
            import redis
            r = redis.Redis.from_url(settings.REDIS_CACHE_URL)
            r.delete(f"verify_token:{token_hash}")
        except Exception:
            pass

    @staticmethod
    def is_session_locked(user_id: int, token_hash: str) -> bool:
        """
        Check if the session has been marked as locked.
        """
        lock_key = f"locked_session:{user_id}:{token_hash}"
        return bool(cache.get(lock_key))

    @staticmethod
    def check_locked(user, token_hash: str) -> None:
        """
        Raise AuthenticationFailed if the session is locked.
        """
        if SessionService.is_session_locked(user.id, token_hash):
            raise AuthenticationFailed(
                detail={
                    "detail": "Session is locked. Re-authentication required.",
                    "code": "session_locked"
                }
            )
