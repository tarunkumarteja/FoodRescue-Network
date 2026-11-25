import random
from datetime import timedelta
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework import generics, status, views, viewsets, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    User, Organization, FoodCategory, FoodListing, Reservation,
    Pickup, DeliveryEvent, VerificationRecord, Feedback, Notification,
    SimulationRun, UserRole, OrgType, VerificationStatus, ListingStatus,
    ReservationStatus, PickupStatus, DeliveryEventType, NotificationType
)
from .serializers import (
    RegisterSerializer, UserProfileSerializer, OrganizationSerializer,
    FoodCategorySerializer, FoodListingSerializer, ReservationSerializer,
    PickupSerializer, DeliveryEventSerializer, VerificationRecordSerializer,
    FeedbackSerializer, NotificationSerializer, SimulationRunSerializer
)
from .matching import (
    get_ranked_recipients_for_listing,
    get_recommended_listings_for_recipient,
    calculate_demand_forecast
)
from .safety import (
    validate_donor_safety_compliance,
    validate_recipient_claim_eligibility,
    FoodSafetyValidationError
)
from .notifications import (
    create_notification,
    notify_new_matches,
    notify_claim_confirmed,
    notify_cancellation
)
from .simulation import run_network_simulation


# ------------------------------------------------------------------------------
# 1. Custom Auth & Token Views
# ------------------------------------------------------------------------------
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if user.is_suspended:
            raise serializers.ValidationError("This account has been suspended by an administrator.")
        data['user'] = UserProfileSerializer(user).data
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'message': 'User registered successfully',
            'user': UserProfileSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserAdminViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().select_related('organization').order_by('-date_joined')
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == UserRole.ADMIN and self.request.user.is_staff:
            return super().get_queryset()
        return super().get_queryset().filter(pk=self.request.user.pk)

    @action(detail=True, methods=['post'])
    def toggle_suspend(self, request, pk=None):
        if request.user.role != UserRole.ADMIN:
            return Response({'error': 'Only platform administrators can suspend or unsuspend users.'}, status=status.HTTP_403_FORBIDDEN)

        target_user = self.get_object()
        target_user.is_suspended = not target_user.is_suspended
        target_user.save()

        state = "suspended" if target_user.is_suspended else "reinstated"
        create_notification(
            recipient=target_user,
            notification_type=NotificationType.SYSTEM,
            title=f"Account Status Update: {state.capitalize()}",
            message=f"Your account has been {state} by a platform administrator."
        )

        return Response({
            'message': f"User {target_user.username} has been {state}.",
            'is_suspended': target_user.is_suspended
        })


# ------------------------------------------------------------------------------
# 2. Organization Views
# ------------------------------------------------------------------------------
class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all().order_by('-created_at')
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        org_type = self.request.query_params.get('type')
        status_param = self.request.query_params.get('status')
        if org_type:
            qs = qs.filter(organization_type=org_type)
        if status_param:
            qs = qs.filter(verification_status=status_param)
        return qs

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def verify(self, request, pk=None):
        """Admin action to approve or reject an organization's verification."""
        org = self.get_object()
        action_decision = request.data.get('decision', 'VERIFIED')
        notes = request.data.get('notes', 'Reviewed and audited by platform admin.')

        if action_decision not in [VerificationStatus.VERIFIED, VerificationStatus.REJECTED]:
            return Response({'error': 'Invalid decision. Must be VERIFIED or REJECTED'}, status=status.HTTP_400_BAD_REQUEST)

        org.verification_status = action_decision
        org.verified_at = timezone.now()
        org.verified_by = request.user
        org.save()

        # Update member status
        for member in org.members.all():
            member.is_verified = (action_decision == VerificationStatus.VERIFIED)
            member.save(update_fields=['is_verified'])

            create_notification(
                recipient=member,
                notification_type=NotificationType.SYSTEM,
                title=f"Verification Decision: {action_decision}",
                message=f"Organization verification for '{org.name}' was marked as {action_decision}. Notes: {notes}"
            )

        # Record in VerificationRecord
        VerificationRecord.objects.create(
            organization=org,
            submitted_by=org.members.first(),
            documents_url=org.proof_document or 'Verified via Admin Panel',
            status=action_decision,
            review_notes=notes,
            reviewed_by=request.user
        )

        return Response({
            'message': f'Organization marked as {action_decision}',
            'organization': OrganizationSerializer(org).data
        })


class VerificationRecordListView(generics.ListAPIView):
    queryset = VerificationRecord.objects.all().select_related('organization', 'submitted_by', 'reviewed_by').order_by('-created_at')
    serializer_class = VerificationRecordSerializer
    permission_classes = [IsAuthenticated]


