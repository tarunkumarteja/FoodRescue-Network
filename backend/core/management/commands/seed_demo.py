from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.auth import get_user_model
from core.views import seed_demo_data
from rest_framework.test import APIRequestFactory
from rest_framework.test import force_authenticate
from core.models import UserRole


class Command(BaseCommand):
    help = 'Seeds initial demonstration data for FoodRescue Network (Slide 12 Demo Scenario)'

    def handle(self, *args, **options):
        if not settings.DEBUG:
            from django.core.management.base import CommandError
            raise CommandError('Demo accounts and data are disabled when DEBUG=False.')

        user_model = get_user_model()
        admin_user, _ = user_model.objects.get_or_create(
            username='admin',
            defaults={'email': 'admin@foodrescue.org', 'role': UserRole.ADMIN, 'is_staff': True}
        )
        admin_user.role = UserRole.ADMIN
        admin_user.is_staff = True
        admin_user.save(update_fields=['role', 'is_staff'])
        factory = APIRequestFactory()
        request = factory.post('/api/v1/seed-demo/')
        force_authenticate(request, user=admin_user)
        response = seed_demo_data(request)
        self.stdout.write(self.style.SUCCESS(f"Successfully seeded: {response.data.get('message')}"))
        self.stdout.write("Created test accounts:")
        for acc in response.data.get('accounts', []):
            self.stdout.write(f" - [{acc['role']}] Username: {acc['username']} | Password: {acc['password']}")
