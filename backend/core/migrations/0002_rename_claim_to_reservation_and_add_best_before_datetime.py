# Generated for safe schema evolution: Rename Claim to Reservation and add best_before_datetime
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RenameModel(
            old_name='Claim',
            new_name='Reservation',
        ),
        migrations.RenameField(
            model_name='pickup',
            old_name='claim',
            new_name='reservation',
        ),
        migrations.RenameField(
            model_name='feedback',
            old_name='claim',
            new_name='reservation',
        ),
        migrations.AddField(
            model_name='foodlisting',
            name='best_before_datetime',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='pickup',
            name='reservation',
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='pickup',
                to='core.reservation',
            ),
        ),
        migrations.AlterField(
            model_name='feedback',
            name='reservation',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='feedbacks',
                to='core.reservation',
            ),
        ),
        migrations.AlterField(
            model_name='reservation',
            name='food_listing',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='reservations',
                to='core.foodlisting',
            ),
        ),
        migrations.AlterField(
            model_name='reservation',
            name='organization',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='reservations',
                to='core.organization',
            ),
        ),
        migrations.AlterField(
            model_name='reservation',
            name='recipient',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='reservations',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='reservation',
            name='status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'Pending Pickup'),
                    ('CONFIRMED', 'Confirmed & Reserved'),
                    ('CANCELLED', 'Cancelled'),
                    ('COMPLETED', 'Completed'),
                ],
                default='CONFIRMED',
                max_length=20,
            ),
        ),
    ]
