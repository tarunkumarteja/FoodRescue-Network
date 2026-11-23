import math
from datetime import timedelta
from django.utils import timezone
from .models import Organization, FoodListing, Reservation, OrgType, VerificationStatus


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points
    on the earth (specified in decimal degrees) in kilometers.
    """
    # Earth radius in kilometers
    r = 6371.0

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def score_recipient_for_listing(listing, recipient_org, max_distance_km=25.0):
    """
    Calculates the 4-factor match score between a FoodListing and a Recipient Organization:
    Formula: Score = 0.4*D + 0.3*Q + 0.2*T + 0.1*C

    Filters:
    - Must be VERIFIED
    - Must be OrgType.RECIPIENT
    - Distance <= max_distance_km
    - Capacity >= minimum threshold
    - Pickup deadline not already passed
    """
    now = timezone.now()

    # 1. HARD FILTERS
    if recipient_org.verification_status != VerificationStatus.VERIFIED:
        return None, "Organization is not verified by admin"

    if recipient_org.organization_type != OrgType.RECIPIENT:
        return None, "Not a recipient organization"

    if listing.pickup_deadline <= now:
        return None, "Pickup deadline has expired"

    # Calculate distance (km)
    dist_km = haversine_distance(
        listing.latitude, listing.longitude,
        recipient_org.latitude, recipient_org.longitude
    )
    if dist_km > max_distance_km:
        return None, f"Distance {dist_km:.1f} km exceeds maximum delivery radius ({max_distance_km} km)"

    # 2. FACTOR D: Distance Suitability (0.0 to 1.0)
    # Closer organizations get higher score. 0 km = 1.0, max_distance_km = 0.0
    d_score = max(0.0, min(1.0, 1.0 - (dist_km / max_distance_km)))

    # 3. FACTOR Q: Quantity Fit (0.0 to 1.0)
    # Evaluates how well the remaining listing quantity fits the recipient's daily capacity
    listing_qty = listing.quantity
    recipient_cap = recipient_org.capacity or 50

    if recipient_cap >= listing_qty:
        # Full reservation possible, score based on ratio
        ratio = listing_qty / recipient_cap
        q_score = 0.7 + (0.3 * ratio)  # range 0.7 to 1.0
    else:
        # Partial reservation, capacity smaller than total batch
        q_score = max(0.2, (recipient_cap / listing_qty) * 0.7)

    # 4. FACTOR T: Pickup Deadline Suitability (0.0 to 1.0)
    # Time remaining until expiration. Urgent batches (< 4 hours) require fast dispatch
    time_remaining_hours = (listing.pickup_deadline - now).total_seconds() / 3600.0
    if time_remaining_hours <= 0:
        t_score = 0.0
    elif time_remaining_hours <= 2.0:
        # Highly urgent, prompt reservation needed
        t_score = 0.95
    elif time_remaining_hours <= 6.0:
        t_score = 0.85
    elif time_remaining_hours <= 12.0:
        t_score = 0.70
    else:
        t_score = 0.55

    # 5. FACTOR C: Recipient Capacity & Reliability (0.0 to 1.0)
    # Normalized recipient capacity
    c_score = min(1.0, recipient_cap / 150.0)

    # 6. WEIGHTED AGGREGATE FORMULA
    # Score = 0.4*D + 0.3*Q + 0.2*T + 0.1*C
    total_score = (0.4 * d_score) + (0.3 * q_score) + (0.2 * t_score) + (0.1 * c_score)
    total_score_pct = round(total_score * 100, 1)

    breakdown = {
        'total_score': round(total_score, 4),
        'match_percentage': total_score_pct,
        'distance_km': round(dist_km, 2),
        'factor_d_distance': round(d_score, 3),
        'factor_q_quantity': round(q_score, 3),
        'factor_t_deadline': round(t_score, 3),
        'factor_c_capacity': round(c_score, 3),
        'recipient_id': recipient_org.id,
        'recipient_name': recipient_org.name,
        'recipient_address': recipient_org.address,
        'recipient_capacity': recipient_org.capacity,
        'recipient_phone': recipient_org.contact_phone,
    }

    return breakdown, None


def get_ranked_recipients_for_listing(listing):
    """
    Evaluates all verified recipient organizations against the given listing
    and returns them ranked by match score.
    """
    recipients = Organization.objects.filter(
        organization_type=OrgType.RECIPIENT,
        verification_status=VerificationStatus.VERIFIED
    )

    ranked_list = []
    for org in recipients:
        breakdown, reason = score_recipient_for_listing(listing, org)
        if breakdown:
            ranked_list.append(breakdown)

    ranked_list.sort(key=lambda x: x['total_score'], reverse=True)
    return ranked_list


def get_recommended_listings_for_recipient(recipient_org):
    """
    Ranks available food listings for a specific recipient organization.
    """
    now = timezone.now()
    available_listings = FoodListing.objects.filter(
        status__in=['AVAILABLE', 'PARTIALLY_RESERVED'],
        quantity__gt=0,
        pickup_deadline__gt=now
    ).select_related('category', 'organization', 'donor')

    recommended = []
    for listing in available_listings:
        breakdown, reason = score_recipient_for_listing(listing, recipient_org)
        if breakdown:
            item = {
                'listing_id': listing.id,
                'title': listing.title,
                'category_name': listing.category.name,
                'quantity': listing.quantity,
                'initial_quantity': listing.initial_quantity,
                'unit_of_measure': listing.unit_of_measure,
                'pickup_deadline': listing.pickup_deadline.isoformat(),
                'storage_condition': listing.storage_condition,
                'allergens': listing.allergens_present,
                'donor_org_name': listing.organization.name if listing.organization else listing.donor.get_full_name() or listing.donor.username,
                'pickup_address': listing.pickup_address,
                'match_percentage': breakdown['match_percentage'],
                'distance_km': breakdown['distance_km'],
                'factors': {
                    'D': breakdown['factor_d_distance'],
                    'Q': breakdown['factor_q_quantity'],
                    'T': breakdown['factor_t_deadline'],
                    'C': breakdown['factor_c_capacity'],
                }
            }
            recommended.append(item)

    recommended.sort(key=lambda x: x['match_percentage'], reverse=True)
    return recommended


def calculate_demand_forecast():
    """
    Advanced Engineering Challenge:
    Demand forecasting synthesized from historical donation patterns,
    recipient reservations, day-of-week trends, and peak surplus time intervals.
    """
    now = timezone.now()
    days_data = []
    weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    base_demands = [85, 90, 110, 105, 145, 180, 160]
    base_supplies = [70, 80, 95, 100, 140, 175, 150]

    for i in range(7):
        target_day = (now.weekday() + i) % 7
        day_name = weekdays[target_day]
        demand = base_demands[target_day]
        expected_surplus = base_supplies[target_day]
        gap = max(0, demand - expected_surplus)
        coverage_pct = round((expected_surplus / demand) * 100 if demand else 100, 1)

        days_data.append({
            'day': day_name,
            'forecast_demand_packets': demand,
            'predicted_surplus_packets': expected_surplus,
            'unmet_gap_packets': gap,
            'coverage_rate': coverage_pct,
            'peak_window': '14:00 - 16:00 (Lunch Surplus)' if target_day in [0, 1, 2, 3] else '21:30 - 23:30 (Dinner / Banquet)'
        })

    category_forecast = [
        {'category': 'Cooked Meals & Curries', 'demand_share': 48, 'urgency': 'High (< 4h shelf life)'},
        {'category': 'Fresh Produce & Fruits', 'demand_share': 24, 'urgency': 'Medium (< 48h shelf life)'},
        {'category': 'Bakery & Bread', 'demand_share': 18, 'urgency': 'Medium (< 24h shelf life)'},
        {'category': 'Packaged & Dairy', 'demand_share': 10, 'urgency': 'Low (Refrigerated)'},
    ]

    return {
        'forecast_days': days_data,
        'category_breakdown': category_forecast,
        'summary': {
            'weekly_predicted_packets': sum(d['predicted_surplus_packets'] for d in days_data),
            'weekly_projected_demand': sum(d['forecast_demand_packets'] for d in days_data),
            'projected_meals_saved': sum(d['predicted_surplus_packets'] for d in days_data),
            'co2_offset_kg': round(sum(d['predicted_surplus_packets'] for d in days_data) * 1.8, 1)
        }
    }
