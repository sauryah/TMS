from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('history', '0007_diehistory_machinehistory_hash_version'),
    ]

    operations = [
        migrations.AlterField(
            model_name='diehistory',
            name='hash_version',
            field=models.PositiveSmallIntegerField(default=2),
        ),
        migrations.AlterField(
            model_name='machinehistory',
            name='hash_version',
            field=models.PositiveSmallIntegerField(default=2),
        ),
    ]