# ------------------------------------------------------------------------------
# 3. Food Category Views
# ------------------------------------------------------------------------------
class FoodCategoryListView(generics.ListCreateAPIView):
    queryset = FoodCategory.objects.all().order_by('name')
    serializer_class = FoodCategorySerializer
    permission_classes = [AllowAny]


# ------------------------------------------------------------------------------
# 4. Food Listing (Donation) Views
# ------------------------------------------------------------------------------
class FoodListingViewSet(viewsets.ModelViewSet):
    serializer_class = FoodListingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        now = timezone.now()
        qs = FoodListing.objects.all().select_related('donor', 'organization', 'category').order_by('-created_at')

        # Listings can be browsed by authenticated users, but only their donor may edit them.
        is_admin_review = self.action == 'review_safety' and self.request.user.role == UserRole.ADMIN and self.request.user.is_staff
        if self.request.method not in ('GET', 'HEAD', 'OPTIONS') and not is_admin_review:
            if self.request.user.role != UserRole.DONOR:
                return qs.none()
            qs = qs.filter(donor=self.request.user)

        # Auto-mark expired
        FoodListing.objects.filter(
            status__in=[ListingStatus.AVAILABLE, ListingStatus.PARTIALLY_RESERVED],
            pickup_deadline__lte=now
        ).update(status=ListingStatus.EXPIRED)

        donor_only = self.request.query_params.get('my_listings')
        if donor_only:
            qs = qs.filter(donor=self.request.user)

        category_id = self.request.query_params.get('category')
        if category_id:
            qs = qs.filter(category_id=category_id)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        # Food Safety & Policy Validation
        try:
            validate_donor_safety_compliance(user, serializer.validated_data)
        except FoodSafetyValidationError as e:
            raise serializers.ValidationError({'safety_error': e.message, 'code': e.code})

        listing = serializer.save()

        # Proactively find top matches and dispatch notifications
        try:
            matches = get_ranked_recipients_for_listing(listing)
            if matches:
                notify_new_matches(listing, matches[:3])
        except Exception:
            pass

    @action(detail=True, methods=['get'])
    def matches(self, request, pk=None):
        """
        Runs the 4-factor Matching Algorithm:
        Score = 0.4*D + 0.3*Q + 0.2*T + 0.1*C
        Ranks top verified recipient organizations.
        """
        listing = self.get_object()
        ranked = get_ranked_recipients_for_listing(listing)
        return Response({
            'listing_id': listing.id,
            'listing_title': listing.title,
            'quantity': listing.quantity,
            'formula': 'Score = 0.4*D + 0.3*Q + 0.2*T + 0.1*C',
            'top_recipient_matches': ranked
        })

    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """
        Ranks surplus food listings for the authenticated recipient user.
        """
        user = request.user
        org = user.organization
        if not org or org.organization_type != OrgType.RECIPIENT:
            first_org = Organization.objects.filter(
                organization_type=OrgType.RECIPIENT,
                verification_status=VerificationStatus.VERIFIED
            ).first()
            if first_org:
                org = first_org
            else:
                return Response({'recipient_organization': 'None', 'recommendations': []})

        recs = get_recommended_listings_for_recipient(org)
        return Response({
            'recipient_organization': org.name,
            'recommendations': recs
        })

    @action(detail=True, methods=['post'])
    def review_safety(self, request, pk=None):
        """Admin reviews food-safety declarations."""
        if request.user.role != UserRole.ADMIN:
            return Response({'error': 'Only platform administrators can review food-safety declarations.'}, status=status.HTTP_403_FORBIDDEN)

        listing = self.get_object()
        is_approved = request.data.get('approved', True)
        notes = request.data.get('notes', 'Food safety declaration certified.')

        listing.safety_reviewed = is_approved
        listing.safety_review_notes = notes
        listing.save(update_fields=['safety_reviewed', 'safety_review_notes'])

        return Response({
            'message': 'Food safety declaration review recorded.',
            'safety_reviewed': listing.safety_reviewed,
            'safety_review_notes': listing.safety_review_notes
        })


