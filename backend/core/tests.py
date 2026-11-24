from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from core.models import (
    User, Organization, FoodCategory, FoodListing, Reservation, Pickup,
    DeliveryEvent, Feedback, Notification, SimulationRun,
    UserRole, OrgType, VerificationStatus, ListingStatus, ReservationStatus,
    PickupStatus, DeliveryEventType, NotificationType
)
from core.matching import score_recipient_for_listing, get_ranked_recipients_for_listing, calculate_demand_forecast
from core.safety import validate_donor_safety_compliance, validate_recipient_claim_eligibility, FoodSafetyValidationError
from core.simulation import run_network_simulation


class FoodRescueNetworkComprehensiveTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.now = timezone.now()

        # Categories
        self.cat_cooked = FoodCategory.objects.create(
            name="Cooked Meals",
            requires_refrigeration=False
        )
        self.cat_dairy = FoodCategory.objects.create(
            name="Dairy & Refrigerated",
            requires_refrigeration=True
        )

        # Admin User
        self.admin_user = User.objects.create_user(
            username="test_admin",
            email="admin@test.com",
            password="AdminPassword@123",
            role=UserRole.ADMIN,
            is_staff=True
        )

        # Donor Org & User
        self.donor_org = Organization.objects.create(
            name="Royal Spice Restaurant",
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
            organization=self.donor_org,
            is_verified=True
        )

        # Recipient Org 1 (Verified, Cold Storage)
        self.recipient_org1 = Organization.objects.create(
            name="Asha Shelter (Cold Storage)",
            organization_type=OrgType.RECIPIENT,
            latitude=12.9634,
            longitude=77.6012,
            capacity=120,
            has_cold_storage=True,
            verification_status=VerificationStatus.VERIFIED
        )
        self.recipient_user1 = User.objects.create_user(
            username="test_recipient1",
            email="recip1@test.com",
            password="Password@123",
            role=UserRole.RECIPIENT,
            organization=self.recipient_org1,
            is_verified=True
        )

        # Recipient Org 2 (Verified, NO Cold Storage)
        self.recipient_org2 = Organization.objects.create(
            name="Karuna Kitchen (No Cold Storage)",
            organization_type=OrgType.RECIPIENT,
            latitude=12.9784,
            longitude=77.6408,
            capacity=100,
            has_cold_storage=False,
            verification_status=VerificationStatus.VERIFIED
        )
        self.recipient_user2 = User.objects.create_user(
            username="test_recipient2",
            email="recip2@test.com",
            password="Password@123",
            role=UserRole.RECIPIENT,
            organization=self.recipient_org2,
            is_verified=True
        )

        # Volunteer User
        self.volunteer_user = User.objects.create_user(
            username="test_volunteer",
            email="volunteer@test.com",
            password="Password@123",
            role=UserRole.VOLUNTEER,
            is_verified=True
        )

        # Standard 50-packet Listing
        self.listing = FoodListing.objects.create(
            donor=self.donor_user,
            organization=self.donor_org,
            category=self.cat_cooked,
            title="Vegetable Biryani Surplus",
            description="50 thermal packed boxes",
            quantity=50,
            initial_quantity=50,
            prepared_at=self.now - timedelta(hours=1),
            best_before_datetime=self.now + timedelta(hours=4),
            pickup_deadline=self.now + timedelta(hours=3),
            storage_condition="Hot / Heated (>60°C)",
            food_safety_declaration="Certified hygienic preparation.",
            safety_reviewed=True,
            pickup_address="12 Residency Rd",
            latitude=12.9716,
            longitude=77.6006,
            status=ListingStatus.AVAILABLE
        )

    def test_matching_ranking_algorithm(self):
        """Tests the 4-factor matching algorithm: Score = 0.4*D + 0.3*Q + 0.2*T + 0.1*C"""
        ranked = get_ranked_recipients_for_listing(self.listing)
        self.assertGreater(len(ranked), 0)
        top_match = ranked[0]
        self.assertEqual(top_match['recipient_id'], self.recipient_org1.id)
        self.assertGreater(top_match['match_percentage'], 70.0)
        self.assertIn('factor_d_distance', top_match)
        self.assertIn('factor_q_quantity', top_match)
        self.assertIn('factor_t_deadline', top_match)
        self.assertIn('factor_c_capacity', top_match)

    def test_cold_storage_compatibility_filter(self):
        """Tests that refrigerated foods are filtered out for organizations without cold storage."""
        refrigerated_listing = FoodListing.objects.create(
            donor=self.donor_user,
            organization=self.donor_org,
            category=self.cat_dairy,
            title="Chilled Milk and Paneer Packs",
            description="Refrigerated products",
            quantity=30,
            initial_quantity=30,
            prepared_at=self.now - timedelta(hours=1),
            best_before_datetime=self.now + timedelta(hours=24),
            pickup_deadline=self.now + timedelta(hours=6),
            storage_condition="Refrigerated (<5°C)",
            food_safety_declaration="Stored cold continuously.",
            status=ListingStatus.AVAILABLE
        )

        score1, reason1 = score_recipient_for_listing(refrigerated_listing, self.recipient_org1)
        self.assertIsNotNone(score1)

        score2, reason2 = score_recipient_for_listing(refrigerated_listing, self.recipient_org2)
        self.assertIsNone(score2)
        self.assertIn("cold storage", reason2.lower())

    def test_atomic_reservation_and_inventory_decrement(self):
        """Tests atomic claim: 50 listed -> 30 reserved -> 20 remaining."""
        self.client.force_authenticate(user=self.recipient_user1)
        response = self.client.post('/api/v1/reservations/', {
            'food_listing': self.listing.id,
            'quantity_reserved': 30
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.listing.refresh_from_db()
        self.assertEqual(self.listing.quantity, 20)
        self.assertEqual(self.listing.status, ListingStatus.PARTIALLY_RESERVED)

        # Linked pickup created with OTPs
        reservation = Reservation.objects.get(id=response.data['id'])
        self.assertTrue(hasattr(reservation, 'pickup'))
        pickup = reservation.pickup
        self.assertEqual(len(pickup.donor_otp), 6)
        self.assertEqual(len(pickup.recipient_otp), 6)

    def test_over_allocation_prevention(self):
        """Tests that attempting to claim more than available inventory is rejected."""
        self.client.force_authenticate(user=self.recipient_user1)
        response = self.client.post('/api/v1/reservations/', {
            'food_listing': self.listing.id,
            'quantity_reserved': 100  # Only 50 available
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.quantity, 50)  # Untouched

    def test_delivery_lifecycle_and_handover_otps(self):
        """Tests the 4-stage delivery tracking cycle with Donor OTP and Recipient OTP."""
        # 1. Claim reservation
        self.client.force_authenticate(user=self.recipient_user1)
        res = self.client.post('/api/v1/reservations/', {
            'food_listing': self.listing.id,
            'quantity_reserved': 25
        })
        pickup_id = res.data['pickup']['id']
        pickup = Pickup.objects.get(id=pickup_id)

        # 2. Volunteer claims delivery task
        self.client.force_authenticate(user=self.volunteer_user)
        claim_res = self.client.post(f'/api/v1/deliveries/{pickup_id}/claim_task/')
        self.assertEqual(claim_res.status_code, status.HTTP_200_OK)

        # 3. Donor handover with invalid OTP fails
        bad_otp_res = self.client.post(f'/api/v1/deliveries/{pickup_id}/verify_donor_pickup/', {'otp': '000000'})
        self.assertEqual(bad_otp_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Donor handover with valid OTP succeeds
        donor_otp_res = self.client.post(f'/api/v1/deliveries/{pickup_id}/verify_donor_pickup/', {'otp': pickup.donor_otp})
        self.assertEqual(donor_otp_res.status_code, status.HTTP_200_OK)
        pickup.refresh_from_db()
        self.assertEqual(pickup.status, PickupStatus.PICKED_UP)

        # 5. Recipient delivery confirmation with Recipient OTP
        recip_otp_res = self.client.post(f'/api/v1/deliveries/{pickup_id}/verify_recipient_delivery/', {'otp': pickup.recipient_otp})
        self.assertEqual(recip_otp_res.status_code, status.HTTP_200_OK)
        pickup.refresh_from_db()
        self.assertEqual(pickup.status, PickupStatus.DELIVERED)

    def test_reservation_cancellation_and_inventory_restoration(self):
        """Tests that cancelling a reservation restores inventory atomically."""
        self.client.force_authenticate(user=self.recipient_user1)
        res = self.client.post('/api/v1/reservations/', {
            'food_listing': self.listing.id,
            'quantity_reserved': 20
        })
        res_id = res.data['id']
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.quantity, 30)

        # Cancel
        cancel_res = self.client.post(f'/api/v1/reservations/{res_id}/cancel/', {'reason': 'Surplus not needed'})
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)

        self.listing.refresh_from_db()
        self.assertEqual(self.listing.quantity, 50)  # Restored!

    def test_food_safety_validation(self):
        """Tests deterministic food safety validations."""
        # Unverified donor should fail
        unverified_org = Organization.objects.create(
            name="Unverified Eatery",
            verification_status=VerificationStatus.PENDING
        )
        unverified_user = User.objects.create_user(
            username="unverified_d",
            email="u@test.com",
            role=UserRole.DONOR,
            organization=unverified_org
        )

        with self.assertRaises(FoodSafetyValidationError):
            validate_donor_safety_compliance(unverified_user, {
                'food_safety_declaration': 'Test',
                'pickup_deadline': self.now + timedelta(hours=2)
            })

    def test_notifications_dispatch(self):
        """Tests that notifications are generated upon claim confirmation."""
        initial_count = Notification.objects.filter(recipient=self.donor_user).count()
        self.client.force_authenticate(user=self.recipient_user1)
        self.client.post('/api/v1/reservations/', {
            'food_listing': self.listing.id,
            'quantity_reserved': 10
        })
        new_count = Notification.objects.filter(recipient=self.donor_user).count()
        self.assertGreater(new_count, initial_count)

    def test_admin_dispute_resolution(self):
        """Tests admin resolving user feedback / safety issue."""
        feedback = Feedback.objects.create(
            author=self.recipient_user1,
            target_organization=self.donor_org,
            comments="Packaging was slightly crushed on one corner.",
            report_safety_issue=True
        )
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.post(f'/api/v1/feedback/{feedback.id}/resolve/', {
            'notes': 'Contacted donor kitchen lead; packaging standards reviewed.'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        feedback.refresh_from_db()
        self.assertTrue(feedback.is_resolved)
        self.assertEqual(feedback.resolved_by, self.admin_user)

    def test_demand_forecast(self):
        """Tests the predictive demand forecast service."""
        forecast = calculate_demand_forecast()
        self.assertEqual(len(forecast['forecast_days']), 7)
        self.assertGreater(forecast['summary']['weekly_projected_demand'], 0)
        self.assertIn('category_breakdown', forecast)

    def test_network_simulation_benchmark(self):
        """Tests multi-agent simulation and benchmarking suite."""
        result = run_network_simulation(num_donors=3, num_recipients=4, num_listings=6)
        metrics = result['metrics']
        self.assertEqual(metrics['num_listings_generated'], 6)
        self.assertGreater(metrics['successful_matches'], 0)
        self.assertGreater(metrics['total_quantity_distributed_packets'], 0)
        self.assertIn('atomic_concurrency_integrity', metrics)
        self.assertTrue(SimulationRun.objects.filter(run_id=result['run_id']).exists())
