from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dies', '0017_alter_dieinventoryrecountitem_die_size_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='outboxtask',
            name='status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'Pending'),
                    ('IN_PROGRESS', 'In Progress'),
                    ('PROCESSED', 'Processed'),
                    ('FAILED', 'Failed'),
                ],
                db_index=True,
                default='PENDING',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='outboxtask',
            name='claimed_at',
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
    ]
