from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('dies', '0018_outboxtask_status_claimed_at'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='die',
            name='die_rack_shelf_idx',
        ),
        migrations.RemoveField(
            model_name='die',
            name='rack',
        ),
        migrations.RemoveField(
            model_name='die',
            name='shelf_number',
        ),
    ]
