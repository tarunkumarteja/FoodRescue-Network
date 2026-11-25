import secrets
import string
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


def generate_otp():
    """Generates a secure 6-digit numeric OTP for handover confirmation."""
    return ''.join(secrets.choice(string.digits) for _ in range(6))


def generate_qr_token():
    """Generates a unique secure token for QR code verification."""
    return uuid.uuid4().hex


class UserRole(models.TextChoices):
    DONOR = 'DONOR', 'Food Donor'
    RECIPIENT = 'RECIPIENT', 'Food Recipient (NGO / Shelter)'
    VOLUNTEER = 'VOLUNTEER', 'Volunteer Logistics'
    ADMIN = 'ADMIN', 'Platform Administrator'


class OrgType(models.TextChoices):
    DONOR = 'DONOR', 'Food Donor Entity'
    RECIPIENT = 'RECIPIENT', 'Recipient Charity / NGO'


class VerificationStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Admin Verification'
    VERIFIED = 'VERIFIED', 'Verified & Approved'
    REJECTED = 'REJECTED', 'Verification Rejected'


class ListingStatus(models.TextChoices):
    AVAILABLE = 'AVAILABLE', 'Available'
    PARTIALLY_RESERVED = 'PARTIALLY_RESERVED', 'Partially Reserved'
    RESERVED = 'RESERVED', 'Fully Reserved'
    PICKED_UP = 'PICKED_UP', 'Picked Up'
    COMPLETED = 'COMPLETED', 'Completed & Distributed'
    EXPIRED = 'EXPIRED', 'Expired'
    CANCELLED = 'CANCELLED', 'Cancelled'


class ReservationStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Pickup'
    CONFIRMED = 'CONFIRMED', 'Confirmed & Reserved'
    CANCELLED = 'CANCELLED', 'Cancelled'
    COMPLETED = 'COMPLETED', 'Completed'


ClaimStatus = ReservationStatus


class PickupStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Volunteer Claim'
    ASSIGNED = 'ASSIGNED', 'Volunteer Assigned'
    PICKED_UP = 'PICKED_UP', 'Picked Up from Donor'
    DELIVERED = 'DELIVERED', 'Delivered to Recipient'
    CANCELLED = 'CANCELLED', 'Cancelled'


class DeliveryEventType(models.TextChoices):
    VOLUNTEER_ASSIGNED = 'VOLUNTEER_ASSIGNED', 'Volunteer Assigned'
    EN_ROUTE_TO_DONOR = 'EN_ROUTE_TO_DONOR', 'En Route to Donor'
    FOOD_COLLECTED = 'FOOD_COLLECTED', 'Food Collected from Donor'
    EN_ROUTE_TO_RECIPIENT = 'EN_ROUTE_TO_RECIPIENT', 'En Route to Recipient'
    DELIVERED = 'DELIVERED', 'Delivered to Recipient'
    DELIVERY_FAILED = 'DELIVERY_FAILED', 'Delivery Failed / Exception'


class NotificationType(models.TextChoices):
    NEW_MATCH = 'NEW_MATCH', 'New Food Match'
    CLAIM_CONFIRMED = 'CLAIM_CONFIRMED', 'Claim Confirmed'
    EXPIRING_SOON = 'EXPIRING_SOON', 'Pickup Window Expiring'
    PICKUP_ASSIGNED = 'PICKUP_ASSIGNED', 'Volunteer Assigned'
    FOOD_COLLECTED = 'FOOD_COLLECTED', 'Food Collected'
    DELIVERY_COMPLETED = 'DELIVERY_COMPLETED', 'Delivery Completed'
    CANCELLED = 'CANCELLED', 'Reservation Cancelled'
    SYSTEM = 'SYSTEM', 'System Alert'


# ------------------------------------------------------------------------------
# 1. Organization Entity
# ------------------------------------------------------------------------------
class Organization(models.Model):
    name = models.CharField(max_length=255)
    organization_type = models.CharField(
        max_length=20,
        choices=OrgType.choices,
        default=OrgType.RECIPIENT
    )
    registration_id = models.CharField(max_length=100, blank=True, help_text="Official NGO or Business Registration/Tax ID")
    fssai_license = models.CharField(max_length=100, blank=True, help_text="FSSAI or Municipal Food Safety License")
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100, default='Bengaluru')
    postal_code = models.CharField(max_length=20, blank=True)
    latitude = models.FloatField(default=12.9716)
    longitude = models.FloatField(default=77.5946)
    capacity = models.PositiveIntegerField(
        default=100,
        help_text="Max packet handling/distribution capacity per day"
    )
    has_cold_storage = models.BooleanField(
        default=False,
        help_text="Whether recipient facility has refrigeration/freezer units for cold food"
    )
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=30)
    website_url = models.URLField(blank=True)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING
    )
    proof_document = models.TextField(blank=True, help_text="Certificate / Document reference or note")
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        'User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='verified_orgs'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organizations'
        indexes = [
            models.Index(fields=['verification_status']),
            models.Index(fields=['latitude', 'longitude']),
        ]

    def __str__(self):
        return f"{self.name} ({self.organization_type} - {self.verification_status})"


