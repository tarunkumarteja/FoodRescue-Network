from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import (
    Organization, FoodCategory, FoodListing, Reservation,
    Pickup, DeliveryEvent, VerificationRecord, Feedback,
    UserRole, OrgType, VerificationStatus, ReservationStatus
)

User = get_user_model()


class OrganizationSerializer(serializers.ModelSerializer):
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'organization_type', 'registration_id',
            'address', 'city', 'postal_code', 'latitude', 'longitude',
            'capacity', 'contact_email', 'contact_phone', 'website_url',
            'verification_status', 'proof_document', 'verified_at',
            'verified_by', 'verified_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['verification_status', 'verified_at', 'verified_by']


class UserProfileSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone_number', 'is_verified', 'is_suspended',
            'organization', 'created_at'
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    organization_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    organization_type = serializers.ChoiceField(choices=OrgType.choices, required=False, write_only=True)
    organization_address = serializers.CharField(required=False, allow_blank=True, write_only=True)
    organization_capacity = serializers.IntegerField(required=False, default=100, write_only=True)
    registration_id = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name',
            'role', 'phone_number',
            'organization_name', 'organization_type', 'organization_address',
            'organization_capacity', 'registration_id'
        ]

    def create(self, validated_data):
        org_name = validated_data.pop('organization_name', None)
        org_type = validated_data.pop('organization_type', None)
        org_address = validated_data.pop('organization_address', '')
        org_capacity = validated_data.pop('organization_capacity', 100)
        reg_id = validated_data.pop('registration_id', '')

        role = validated_data.get('role', UserRole.RECIPIENT)
        password = validated_data.pop('password')

        # Create user
        user = User.objects.create_user(password=password, **validated_data)

        # If donor or recipient with org info provided, create Organization
        if org_name and role in [UserRole.DONOR, UserRole.RECIPIENT]:
            org_type_val = OrgType.DONOR if role == UserRole.DONOR else OrgType.RECIPIENT
            org = Organization.objects.create(
                name=org_name,
                organization_type=org_type or org_type_val,
                registration_id=reg_id,
                address=org_address or 'Bengaluru Central',
                contact_email=user.email,
                contact_phone=user.phone_number or '9876543210',
                capacity=org_capacity,
                verification_status=VerificationStatus.PENDING,
                proof_document=f"Registration document for {org_name}"
            )
            user.organization = org
            user.save(update_fields=['organization'])

            # Log verification record
            VerificationRecord.objects.create(
                organization=org,
                submitted_by=user,
                documents_url="Uploaded official registration certificate",
                status=VerificationStatus.PENDING
            )

        return user


class FoodCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodCategory
        fields = '__all__'


class FoodListingSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    donor_name = serializers.SerializerMethodField()
    donor_phone = serializers.CharField(source='donor.phone_number', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    hours_left = serializers.SerializerMethodField()

    class Meta:
        model = FoodListing
        fields = [
            'id', 'donor', 'donor_name', 'donor_phone', 'organization',
            'organization_name', 'category', 'category_name',
            'title', 'description', 'quantity', 'initial_quantity',
            'unit_of_measure', 'prepared_at', 'best_before_datetime', 'pickup_deadline',
            'storage_condition', 'allergens_present', 'handling_instructions',
            'is_perishable', 'pickup_address', 'latitude', 'longitude',
            'status', 'is_expired', 'hours_left', 'created_at', 'updated_at'
        ]
        read_only_fields = ['donor', 'initial_quantity', 'status']

    def get_donor_name(self, obj):
        if obj.organization:
            return obj.organization.name
        return obj.donor.get_full_name() or obj.donor.username

    def get_hours_left(self, obj):
        delta = obj.pickup_deadline - timezone.now()
        hours = delta.total_seconds() / 3600.0
        return round(max(0.0, hours), 1)

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['donor'] = user
        if user.organization:
            validated_data['organization'] = user.organization
        validated_data['initial_quantity'] = validated_data['quantity']
        return super().create(validated_data)


class DeliveryEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.get_full_name', read_only=True)

    class Meta:
        model = DeliveryEvent
        fields = ['id', 'pickup', 'actor', 'actor_name', 'event_type', 'timestamp', 'notes', 'proof_of_delivery']
        read_only_fields = ['timestamp']


class PickupSerializer(serializers.ModelSerializer):
    volunteer_name = serializers.SerializerMethodField()
    volunteer_phone = serializers.CharField(source='volunteer.phone_number', read_only=True)
    events = DeliveryEventSerializer(many=True, read_only=True)
    listing_title = serializers.CharField(source='reservation.food_listing.title', read_only=True)
    listing_quantity = serializers.IntegerField(source='reservation.quantity_reserved', read_only=True)
    unit_of_measure = serializers.CharField(source='reservation.food_listing.unit_of_measure', read_only=True)
    pickup_address = serializers.CharField(source='reservation.food_listing.pickup_address', read_only=True)
    donor_name = serializers.CharField(source='reservation.food_listing.organization.name', read_only=True)
    donor_phone = serializers.CharField(source='reservation.food_listing.donor.phone_number', read_only=True)
    recipient_name = serializers.CharField(source='reservation.organization.name', read_only=True)
    recipient_address = serializers.CharField(source='reservation.organization.address', read_only=True)
    recipient_phone = serializers.CharField(source='reservation.organization.contact_phone', read_only=True)
    pickup_deadline = serializers.DateTimeField(source='reservation.food_listing.pickup_deadline', read_only=True)

    class Meta:
        model = Pickup
        fields = [
            'id', 'reservation', 'volunteer', 'volunteer_name', 'volunteer_phone',
            'scheduled_pickup_start', 'scheduled_pickup_end',
            'actual_pickup_time', 'actual_delivery_time',
            'pickup_instructions', 'pickup_contact_name', 'pickup_contact_phone',
            'donor_otp', 'recipient_otp', 'qr_code_token',
            'status', 'events', 'listing_title', 'listing_quantity',
            'unit_of_measure', 'pickup_address', 'donor_name', 'donor_phone',
            'recipient_name', 'recipient_address', 'recipient_phone',
            'pickup_deadline', 'created_at', 'updated_at'
        ]
        read_only_fields = ['donor_otp', 'recipient_otp', 'qr_code_token', 'actual_pickup_time', 'actual_delivery_time']

    def get_volunteer_name(self, obj):
        if obj.volunteer:
            return obj.volunteer.get_full_name() or obj.volunteer.username
        return "Unassigned"


class ReservationSerializer(serializers.ModelSerializer):
    pickup = PickupSerializer(read_only=True)
    food_listing_detail = FoodListingSerializer(source='food_listing', read_only=True)
    recipient_name = serializers.SerializerMethodField()
    recipient_org_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id', 'food_listing', 'food_listing_detail',
            'recipient', 'recipient_name', 'organization', 'recipient_org_name',
            'quantity_reserved', 'status', 'reserved_at', 'expires_at',
            'cancellation_reason', 'pickup'
        ]
        read_only_fields = ['recipient', 'organization', 'status', 'reserved_at']

    def get_recipient_name(self, obj):
        return obj.recipient.get_full_name() or obj.recipient.username


class VerificationRecordSerializer(serializers.ModelSerializer):
    org_name = serializers.CharField(source='organization.name', read_only=True)
    org_type = serializers.CharField(source='organization.organization_type', read_only=True)
    submitted_by_name = serializers.CharField(source='submitted_by.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)

    class Meta:
        model = VerificationRecord
        fields = [
            'id', 'organization', 'org_name', 'org_type',
            'submitted_by', 'submitted_by_name',
            'documents_url', 'status', 'review_notes',
            'reviewed_by', 'reviewed_by_name', 'created_at', 'updated_at'
        ]


class FeedbackSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    target_org_name = serializers.CharField(source='target_organization.name', read_only=True)

    class Meta:
        model = Feedback
        fields = [
            'id', 'author', 'author_name', 'target_organization', 'target_org_name',
            'reservation', 'rating', 'comments', 'report_safety_issue',
            'safety_issue_details', 'is_resolved', 'created_at'
        ]
        read_only_fields = ['author', 'is_resolved']
