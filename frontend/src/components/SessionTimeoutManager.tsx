import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'

const DEFAULT_IDLE_MINUTES = 30
const DEFAULT_ABSOLUTE_HOURS = 12
const WARNING_LIMIT_MS = 2 * 60 * 1000 // 2 minutes warning before lock
const LOCK_GRACE_PERIOD_MS = 5 * 60 * 1000 // 5 minutes on lock screen before forced logout

export function SessionTimeoutManager() {
  const { token, logout, username, setToken } = useAuth()
  const { request } = useApi()
  const navigate = useNavigate()

  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(120)
  const [isLocked, setIsLocked] = useState(false)
  const [unlockPassword, setUnlockPassword] = useState('')
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [absoluteWarning, setAbsoluteWarning] = useState<string | null>(null)

  const lastActivity = useRef(Date.now())
  const lastBroadcast = useRef(Date.now())
  const lockedAt = useRef<number | null>(null)
  const failedUnlockAttempts = useRef(0)
  const sessionCreatedAt = useRef(Date.now())
  const channelRef = useRef<BroadcastChannel | null>(null)

  const idleMinutesRef = useRef(DEFAULT_IDLE_MINUTES)
  const absoluteHoursRef = useRef(DEFAULT_ABSOLUTE_HOURS)
  const prevTokenRef = useRef<string | null>(token)

  // Fetch dynamic timeout configuration from server
  useEffect(() => {
    fetch('/api/v1/server-info/')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          if (typeof data.session_idle_timeout_minutes === 'number') {
            idleMinutesRef.current = data.session_idle_timeout_minutes
          }
          if (typeof data.session_absolute_timeout_hours === 'number') {
            absoluteHoursRef.current = data.session_absolute_timeout_hours
          }
        }
      })
      .catch(() => {})
  }, [])

  // Cross-Tab Synchronization setup (BroadcastChannel + storage fallback)
  useEffect(() => {
    let channel: BroadcastChannel | null = null

    if (typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('tms_activity_sync')
        channelRef.current = channel

        channel.onmessage = (event) => {
          if (event.data?.type === 'USER_ACTIVITY' && typeof event.data.timestamp === 'number') {
            lastActivity.current = Math.max(lastActivity.current, event.data.timestamp)
            setShowWarning(false)
          }
        }
      } catch {
        // BroadcastChannel unavailable in this environment
      }
    }

    // Storage fallback for cross-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tms_last_activity' && e.newValue) {
        const ts = parseInt(e.newValue, 10)
        if (!isNaN(ts)) {
          lastActivity.current = Math.max(lastActivity.current, ts)
          setShowWarning(false)
        }
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      if (channel) {
        channel.close()
        channelRef.current = null
      }
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const broadcastActivity = (timestamp: number) => {
    if (Date.now() - lastBroadcast.current > 10000) {
      lastBroadcast.current = Date.now()
      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'USER_ACTIVITY', timestamp })
      }
      try {
        localStorage.setItem('tms_last_activity', timestamp.toString())
      } catch {
        // localStorage write non-fatal
      }
    }
  }

  useEffect(() => {
    if (!token) {
      prevTokenRef.current = null
      setShowWarning(false)
      setIsLocked(false)
      lockedAt.current = null
      return
    }

    // Reset timers when transition from logged out to logged in
    if (!prevTokenRef.current) {
      lastActivity.current = Date.now()
      sessionCreatedAt.current = Date.now()
      setIsLocked(false)
      lockedAt.current = null
      failedUnlockAttempts.current = 0
    }
    prevTokenRef.current = token

    const handleActivity = () => {
      const now = Date.now()
      lastActivity.current = now
      broadcastActivity(now)
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(event => window.addEventListener(event, handleActivity))

    const interval = setInterval(() => {
      const now = Date.now()

      // 1. Check Absolute Timeout (e.g. 12 hours)
      const absMs = absoluteHoursRef.current * 3600 * 1000
      const timeSinceCreation = now - sessionCreatedAt.current
      const absRemaining = absMs - timeSinceCreation

      if (absRemaining <= 0) {
        clearInterval(interval)
        logout()
        navigate('/login')
        return
      } else if (absRemaining <= 10 * 60 * 1000) {
        const mins = Math.max(1, Math.ceil(absRemaining / 60000))
        setAbsoluteWarning(`Shift session will expire in ${mins} minute${mins > 1 ? 's' : ''} (12-hour limit). Please save your changes.`)
      } else {
        setAbsoluteWarning(null)
      }

      // 2. Check Locked Screen Grace Expiry
      if (lockedAt.current) {
        if (now - lockedAt.current >= LOCK_GRACE_PERIOD_MS) {
          clearInterval(interval)
          logout()
          navigate('/login')
          setIsLocked(false)
          lockedAt.current = null
        }
        return
      }

      // 3. Check Idle Timeout
      const totalIdleMs = idleMinutesRef.current * 60 * 1000
      const warningThresholdMs = Math.max(1000, totalIdleMs - WARNING_LIMIT_MS)
      const timeSinceLastActivity = now - lastActivity.current

      if (timeSinceLastActivity >= warningThresholdMs) {
        setShowWarning(true)
        const remaining = Math.max(0, Math.ceil((totalIdleMs - timeSinceLastActivity) / 1000))
        setCountdown(remaining)

        if (remaining <= 0) {
          setShowWarning(false)
          setIsLocked(true)
          lockedAt.current = Date.now()
        }
      } else {
        setShowWarning(false)
      }
    }, 1000)

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity))
      clearInterval(interval)
    }
  }, [token, logout, navigate])

  const stayLoggedIn = async () => {
    try {
      await request('/api/auth/keep-alive/', { method: 'POST' })
      const now = Date.now()
      lastActivity.current = now
      setShowWarning(false)
      broadcastActivity(now)
    } catch {
      logout()
      navigate('/login')
      setShowWarning(false)
    }
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unlockPassword.trim()) return

    setUnlocking(true)
    setUnlockError(null)

    try {
      const res = await fetch('/api/v1/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          username: username || '',
          password: unlockPassword
        })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        failedUnlockAttempts.current += 1
        if (failedUnlockAttempts.current >= 5) {
          logout()
          navigate('/login')
          setIsLocked(false)
          return
        }
        setUnlockError(errData.detail || 'Incorrect password. Please try again.')
        setUnlocking(false)
        return
      }

      const data = await res.json()
      if (data.token && setToken) {
        setToken(data.token)
      }

      const now = Date.now()
      lastActivity.current = now
      sessionCreatedAt.current = now
      setIsLocked(false)
      lockedAt.current = null
      setUnlockPassword('')
      setUnlockError(null)
      failedUnlockAttempts.current = 0
      broadcastActivity(now)
    } catch {
      setUnlockError('Authentication failed. Check your network connection.')
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <>
      {/* 1. Absolute Timeout Banner (10 minutes before 12-hour expiration) */}
      {absoluteWarning && (
        <div className="fixed top-0 left-0 right-0 z-[9998] bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center text-xs font-mono text-amber-400 flex items-center justify-center gap-2 animate-fadeIn backdrop-blur-sm">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{absoluteWarning}</span>
        </div>
      )}

      {/* 2. Idle Timeout Warning Dialog */}
      {showWarning && !isLocked && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0a]/80 font-mono backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm p-5 shadow-2xl">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xs font-medium uppercase tracking-[0.05em] text-[#e4e4e4] font-mono">
                SESSION TIMEOUT WARNING
              </h3>
            </div>
            <p className="mt-2 text-xs text-[#6b7280] font-mono leading-relaxed">
              You have been idle for a while. To protect shop-floor data, your session will be locked in <span className="text-emerald-400 font-mono font-bold tabular-nums">{countdown}</span> seconds.
            </p>
            <div className="mt-4 pt-3 border-t border-[#1a1a1a] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate('/login')
                  setShowWarning(false)
                }}
                className="px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider text-[#6b7280] hover:text-[#e4e4e4] bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] rounded-sm transition cursor-pointer"
              >
                Logout
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWarning(false)
                  setIsLocked(true)
                  lockedAt.current = Date.now()
                }}
                className="px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider text-amber-400 hover:text-amber-300 bg-[#141414] hover:bg-[#1f1f1f] border border-amber-500/40 rounded-sm transition cursor-pointer"
              >
                Lock Now
              </button>
              <button
                type="button"
                onClick={stayLoggedIn}
                className="px-4 py-1.5 bg-[#141414] hover:bg-[#1f1f1f] text-emerald-400 hover:text-emerald-300 border border-emerald-500/50 text-xs font-mono uppercase tracking-wider rounded-sm transition cursor-pointer"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. In-Place Lock Screen Modal (Preserving Form States) */}
      {isLocked && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#050505]/95 font-mono backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-[#181818] border border-[#333] flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#e4e4e4]">
                SESSION LOCKED
              </h3>
              <p className="mt-1 text-[11px] text-[#6b7280] leading-relaxed">
                Work session preserved. Enter password to resume.
              </p>
              {username && (
                <div className="mt-3 px-2.5 py-1 bg-[#141414] border border-[#262626] rounded-sm text-xs font-mono text-zinc-300">
                  {username}
                </div>
              )}
            </div>

            <form onSubmit={handleUnlock} className="mt-5 space-y-3">
              <div>
                <input
                  type="password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                  required
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2a2a2a] focus:border-emerald-500 rounded-sm text-xs font-mono text-[#e4e4e4] placeholder-zinc-600 focus:outline-none transition"
                />
              </div>

              {unlockError && (
                <p className="text-[11px] font-mono text-rose-400 text-center animate-shake">
                  {unlockError}
                </p>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={unlocking}
                  className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/50 text-xs font-mono uppercase tracking-wider rounded-sm transition cursor-pointer disabled:opacity-50"
                >
                  {unlocking ? 'Verifying...' : 'Unlock Session'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    navigate('/login')
                    setIsLocked(false)
                  }}
                  className="w-full py-1.5 text-[11px] font-mono uppercase tracking-wider text-[#6b7280] hover:text-[#e4e4e4] transition cursor-pointer"
                >
                  Log Out Completely
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
