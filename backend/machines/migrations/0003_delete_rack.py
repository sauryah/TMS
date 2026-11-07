from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('machines', '0002_alter_set_options_set_order'),
        ('dies', '0019_remove_die_rack_shelf'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Rack',
        ),
    ]
