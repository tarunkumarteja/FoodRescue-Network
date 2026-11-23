from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from core.models import (
    User, Organization, FoodCategory, FoodListing, Reservation, Pickup,
    UserRole, OrgType, VerificationStatus, ListingStatus, ReservationStatus, PickupStatus
)
from core.matching import score_recipient_for_listing, get_ranked_recipients_for_listing, calculate_demand_forecast


class FoodRescueCoreTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.now = timezone.now()

        # Category
        self.category = FoodCategory.objects.create(
            name="Cooked Meals",
            requires_refrigeration=False
        )

        # Donor Org & User
        self.donor_org = Organization.objects.create(
            name="Test Kitchen",
            organization_type=OrgType.DONOR,
            latitude=12.9716,
            longitude=77.6006,
            verification_status=VerificationStatus.VERIFIED
        )
        self.donor_user = User.objects.create_user(
            username="test_donor",
            email="donor@test.com",
            password="Password@123",
            role=UserRole.DONOR,
            organization=self.donor_org
        )

        # Recipient Org & User
        self.recipient_org = Organization.objects.create(
            name="Test Shelter",
            organization_type=OrgType.RECIPIENT,
            latitude=12.9634,
            longitude=77.6012,
            capacity=120,
            verification_status=VerificationStatus.VERIFIED
        )
        self.recipient_user = User.objects.create_user(
            username="test_recipient",
            email="recipient@test.com",
            password="Password@123",
            role=UserRole.RECIPIENT,
            organization=self.recipient_org
        )

        # Volunteer User
        self.volunteer_user = User.objects.create_user(
            username="test_volunteer",
            email="volunteer@test.com",
            password="Password@123",
            role=UserRole.VOLUNTEER
        )

        # Listing (Slide 12: 50 packets)
        self.listing = FoodListing.objects.create(
            donor=self.donor_user,
            organization=self.donor_org,
            category=self.category,
            title="Biryani Buffet Surplus",
            description="50 thermal packed boxes",
            quantity=50,
            initial_quantity=50,
            prepared_at=self.now - timedelta(hours=1),
            best_before_datetime=self.now + timedelta(hours=4),
            pickup_deadline=self.now + timedelta(hours=3),
            pickup_address="12 Test Rd",
            latitude=12.9716,
            longitude=77.6006,
            status=ListingStatus.AVAILABLE
        )

    def test_matching_algorithm(self):
        """Tests the Slide 8 matching algorithm: Score = 0.4*D + 0.3*Q + 0.2*T + 0.1*C"""
        ranked = get_ranked_recipients_for_listing(self.listing)
        self.assertGreater(len(ranked), 0)
        top_match = ranked[0]
        self.assertEqual(top_match['recipient_id'], self.recipient_org.id)
        self.assertGreater(top_match['match_percentage'], 75.0)
        self.assertIn('factor_d_distance', top_match)
        self.assertIn('factor_q_quantity', top_match)
        self.assertIn('factor_t_deadline', top_match)
        self.assertIn('factor_c_capacity', top_match)

    def test_atomic_reservation_cycle(self):
        """Tests Slide 12: 50 listed -> 30 reserved -> 20 remaining"""
        self.client.force_authenticate(user=self.recipient_user)
        response = self.client.post('/api/v1/reservations/', {
            'food_listing': self.listing.id,
            'quantity_reserved': 30
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.listing.refresh_from_db()
        self.assertEqual(self.listing.quantity, 20)
        self.assertEqual(self.listing.status, ListingStatus.PARTIALLY_RESERVED)

        # Verify linked pickup created with OTPs
        reservation = Reservation.objects.get(id=response.data['id'])
        self.assertTrue(hasattr(reservation, 'pickup'))
        pickup = reservation.pickup
        self.assertEqual(len(pickup.donor_otp), 6)
        self.assertEqual(len(pickup.recipient_otp), 6)

        # Volunteer claims pickup
        self.client.force_authenticate(user=self.volunteer_user)
        claim_task_res = self.client.post(f'/api/v1/deliveries/{pickup.id}/claim_task/')
        self.assertEqual(claim_task_res.status_code, status.HTTP_200_OK)

        # Volunteer verifies donor handover via OTP
        verify_donor_res = self.client.post(f'/api/v1/deliveries/{pickup.id}/verify_donor_pickup/', {
            'otp': pickup.donor_otp
        })
        self.assertEqual(verify_donor_res.status_code, status.HTTP_200_OK)

        # Volunteer confirms delivery to recipient via recipient OTP
        verify_recip_res = self.client.post(f'/api/v1/deliveries/{pickup.id}/verify_recipient_delivery/', {
            'otp': pickup.recipient_otp
        })
        self.assertEqual(verify_recip_res.status_code, status.HTTP_200_OK)

        pickup.refresh_from_db()
        self.assertEqual(pickup.status, PickupStatus.DELIVERED)

    def test_demand_forecast(self):
        """Tests the predictive demand forecast generator"""
        forecast = calculate_demand_forecast()
        self.assertEqual(len(forecast['forecast_days']), 7)
        self.assertGreater(forecast['summary']['weekly_projected_demand'], 0)