# ------------------------------------------------------------------------------
# 2. User Entity (Extends AbstractUser)
# ------------------------------------------------------------------------------
class User(AbstractUser):
    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.RECIPIENT
    )
    phone_number = models.CharField(max_length=30, blank=True)
    is_verified = models.BooleanField(default=False)
    organization = models.ForeignKey(
        Organization,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='members'
    )
    is_suspended = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    REQUIRED_FIELDS = ['email']

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.username} [{self.role}]"


# ------------------------------------------------------------------------------
# 3. FoodCategory Entity
# ------------------------------------------------------------------------------
class FoodCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    requires_refrigeration = models.BooleanField(default=False)
    shelf_life_guidance = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'food_categories'

    def __str__(self):
        return self.name


# ------------------------------------------------------------------------------
# 4. FoodListing Entity
# ------------------------------------------------------------------------------
class FoodListing(models.Model):
    donor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='food_listings'
    )
    organization = models.ForeignKey(
        Organization,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='food_listings'
    )
    category = models.ForeignKey(
        FoodCategory,
        on_delete=models.PROTECT,
        related_name='listings'
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    quantity = models.PositiveIntegerField(help_text="Current available quantity")
    initial_quantity = models.PositiveIntegerField(help_text="Initial quantity when posted")
    unit_of_measure = models.CharField(max_length=50, default='packets')
    prepared_at = models.DateTimeField()
    best_before_datetime = models.DateTimeField(null=True, blank=True)
    pickup_deadline = models.DateTimeField()
    storage_condition = models.CharField(
        max_length=100,
        default='Room Temperature (Ambient)',
        help_text="e.g. Hot / Heated (>60°C), Refrigerated (<5°C), Room Temp"
    )
    allergens_present = models.JSONField(default=list, blank=True)
    handling_instructions = models.TextField(blank=True)
    is_perishable = models.BooleanField(default=True)
    pickup_address = models.CharField(max_length=255)
    latitude = models.FloatField(default=12.9716)
    longitude = models.FloatField(default=77.5946)
    status = models.CharField(
        max_length=25,
        choices=ListingStatus.choices,
        default=ListingStatus.AVAILABLE
    )
    food_safety_declaration = models.TextField(
        blank=True,
        default="I declare that this surplus food was prepared under hygienic conditions, held at proper temperature, unadulterated, and safe for consumption."
    )
    temperature_at_dispatch = models.CharField(max_length=50, blank=True, default="Ambient (20-25°C)")
    packaging_type = models.CharField(max_length=100, blank=True, default="Food-grade thermal containers")
    safety_reviewed = models.BooleanField(default=True)
    safety_review_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'food_listings'
        indexes = [
            models.Index(fields=['status', 'pickup_deadline']),
            models.Index(fields=['latitude', 'longitude']),
        ]

    @property
    def is_expired(self):
        return timezone.now() > self.pickup_deadline

    def __str__(self):
        return f"{self.title} ({self.quantity}/{self.initial_quantity} {self.unit_of_measure}) - {self.status}"


# ------------------------------------------------------------------------------
# 5. Reservation / Claim Entity
# ------------------------------------------------------------------------------
class Reservation(models.Model):
    food_listing = models.ForeignKey(
        FoodListing,
        on_delete=models.PROTECT,
        related_name='reservations'
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reservations'
    )
    organization = models.ForeignKey(
        Organization,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reservations'
    )
    quantity_reserved = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20,
        choices=ReservationStatus.choices,
        default=ReservationStatus.CONFIRMED
    )
    reserved_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    cancellation_reason = models.TextField(blank=True)

    class Meta:
        db_table = 'claims'
        indexes = [
            models.Index(fields=['status', 'reserved_at']),
            models.Index(fields=['food_listing', 'recipient']),
        ]

    def __str__(self):
        return f"Claim/Reservation #{self.id}: {self.quantity_reserved} pkts by {self.recipient.username} ({self.status})"


