from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('history', '0005_printrecord'),
    ]

    operations = [
        migrations.CreateModel(
            name='DailyPrintSequence',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(db_index=True, unique=True)),
                ('last_seq', models.PositiveIntegerField(default=0)),
            ],
            options={
                'indexes': [models.Index(fields=['date'], name='history_dai_date_69bc50_idx')],
            },
        ),
    ]
