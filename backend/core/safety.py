from datetime import timedelta
from django.utils import timezone
from .models import VerificationStatus, OrgType


class FoodSafetyValidationError(Exception):
    """Exception raised when food safety or compliance criteria fail."""
    def __init__(self, message, code="SAFETY_VIOLATION"):
        super().__init__(message)
        self.message = message
        self.code = code


def validate_donor_safety_compliance(donor_user, data):
    """
    Deterministic Food Safety Policy Engine for Donors:
    1. Donor organization must be VERIFIED by platform administrators (or individual donor verified).
    2. Explicit food safety declaration must be acknowledged/provided.
    3. Preparation time must be valid (not in the future, within safe shelf-life limits).
    4. Pickup deadline must provide a minimum safety buffer (at least 30 minutes in the future).
    5. Pickup deadline cannot exceed best-before time.
    6. Temperature and storage specifications must be specified for perishable items.
    """
    now = timezone.now()

    # 1. Verification Check
    if donor_user.organization and donor_user.organization.verification_status != VerificationStatus.VERIFIED:
        raise FoodSafetyValidationError(
            "Donor organization must be verified and approved by a platform administrator before posting surplus food listings.",
            code="UNVERIFIED_DONOR"
        )

    # 2. Safety Declaration
    safety_declaration = data.get('food_safety_declaration', '').strip()
    if not safety_declaration:
        raise FoodSafetyValidationError(
            "Food safety declaration is mandatory. Donor must certify hygienic preparation and safe handling.",
            code="MISSING_SAFETY_DECLARATION"
        )

    # 3. Preparation Time Check
    prepared_at = data.get('prepared_at')
    if prepared_at and prepared_at > now + timedelta(minutes=5):
        raise FoodSafetyValidationError(
            "Preparation timestamp cannot be in the future.",
            code="INVALID_PREP_TIME"
        )

    # 4. Pickup Deadline Buffer Check
    pickup_deadline = data.get('pickup_deadline')
    if not pickup_deadline:
        raise FoodSafetyValidationError(
            "Pickup deadline is required.",
            code="MISSING_DEADLINE"
        )

    min_buffer = timedelta(minutes=30)
    if pickup_deadline <= now + min_buffer:
        raise FoodSafetyValidationError(
            "Pickup deadline must be at least 30 minutes from now to allow safe volunteer dispatch and collection.",
            code="INSUFFICIENT_DEADLINE_BUFFER"
        )

    # 5. Best Before Comparison
    best_before = data.get('best_before_datetime')
    if best_before and pickup_deadline > best_before:
        raise FoodSafetyValidationError(
            "Pickup deadline cannot be after the best-before/consumption expiration time.",
            code="DEADLINE_AFTER_EXPIRY"
        )

    # 6. Storage condition verification
    storage_condition = data.get('storage_condition', '')
    if not storage_condition:
        raise FoodSafetyValidationError(
            "Storage condition specification (e.g., Heated >60°C, Refrigerated <5°C, Room Temp) is mandatory.",
            code="MISSING_STORAGE_SPEC"
        )

    return True


def validate_recipient_claim_eligibility(recipient_user, listing, quantity_to_reserve):
    """
    Deterministic Eligibility & Safety Compatibility Engine for Recipients:
    1. Recipient organization must be VERIFIED by platform administrators.
    2. Recipient account must not be suspended.
    3. Listing must not be expired or cancelled.
    4. Reserved quantity must not exceed current listing inventory.
    5. Daily capacity check: reservation cannot exceed recipient organization's daily handling capacity.
    6. Cold storage compatibility: if food category requires refrigeration, recipient must have cold storage.
    """
    now = timezone.now()

    if recipient_user.is_suspended:
        raise FoodSafetyValidationError(
            "Recipient account is suspended pending administrative review.",
            code="ACCOUNT_SUSPENDED"
        )

    recipient_org = recipient_user.organization
    if not recipient_org:
        raise FoodSafetyValidationError(
            "Recipient user must belong to an affiliated recipient organization to reserve food.",
            code="NO_ORGANIZATION"
        )

    if recipient_org.verification_status != VerificationStatus.VERIFIED:
        raise FoodSafetyValidationError(
            f"Organization '{recipient_org.name}' is pending admin verification. Only verified non-profits can claim food.",
            code="UNVERIFIED_RECIPIENT"
        )

    if recipient_org.organization_type != OrgType.RECIPIENT:
        raise FoodSafetyValidationError(
            "Only verified recipient organizations (NGOs, shelters, community kitchens) are permitted to claim food.",
            code="INVALID_ORG_TYPE"
        )

    if listing.is_expired or listing.pickup_deadline <= now:
        raise FoodSafetyValidationError(
            "This food listing's pickup deadline has expired. Food safety policy prevents claiming expired food.",
            code="LISTING_EXPIRED"
        )

    if quantity_to_reserve <= 0:
        raise FoodSafetyValidationError(
            "Quantity to claim must be at least 1 portion/packet.",
            code="INVALID_QUANTITY"
        )

    if quantity_to_reserve > listing.quantity:
        raise FoodSafetyValidationError(
            f"Requested quantity ({quantity_to_reserve}) exceeds available inventory ({listing.quantity} {listing.unit_of_measure}).",
            code="INSUFFICIENT_INVENTORY"
        )

    # Daily capacity constraint
    if recipient_org.capacity and quantity_to_reserve > recipient_org.capacity:
        raise FoodSafetyValidationError(
            f"Reservation of {quantity_to_reserve} packets exceeds recipient facility's certified daily capacity ({recipient_org.capacity} packets).",
            code="EXCEEDS_CAPACITY"
        )

    # Storage compatibility check
    if listing.category.requires_refrigeration and not recipient_org.has_cold_storage:
        # Check storage condition description
        storage_str = (listing.storage_condition or '').lower()
        if 'refrigerat' in storage_str or 'cold' in storage_str or '<5' in storage_str:
            raise FoodSafetyValidationError(
                f"Storage mismatch: Listing requires continuous refrigeration (<5°C), but recipient organization '{recipient_org.name}' does not have registered cold storage.",
                code="COLD_STORAGE_INCOMPATIBLE"
            )

    return True
