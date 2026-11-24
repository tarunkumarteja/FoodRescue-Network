import logging
from django.utils import timezone
from .models import Notification, NotificationType, UserRole

logger = logging.getLogger(__name__)


def create_notification(recipient, notification_type, title, message, related_listing=None, related_reservation=None):
    """
    Creates an in-app notification record and dispatches outbound event hooks.
    """
    try:
        notif = Notification.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            message=message,
            related_listing=related_listing,
            related_reservation=related_reservation
        )

        # Dispatch external event hooks (clean extension points for Email, SMS, Web Push)
        dispatch_email_hook(recipient, title, message)
        dispatch_push_hook(recipient, title, message)

        return notif
    except Exception as e:
        logger.error(f"Failed to create notification for {recipient.username}: {e}")
        return None


def dispatch_email_hook(recipient, subject, body):
    """
    Service event hook for outbound email notifications.
    Can be configured with standard SMTP / SendGrid / SES in production.
    """
    logger.info(f"[EMAIL HOOK] To: {recipient.email} | Subject: {subject} | Content: {body[:60]}...")
    # In production: send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [recipient.email])


def dispatch_push_hook(recipient, title, body):
    """
    Service event hook for push / mobile notifications (FCM, WebPush).
    """
    logger.info(f"[PUSH HOOK] User: {recipient.username} | Title: {title} | Message: {body[:60]}...")


def notify_new_matches(listing, matching_recipients):
    """
    Notifies top matching recipient organizations when a new surplus listing is posted.
    """
    count = 0
    for match in matching_recipients:
        org_id = match.get('recipient_id')
        from .models import Organization
        try:
            org = Organization.objects.get(id=org_id)
            for member in org.members.all():
                create_notification(
                    recipient=member,
                    notification_type=NotificationType.NEW_MATCH,
                    title=f"New Food Match: {listing.title}",
                    message=f"A new surplus batch of {listing.quantity} {listing.unit_of_measure} has been posted nearby with a {match.get('match_percentage')}% match score. Pickup deadline: {listing.pickup_deadline.strftime('%I:%M %p')}.",
                    related_listing=listing
                )
                count += 1
        except Exception as e:
            logger.warning(f"Could not notify org {org_id}: {e}")
    return count


def notify_claim_confirmed(reservation):
    """
    Notifies both donor and recipient when a reservation is successfully confirmed.
    """
    listing = reservation.food_listing
    donor_user = listing.donor
    recipient_user = reservation.recipient

    # 1. Notify Donor
    create_notification(
        recipient=donor_user,
        notification_type=NotificationType.CLAIM_CONFIRMED,
        title=f"Claim Confirmed: {reservation.quantity_reserved} pkts reserved",
        message=f"{recipient_user.get_full_name() or recipient_user.username} ({reservation.organization.name if reservation.organization else 'Recipient'}) has reserved {reservation.quantity_reserved} {listing.unit_of_measure} of '{listing.title}'. Handover OTP is #{reservation.pickup.donor_otp}.",
        related_listing=listing,
        related_reservation=reservation
    )

    # 2. Notify Recipient
    create_notification(
        recipient=recipient_user,
        notification_type=NotificationType.CLAIM_CONFIRMED,
        title=f"Reservation Success: {listing.title}",
        message=f"You reserved {reservation.quantity_reserved} {listing.unit_of_measure}. Delivery OTP code upon arrival is #{reservation.pickup.recipient_otp}.",
        related_listing=listing,
        related_reservation=reservation
    )


def notify_expiring_window(listing):
    """
    Alerts donor and active claimants that a pickup deadline is nearing expiration (< 1 hour).
    """
    # Notify donor
    create_notification(
        recipient=listing.donor,
        notification_type=NotificationType.EXPIRING_SOON,
        title=f"Urgent: Pickup Window Expiring Soon",
        message=f"Listing '{listing.title}' expires at {listing.pickup_deadline.strftime('%I:%M %p')}. Remaining inventory: {listing.quantity} {listing.unit_of_measure}.",
        related_listing=listing
    )

    # Notify active reservations
    for res in listing.reservations.filter(status='CONFIRMED'):
        create_notification(
            recipient=res.recipient,
            notification_type=NotificationType.EXPIRING_SOON,
            title=f"Urgent: Claim Expiring Soon",
            message=f"Pickup window for '{listing.title}' ends at {listing.pickup_deadline.strftime('%I:%M %p')}. Please ensure collection is completed promptly.",
            related_listing=listing,
            related_reservation=res
        )


def notify_cancellation(reservation, reason):
    """
    Alerts parties when a reservation or pickup is cancelled.
    """
    listing = reservation.food_listing

    # Notify donor
    create_notification(
        recipient=listing.donor,
        notification_type=NotificationType.CANCELLED,
        title=f"Reservation Cancelled: {listing.title}",
        message=f"Reservation for {reservation.quantity_reserved} {listing.unit_of_measure} was cancelled. Inventory has been automatically restored. Reason: {reason}",
        related_listing=listing,
        related_reservation=reservation
    )

    # Notify recipient
    create_notification(
        recipient=reservation.recipient,
        notification_type=NotificationType.CANCELLED,
        title=f"Reservation Cancelled: {listing.title}",
        message=f"Your reservation for {reservation.quantity_reserved} {listing.unit_of_measure} has been cancelled. Reason: {reason}",
        related_listing=listing,
        related_reservation=reservation
    )
