from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('history', '0006_dailyprintsequence'),
    ]

    operations = [
        migrations.AddField(
            model_name='diehistory',
            name='hash_version',
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='machinehistory',
            name='hash_version',
            field=models.PositiveSmallIntegerField(default=1),
        ),
    ]
