import random
import string
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


def generate_otp():
    """Generates a secure 6-digit numeric OTP for handover confirmation."""
    return ''.join(random.choices(string.digits, k=6))


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
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100, default='Bengaluru')
    postal_code = models.CharField(max_length=20, blank=True)
    latitude = models.FloatField(default=12.9716)
    longitude = models.FloatField(default=77.5946)
    capacity = models.PositiveIntegerField(
        default=100,
        help_text="Max packet handling/distribution capacity per day"
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_expired(self):
        return timezone.now() > self.pickup_deadline

    def __str__(self):
        return f"{self.title} ({self.quantity}/{self.initial_quantity} {self.unit_of_measure}) - {self.status}"


# ------------------------------------------------------------------------------
# 5. Reservation Entity
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

    def __str__(self):
        return f"Reservation #{self.id}: {self.quantity_reserved} pkts by {self.recipient.username} ({self.status})"


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

    def __str__(self):
        return f"Verification for {self.organization.name}: {self.status}"


# ------------------------------------------------------------------------------
# 9. Feedback Entity
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
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback by {self.author.username} (Rating: {self.rating}/5)"
