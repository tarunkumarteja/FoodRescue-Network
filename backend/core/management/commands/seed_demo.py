from django.core.management.base import BaseCommand
from core.views import seed_demo_data
from rest_framework.test import APIRequestFactory


class Command(BaseCommand):
    help = 'Seeds initial demonstration data for FoodRescue Network (Slide 12 Demo Scenario)'

    def handle(self, *args, **options):
        factory = APIRequestFactory()
        request = factory.post('/api/v1/seed-demo/')
        response = seed_demo_data(request)
        self.stdout.write(self.style.SUCCESS(f"Successfully seeded: {response.data.get('message')}"))
        self.stdout.write("Created test accounts:")
        for acc in response.data.get('accounts', []):
            self.stdout.write(f" - [{acc['role']}] Username: {acc['username']} | Password: {acc['password']}")
