from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_remove_user_totp_secret_userbackupcode'),
    ]

    operations = [
        migrations.AlterField(
            model_name='useractivitylog',
            name='action',
            field=models.CharField(
                choices=[
                    ('LOGIN', 'Login'),
                    ('LOGOUT', 'Logout'),
                    ('FAILED_LOGIN', 'Failed Login'),
                    ('SESSION_EXPIRED', 'Session Expired'),
                    ('SESSION_LOCKED', 'Session Locked'),
                    ('SESSION_UNLOCKED', 'Session Unlocked'),
                    ('ADMIN_ACTION', 'Admin Action'),
                    ('USER_CREATED', 'User Created'),
                    ('USER_DELETED', 'User Deleted'),
                    ('ROLE_CHANGED', 'Role Changed'),
                    ('ACCOUNT_SUSPENDED', 'Account Suspended'),
                    ('ACCOUNT_ACTIVATED', 'Account Activated'),
                    ('PERMISSIONS_CHANGED', 'Permissions Changed'),
                ],
                max_length=20,
            ),
        ),
    ]