# Domain alias
Claim = Reservation


# ------------------------------------------------------------------------------
# 6. Pickup Entity
# ------------------------------------------------------------------------------
class Pickup(models.Model):
    reservation = models.OneToOneField(
        Reservation,
        on_delete=models.CASCADE,
        related_name='pickup'
    )
    volunteer = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_pickups'
    )
    scheduled_pickup_start = models.DateTimeField(null=True, blank=True)
    scheduled_pickup_end = models.DateTimeField(null=True, blank=True)
    actual_pickup_time = models.DateTimeField(null=True, blank=True)
    actual_delivery_time = models.DateTimeField(null=True, blank=True)
    pickup_instructions = models.TextField(blank=True)
    pickup_contact_name = models.CharField(max_length=100, blank=True)
    pickup_contact_phone = models.CharField(max_length=30, blank=True)
    donor_otp = models.CharField(max_length=6, default=generate_otp)
    recipient_otp = models.CharField(max_length=6, default=generate_otp)
    qr_code_token = models.CharField(max_length=64, default=generate_qr_token, unique=True)
    status = models.CharField(
        max_length=20,
        choices=PickupStatus.choices,
        default=PickupStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pickups'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['qr_code_token']),
        ]

    def __str__(self):
        return f"Pickup for Reservation #{self.reservation_id} [{self.status}]"


# ------------------------------------------------------------------------------
# 7. DeliveryEvent Entity
# ------------------------------------------------------------------------------
class DeliveryEvent(models.Model):
    pickup = models.ForeignKey(
        Pickup,
        on_delete=models.CASCADE,
        related_name='events'
    )
    actor = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='delivery_events'
    )
    event_type = models.CharField(
        max_length=30,
        choices=DeliveryEventType.choices
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    proof_of_delivery = models.TextField(blank=True)

    class Meta:
        db_table = 'delivery_events'
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.event_type} at {self.timestamp}"


# ------------------------------------------------------------------------------
# 8. VerificationRecord Entity
# ------------------------------------------------------------------------------
class VerificationRecord(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='verification_records'
    )
    submitted_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='submitted_verifications'
    )
    documents_url = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING
    )
    review_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='conducted_verifications'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'verification_records'

    def __str__(self):
        return f"Verification for {self.organization.name}: {self.status}"


# ------------------------------------------------------------------------------
# 9. Feedback & Food Safety Incident Reporting Entity
# ------------------------------------------------------------------------------
class Feedback(models.Model):
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='feedbacks_written'
    )
    target_organization = models.ForeignKey(
        Organization,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='feedbacks'
    )
    reservation = models.ForeignKey(
        Reservation,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='feedbacks'
    )
    rating = models.PositiveSmallIntegerField(default=5)  # 1 to 5
    comments = models.TextField()
    report_safety_issue = models.BooleanField(default=False)
    safety_issue_details = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    resolution_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='resolved_feedbacks'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'feedback'

    def __str__(self):
        return f"Feedback by {self.author.username} (Rating: {self.rating}/5)"


# ------------------------------------------------------------------------------
# 10. Notification Entity (In-app alerts & event hooks)
# ------------------------------------------------------------------------------
class Notification(models.Model):
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    related_listing = models.ForeignKey(
        FoodListing,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='notifications'
    )
    related_reservation = models.ForeignKey(
        Reservation,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='notifications'
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} -> {self.recipient.username}"


# ------------------------------------------------------------------------------
# 11. SimulationRun Entity (Multi-agent simulation & benchmarking history)
# ------------------------------------------------------------------------------
class SimulationRun(models.Model):
    run_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    num_donors = models.PositiveIntegerField(default=5)
    num_recipients = models.PositiveIntegerField(default=10)
    num_listings = models.PositiveIntegerField(default=15)
    successful_matches = models.PositiveIntegerField(default=0)
    match_rate_pct = models.FloatField(default=0.0)
    avg_time_to_claim_seconds = models.FloatField(default=0.0)
    cancelled_pickups = models.PositiveIntegerField(default=0)
    completed_pickups = models.PositiveIntegerField(default=0)
    total_quantity_distributed = models.PositiveIntegerField(default=0)
    co2_saved_kg = models.FloatField(default=0.0)
    execution_duration_ms = models.FloatField(default=0.0)
    summary_notes = models.TextField(blank=True)

    class Meta:
        db_table = 'simulation_runs'
        ordering = ['-created_at']

    def __str__(self):
        return f"Simulation #{self.run_id} ({self.match_rate_pct}% Match Rate)"