# ------------------------------------------------------------------------------
# 5. Reservations & Atomic Claim Workflow
# ------------------------------------------------------------------------------
class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Reservation.objects.all().select_related(
            'food_listing', 'recipient', 'organization', 'pickup'
        ).order_by('-reserved_at')

        if user.role == UserRole.RECIPIENT:
            qs = qs.filter(recipient=user)
        elif user.role == UserRole.DONOR:
            qs = qs.filter(food_listing__donor=user)
        elif user.role != UserRole.ADMIN or not user.is_staff:
            qs = qs.none()

        return qs

    def create(self, request, *args, **kwargs):
        """
        Atomic Reservation / Claim Workflow:
        Uses database transactions and row-level locking (select_for_update)
        to prevent race conditions & double-allocation under concurrent load.
        """
        listing_id = request.data.get('food_listing')
        try:
            quantity_to_reserve = int(request.data.get('quantity_reserved', 0))
        except (ValueError, TypeError):
            return Response({'error': 'Invalid quantity.'}, status=status.HTTP_400_BAD_REQUEST)

        if quantity_to_reserve <= 0:
            return Response({'error': 'Quantity to reserve must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

        recipient_user = request.user

        try:
            with transaction.atomic():
                # Acquire exclusive row lock on the listing in PostgreSQL / DB
                listing = FoodListing.objects.select_for_update().get(id=listing_id)

                # Validate recipient eligibility and safety rules
                try:
                    validate_recipient_claim_eligibility(recipient_user, listing, quantity_to_reserve)
                except FoodSafetyValidationError as ve:
                    return Response({'error': ve.message, 'code': ve.code}, status=status.HTTP_400_BAD_REQUEST)

                # Deduct inventory atomically
                listing.quantity -= quantity_to_reserve
                if listing.quantity == 0:
                    listing.status = ListingStatus.RESERVED
                else:
                    listing.status = ListingStatus.PARTIALLY_RESERVED
                listing.save()

                # Calculate expiration
                now = timezone.now()
                expires_at = min(listing.pickup_deadline, now + timedelta(hours=3))

                # Create Reservation / Claim
                reservation = Reservation.objects.create(
                    food_listing=listing,
                    recipient=recipient_user,
                    organization=recipient_user.organization,
                    quantity_reserved=quantity_to_reserve,
                    status=ReservationStatus.CONFIRMED,
                    expires_at=expires_at
                )

                # Automatically instantiate linked Pickup logistics record
                pickup = Pickup.objects.create(
                    reservation=reservation,
                    scheduled_pickup_start=now,
                    scheduled_pickup_end=listing.pickup_deadline,
                    pickup_instructions=f"Contact donor {listing.donor.phone_number or ''}. Handle with care: {listing.storage_condition}."
                )

                # Log initial delivery event
                DeliveryEvent.objects.create(
                    pickup=pickup,
                    actor=recipient_user,
                    event_type=DeliveryEventType.VOLUNTEER_ASSIGNED,
                    notes=f"Claim reserved for {quantity_to_reserve} {listing.unit_of_measure}. Logistics dispatched."
                )

                # Notify donor and recipient
                notify_claim_confirmed(reservation)

                serializer = ReservationSerializer(reservation)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except FoodListing.DoesNotExist:
            return Response({'error': 'Food listing not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an existing claim/reservation and restore inventory atomically."""
        reservation = self.get_object()
        reason = request.data.get('reason', 'Cancelled by user.')

        if reservation.status in [ReservationStatus.COMPLETED, ReservationStatus.CANCELLED]:
            return Response({'error': 'This reservation cannot be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            listing = FoodListing.objects.select_for_update().get(id=reservation.food_listing_id)
            listing.quantity += reservation.quantity_reserved
            if listing.status == ListingStatus.RESERVED:
                listing.status = ListingStatus.AVAILABLE if listing.quantity == listing.initial_quantity else ListingStatus.PARTIALLY_RESERVED
            listing.save()

            reservation.status = ReservationStatus.CANCELLED
            reservation.cancellation_reason = reason
            reservation.save()

            if hasattr(reservation, 'pickup'):
                reservation.pickup.status = PickupStatus.CANCELLED
                reservation.pickup.save()

                DeliveryEvent.objects.create(
                    pickup=reservation.pickup,
                    actor=request.user,
                    event_type=DeliveryEventType.DELIVERY_FAILED,
                    notes=f"Pickup cancelled. Reason: {reason}"
                )

            # In-app notifications
            notify_cancellation(reservation, reason)

        return Response({'message': 'Reservation cancelled and inventory restored.'})


# Domain alias
ClaimViewSet = ReservationViewSet


# ------------------------------------------------------------------------------
# 6. Pickups & Delivery Management (Volunteer & Logistics)
# ------------------------------------------------------------------------------
class PickupViewSet(viewsets.ModelViewSet):
    serializer_class = PickupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Pickup.objects.all().select_related(
            'reservation', 'reservation__food_listing', 'reservation__organization', 'volunteer'
        ).prefetch_related('events').order_by('-created_at')

        if user.role == UserRole.VOLUNTEER:
            if self.action == 'claim_task':
                return qs.filter(Q(status=PickupStatus.PENDING, volunteer__isnull=True) | Q(volunteer=user))
            if self.request.query_params.get('available'):
                return qs.filter(status=PickupStatus.PENDING, volunteer__isnull=True)
            return qs.filter(volunteer=user)
        if user.role == UserRole.DONOR:
            return qs.filter(reservation__food_listing__donor=user)
        if user.role == UserRole.RECIPIENT:
            return qs.filter(reservation__recipient=user)
        if user.role != UserRole.ADMIN or not user.is_staff:
            return qs.none()

        return qs

    @action(detail=True, methods=['post'])
    def claim_task(self, request, pk=None):
        """Volunteer accepts the pickup and delivery assignment."""
        if request.user.role != UserRole.VOLUNTEER:
            return Response({'error': 'Only volunteers can claim delivery tasks.'}, status=status.HTTP_403_FORBIDDEN)
        pickup = self.get_object()
        with transaction.atomic():
            pickup = Pickup.objects.select_for_update().get(pk=pickup.pk)
            if pickup.status != PickupStatus.PENDING or (pickup.volunteer and pickup.volunteer != request.user):
                return Response({'error': 'This delivery is already claimed or unavailable.'}, status=status.HTTP_409_CONFLICT)
            pickup.volunteer = request.user
            pickup.status = PickupStatus.ASSIGNED
            pickup.save()

        DeliveryEvent.objects.create(
            pickup=pickup,
            actor=request.user,
            event_type=DeliveryEventType.VOLUNTEER_ASSIGNED,
            notes=f"Volunteer {request.user.get_full_name() or request.user.username} accepted delivery task."
        )

        # Notify donor and recipient
        create_notification(
            recipient=pickup.reservation.food_listing.donor,
            notification_type=NotificationType.PICKUP_ASSIGNED,
            title="Volunteer Assigned for Pickup",
            message=f"Volunteer {request.user.get_full_name() or request.user.username} has been assigned to collect '{pickup.reservation.food_listing.title}'."
        )

        return Response({
            'message': 'Delivery assignment claimed successfully.',
            'pickup': PickupSerializer(pickup).data
        })

    @action(detail=True, methods=['post'])
    def verify_donor_pickup(self, request, pk=None):
        """
        Donor Handover Verification:
        Volunteer inputs the 6-digit OTP provided by the Donor or scans QR code.
        """
        pickup = self.get_object()
        provided_otp = request.data.get('otp', '').strip()
        qr_token = request.data.get('qr_token', '').strip()

        if (provided_otp and provided_otp == pickup.donor_otp) or (qr_token and qr_token == pickup.qr_code_token):
            pickup.status = PickupStatus.PICKED_UP
            pickup.actual_pickup_time = timezone.now()
            pickup.save()

            listing = pickup.reservation.food_listing
            listing.status = ListingStatus.PICKED_UP
            listing.save()

            DeliveryEvent.objects.create(
                pickup=pickup,
                actor=request.user,
                event_type=DeliveryEventType.FOOD_COLLECTED,
                notes="Donor handover confirmed via OTP/QR verification. Food collected and en route."
            )

            # Notify recipient that food is collected and en route
            create_notification(
                recipient=pickup.reservation.recipient,
                notification_type=NotificationType.FOOD_COLLECTED,
                title="Food Collected & En Route",
                message=f"Surplus food from '{listing.title}' has been collected by the volunteer and is en route to your facility."
            )

            return Response({
                'message': 'Donor handover verified successfully! Food is collected.',
                'pickup': PickupSerializer(pickup).data
            })
        else:
            return Response({
                'error': 'Invalid OTP or QR code. Please check with the food donor.'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def verify_recipient_delivery(self, request, pk=None):
        """
        Recipient Delivery Handover Verification:
        Volunteer or Recipient enters the 6-digit Recipient OTP or scans QR code.
        """
        pickup = self.get_object()
        provided_otp = request.data.get('otp', '').strip()
        qr_token = request.data.get('qr_token', '').strip()

        if (provided_otp and provided_otp == pickup.recipient_otp) or (qr_token and qr_token == pickup.qr_code_token):
            pickup.status = PickupStatus.DELIVERED
            pickup.actual_delivery_time = timezone.now()
            pickup.save()

            reservation = pickup.reservation
            reservation.status = ReservationStatus.COMPLETED
            reservation.save()

            listing = reservation.food_listing
            if listing.quantity == 0:
                listing.status = ListingStatus.COMPLETED
                listing.save()

            DeliveryEvent.objects.create(
                pickup=pickup,
                actor=request.user,
                event_type=DeliveryEventType.DELIVERED,
                notes="Recipient handover confirmed via OTP/QR. Food delivery successfully completed."
            )

            # Notify donor of completed delivery
            create_notification(
                recipient=listing.donor,
                notification_type=NotificationType.DELIVERY_COMPLETED,
                title="Delivery Completed!",
                message=f"Your surplus donation of {reservation.quantity_reserved} {listing.unit_of_measure} has been successfully delivered and distributed to {reservation.organization.name if reservation.organization else 'Recipient'}."
            )

            return Response({
                'message': 'Delivery confirmed and verified! Food distributed.',
                'pickup': PickupSerializer(pickup).data
            })
        else:
            return Response({
                'error': 'Invalid Recipient OTP. Please confirm with recipient shelter/NGO.'
            }, status=status.HTTP_400_BAD_REQUEST)


class DeliveryEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DeliveryEvent.objects.all().select_related('pickup', 'actor').order_by('-timestamp')
    serializer_class = DeliveryEventSerializer
    permission_classes = [IsAuthenticated]


# ------------------------------------------------------------------------------
# 7. Notifications ViewSet
# ------------------------------------------------------------------------------
class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save()
        return Response({'message': 'Notification marked as read.'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read.'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'unread_count': count})


# ------------------------------------------------------------------------------
# 8. Feedback & Dispute Resolution
# ------------------------------------------------------------------------------
class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all().select_related('author', 'target_organization', 'resolved_by').order_by('-created_at')
    serializer_class = FeedbackSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Admin resolution of feedback or safety incident report."""
        if request.user.role != UserRole.ADMIN:
            return Response({'error': 'Only platform administrators can resolve disputes.'}, status=status.HTTP_403_FORBIDDEN)

        feedback = self.get_object()
        resolution_notes = request.data.get('notes', 'Reviewed and resolved by platform administrator.')

        feedback.is_resolved = True
        feedback.resolution_notes = resolution_notes
        feedback.resolved_by = request.user
        feedback.resolved_at = timezone.now()
        feedback.save()

        # Notify feedback author
        create_notification(
            recipient=feedback.author,
            notification_type=NotificationType.SYSTEM,
            title="Feedback / Report Resolved",
            message=f"Your feedback regarding '{feedback.target_organization.name if feedback.target_organization else 'Organization'}' has been reviewed and resolved. Notes: {resolution_notes}"
        )

        return Response({
            'message': 'Feedback issue resolved successfully.',
            'feedback': FeedbackSerializer(feedback).data
        })


# ------------------------------------------------------------------------------
# 9. Simulation & Benchmarking Views
# ------------------------------------------------------------------------------
class SimulationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SimulationRun.objects.all().order_by('-created_at')
    serializer_class = SimulationRunSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def run(self, request):
        """Triggers multi-agent simulation & benchmarking."""
        num_donors = int(request.data.get('donors', 5))
        num_recipients = int(request.data.get('recipients', 8))
        num_listings = int(request.data.get('listings', 12))

        result = run_network_simulation(
            num_donors=num_donors,
            num_recipients=num_recipients,
            num_listings=num_listings
        )
        return Response(result, status=status.HTTP_201_CREATED)


# ------------------------------------------------------------------------------
# 10. Analytics & Impact Dashboard Views
# ------------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def analytics_dashboard(request):
    """
    Returns platform-wide impact statistics and real-time operations overview.
    """
    total_listings = FoodListing.objects.count()
    total_packets_prepared = FoodListing.objects.aggregate(s=Sum('initial_quantity'))['s'] or 0
    total_packets_reserved = Reservation.objects.exclude(status=ReservationStatus.CANCELLED).aggregate(s=Sum('quantity_reserved'))['s'] or 0
    total_packets_delivered = Reservation.objects.filter(status=ReservationStatus.COMPLETED).aggregate(s=Sum('quantity_reserved'))['s'] or 0

    donors_count = User.objects.filter(role=UserRole.DONOR).count()
    recipients_count = User.objects.filter(role=UserRole.RECIPIENT).count()
    volunteers_count = User.objects.filter(role=UserRole.VOLUNTEER).count()
    verified_orgs_count = Organization.objects.filter(verification_status=VerificationStatus.VERIFIED).count()

    active_pickups_count = Pickup.objects.filter(
        status__in=[PickupStatus.PENDING, PickupStatus.ASSIGNED, PickupStatus.PICKED_UP]
    ).count()

    co2_saved_kg = round(total_packets_reserved * 1.8, 1)

    categories = FoodCategory.objects.annotate(
        listings_count=Count('listings'),
        total_packets=Sum('listings__initial_quantity')
    ).values('name', 'listings_count', 'total_packets')

    # Latest simulation metrics if available
    latest_sim = SimulationRun.objects.first()
    latest_sim_data = SimulationRunSerializer(latest_sim).data if latest_sim else None

    return Response({
        'impact_summary': {
            'total_listings': total_listings,
            'total_packets_donated': total_packets_prepared,
            'total_packets_rescued': total_packets_reserved,
            'total_packets_delivered': total_packets_delivered,
            'co2_saved_kg': co2_saved_kg,
            'active_deliveries': active_pickups_count,
            'verified_organizations': verified_orgs_count,
            'community_members': {
                'donors': donors_count,
                'recipients': recipients_count,
                'volunteers': volunteers_count
            }
        },
        'categories_distribution': list(categories),
        'latest_simulation': latest_sim_data,
        'timestamp': timezone.now().isoformat()
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def demand_forecast_view(request):
    """
    Returns predictive demand forecasting based on historical donation & reservation patterns.
    """
    data = calculate_demand_forecast()
    return Response(data)


# ------------------------------------------------------------------------------
# 11. Seed Demo Data Endpoint
# ------------------------------------------------------------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def seed_demo_data(request):
    """
    Seeds comprehensive realistic demonstration data representing:
    - 4 user roles with test credentials
    - Verified NGOs and Restaurants
    - Food categories
    - The Slide 12 Demo: 50 packets listed -> 30 packets reserved -> 20 packets remaining -> 1 delivery completed
    - Live Map coordinates in Bengaluru
    """
    if request.user.role != UserRole.ADMIN or not request.user.is_staff:
        return Response({'error': 'Only platform administrators can seed demo data.'}, status=status.HTTP_403_FORBIDDEN)

    now = timezone.now()

    # 1. Categories
    cat_cooked, _ = FoodCategory.objects.get_or_create(
        name="Cooked Meals & Curries",
        defaults={
            "description": "Hot prepared meals, rice dishes, curries, and rotis from restaurants and caterers.",
            "requires_refrigeration": False,
            "shelf_life_guidance": "Consume within 4 hours of preparation."
        }
    )
    cat_bakery, _ = FoodCategory.objects.get_or_create(
        name="Bakery & Bread",
        defaults={
            "description": "Artisan breads, baguettes, croissants, and buns.",
            "requires_refrigeration": False,
            "shelf_life_guidance": "Best consumed within 24 to 48 hours."
        }
    )
    cat_produce, _ = FoodCategory.objects.get_or_create(
        name="Fresh Produce & Fruits",
        defaults={
            "description": "Surplus fruits, vegetables, and greens from supermarkets and markets.",
            "requires_refrigeration": True,
            "shelf_life_guidance": "Best consumed within 3 to 5 days."
        }
    )

    # 2. Organizations
    org_donor, _ = Organization.objects.update_or_create(
        name="Royal Spice Restaurant & Banquets",
        defaults={
            "organization_type": OrgType.DONOR,
            "registration_id": "GSTIN-29AAACR1234F1Z5",
            "fssai_license": "FSSAI-11223344000123",
            "address": "12 Residency Road, Shanthala Nagar, Bengaluru",
            "city": "Bengaluru",
            "postal_code": "560025",
            "latitude": 12.9716,
            "longitude": 77.6006,
            "capacity": 300,
            "contact_email": "donor@royalspice.com",
            "contact_phone": "+91 98450 11223",
            "verification_status": VerificationStatus.VERIFIED,
            "proof_document": "FSSAI License #11223344000123"
        }
    )

    org_ngo1, _ = Organization.objects.update_or_create(
        name="Asha Jyothi Children Home & Shelter",
        defaults={
            "organization_type": OrgType.RECIPIENT,
            "registration_id": "NGO-KA-2018-00912",
            "address": "45 Richmond Town, Near Hosur Road, Bengaluru",
            "city": "Bengaluru",
            "postal_code": "560027",
            "latitude": 12.9634,
            "longitude": 77.6012,
            "capacity": 120,
            "has_cold_storage": True,
            "contact_email": "ashajyothi@childrenhome.org",
            "contact_phone": "+91 94480 33445",
            "verification_status": VerificationStatus.VERIFIED,
            "proof_document": "Section 80G Certified & Darpan ID KA/2018/00912"
        }
    )

    org_ngo2, _ = Organization.objects.update_or_create(
        name="Karuna Community Kitchen & Care",
        defaults={
            "organization_type": OrgType.RECIPIENT,
            "registration_id": "NGO-KA-2020-00456",
            "address": "88 Indiranagar 100ft Road, Bengaluru",
            "city": "Bengaluru",
            "postal_code": "560038",
            "latitude": 12.9784,
            "longitude": 77.6408,
            "capacity": 200,
            "has_cold_storage": False,
            "contact_email": "contact@karunakitchen.org",
            "contact_phone": "+91 98800 77665",
            "verification_status": VerificationStatus.VERIFIED,
            "proof_document": "FCRA Registered & Municipal Hygiene Audit Grade A"
        }
    )

    org_pending, _ = Organization.objects.update_or_create(
        name="Hope Horizon Shelter (Pending Review)",
        defaults={
            "organization_type": OrgType.RECIPIENT,
            "registration_id": "APP-2026-9901",
            "address": "14 Koramangala 4th Block, Bengaluru",
            "city": "Bengaluru",
            "postal_code": "560034",
            "latitude": 12.9345,
            "longitude": 77.6256,
            "capacity": 80,
            "has_cold_storage": False,
            "contact_email": "info@hopehorizon.org",
            "contact_phone": "+91 97711 22334",
            "verification_status": VerificationStatus.PENDING,
            "proof_document": "Trust Deed & Municipal Certificate"
        }
    )

    # 3. Users for the 4 Roles
    def create_or_update_user(username, email, password, role, first_name, last_name, phone, org=None, is_staff=False):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'role': role,
                'first_name': first_name,
                'last_name': last_name,
                'phone_number': phone,
                'organization': org,
                'is_staff': is_staff,
                'is_superuser': is_staff,
                'is_verified': True
            }
        )
        user.set_password(password)
        user.role = role
        user.organization = org
        user.is_staff = is_staff
        user.is_superuser = is_staff
        user.is_verified = True
        user.save()
        return user

    admin_user = create_or_update_user(
        'admin', 'admin@foodrescue.org', 'Admin@123',
        UserRole.ADMIN, 'Priya', 'Sharma', '+91 98000 00001', is_staff=True
    )

    donor_user = create_or_update_user(
        'donor_restaurant', 'manager@royalspice.com', 'Donor@123',
        UserRole.DONOR, 'Rajesh', 'Kumar', '+91 98450 11223', org=org_donor
    )

    recipient_user = create_or_update_user(
        'recipient_ngo', 'coordinator@ashajyothi.org', 'Recipient@123',
        UserRole.RECIPIENT, 'Sister', 'Mary', '+91 94480 33445', org=org_ngo1
    )

    volunteer_user = create_or_update_user(
        'volunteer_rider', 'volunteer@foodrescue.org', 'Volunteer@123',
        UserRole.VOLUNTEER, 'Arun', 'Teja', '+91 99112 33445'
    )

    # 4. Slide 12 Demo Scenario:
    demo_listing, _ = FoodListing.objects.get_or_create(
        title="Royal Buffet Surplus: Vegetable Biryani & Paneer Gravy",
        donor=donor_user,
        defaults={
            "organization": org_donor,
            "category": cat_cooked,
            "description": "Freshly cooked lunch buffet surplus in food-grade thermal containers. Prepared at 13:00, hygienic and delicious.",
            "quantity": 20,              # 20 remaining
            "initial_quantity": 50,      # 50 originally listed
            "unit_of_measure": "packets",
            "prepared_at": now - timedelta(hours=2),
            "best_before_datetime": now + timedelta(hours=4),
            "pickup_deadline": now + timedelta(hours=3),
            "storage_condition": "Hot / Heated (>60°C)",
            "allergens_present": ["Dairy", "Nuts"],
            "handling_instructions": "Keep warm until consumption. Packaged in sanitized sealed aluminium boxes.",
            "is_perishable": True,
            "pickup_address": "12 Residency Road, Shanthala Nagar, Bengaluru",
            "latitude": 12.9716,
            "longitude": 77.6006,
            "status": ListingStatus.PARTIALLY_RESERVED,
            "food_safety_declaration": "Certified hygienic preparation conforming to food safety standards.",
            "safety_reviewed": True
        }
    )

    # Create Reservation for 30 packets
    reservation, _ = Reservation.objects.get_or_create(
        food_listing=demo_listing,
        recipient=recipient_user,
        defaults={
            "organization": org_ngo1,
            "quantity_reserved": 30,
            "status": ReservationStatus.COMPLETED,
            "expires_at": now + timedelta(hours=2)
        }
    )

    # Create linked Pickup and completed delivery
    pickup, _ = Pickup.objects.get_or_create(
        reservation=reservation,
        defaults={
            "volunteer": volunteer_user,
            "scheduled_pickup_start": now - timedelta(hours=1, minutes=30),
            "scheduled_pickup_end": now + timedelta(hours=2),
            "actual_pickup_time": now - timedelta(minutes=45),
            "actual_delivery_time": now - timedelta(minutes=10),
            "pickup_instructions": "Enter via rear service entrance on Residency Rd.",
            "pickup_contact_name": "Rajesh Kumar (Kitchen Lead)",
            "pickup_contact_phone": "+91 98450 11223",
            "donor_otp": "482910",
            "recipient_otp": "619340",
            "status": PickupStatus.DELIVERED
        }
    )

    # Delivery audit events trail
    if not pickup.events.exists():
        DeliveryEvent.objects.create(
            pickup=pickup,
            actor=volunteer_user,
            event_type=DeliveryEventType.VOLUNTEER_ASSIGNED,
            notes="Volunteer Arun Teja accepted delivery task from Royal Spice to Asha Jyothi Home."
        )
        DeliveryEvent.objects.create(
            pickup=pickup,
            actor=volunteer_user,
            event_type=DeliveryEventType.FOOD_COLLECTED,
            notes="Donor handover confirmed with OTP #482910. 30 thermal packets collected."
        )
        DeliveryEvent.objects.create(
            pickup=pickup,
            actor=volunteer_user,
            event_type=DeliveryEventType.DELIVERED,
            notes="Drop-off confirmed at Asha Jyothi Children Home via Recipient OTP #619340."
        )

    # Additional Active Listing ready for testing
    FoodListing.objects.get_or_create(
        title="Artisan Breads & Assorted Morning Pastries",
        donor=donor_user,
        defaults={
            "organization": org_donor,
            "category": cat_bakery,
            "description": "Fresh morning bake: whole wheat sourdough, brioche rolls, and multigrain loaves.",
            "quantity": 40,
            "initial_quantity": 40,
            "unit_of_measure": "packets",
            "prepared_at": now - timedelta(hours=4),
            "best_before_datetime": now + timedelta(hours=8),
            "pickup_deadline": now + timedelta(hours=6),
            "storage_condition": "Room Temperature (Ambient)",
            "allergens_present": ["Gluten"],
            "handling_instructions": "Store in dry place away from direct sunlight.",
            "is_perishable": False,
            "pickup_address": "12 Residency Road, Shanthala Nagar, Bengaluru",
            "latitude": 12.9716,
            "longitude": 77.6006,
            "status": ListingStatus.AVAILABLE,
            "food_safety_declaration": "Baked today with food-grade ingredients and sanitary packing.",
            "safety_reviewed": True
        }
    )

    # Feedback
    Feedback.objects.get_or_create(
        author=recipient_user,
        reservation=reservation,
        defaults={
            "target_organization": org_donor,
            "rating": 5,
            "comments": "Excellent food quality! The biryani was still warm and nourished 30 children at our shelter.",
            "report_safety_issue": False
        }
    )

    # Initial notifications
    create_notification(
        recipient=recipient_user,
        notification_type=NotificationType.DELIVERY_COMPLETED,
        title="Demo Delivery Successful",
        message="30 packets of Royal Buffet Surplus delivered to Asha Jyothi Children Home."
    )
    create_notification(
        recipient=donor_user,
        notification_type=NotificationType.NEW_MATCH,
        title="High Match Rate Found",
        message="Asha Jyothi Children Home matched with 86.0% compatibility for your lunch surplus."
    )

    return Response({
        'message': 'Demo data seeded successfully!',
        'demo_scenario': {
            'listing': 'Royal Buffet Surplus: Vegetable Biryani & Paneer Gravy',
            'initial_packets': 50,
            'reserved_packets': 30,
            'remaining_packets': 20,
            'delivery_status': 'DELIVERED (Handover verified via OTP)',
        },
        'accounts': [
            {'role': 'ADMIN', 'username': 'admin', 'password': 'Admin@123', 'name': 'Priya Sharma (Platform Admin)'},
            {'role': 'DONOR', 'username': 'donor_restaurant', 'password': 'Donor@123', 'name': 'Royal Spice Restaurant'},
            {'role': 'RECIPIENT', 'username': 'recipient_ngo', 'password': 'Recipient@123', 'name': 'Asha Jyothi Children Home'},
            {'role': 'VOLUNTEER', 'username': 'volunteer_rider', 'password': 'Volunteer@123', 'name': 'Arun Teja (Logistics Rider)'},
        ]
    })
