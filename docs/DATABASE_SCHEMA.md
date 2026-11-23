# Database Schema Documentation

## 1. Purpose of this Document

This document serves as the single source of truth for the **FoodRescueNetwork** database design. Because our team has 3 members collaborating concurrently on the project, having an agreed-upon schema before writing any code is critical. 

This document ensures that:
- Backend developers build models and relationships that accurately reflect the platform's domain logic.
- Frontend developers know what data structures, entities, and relational attributes to expect from API responses.
- The team avoids costly database refactoring, conflicting migrations, and duplicate entity definitions down the line.

---

## 2. Planned Entities Overview

Below is the initial list of planned database entities for FoodRescueNetwork.

### 2.1. User
- **Description:** Represents all human actors on the platform. Extends Django's `AbstractUser`.
- **Planned Roles:**
  - `DONOR`: Food donors (e.g., restaurants, grocery stores, corporate cafeterias, bakeries).
  - `RECIPIENT`: Recipient organizations (e.g., food banks, homeless shelters, community kitchens).
  - `VOLUNTEER`: Individuals who assist in picking up and delivering food donations.
  - `ADMIN`: Platform staff managing verifications, disputes, and system configuration.
- **Key Proposed Attributes:**
  - Identity & Auth: `id`, `email` (unique identifier), `password_hash`, `first_name`, `last_name`, `phone_number`.
  - Role & Status: `role`, `is_active`, `is_verified`, `created_at`, `updated_at`.
  - Relationship to Organization: Foreign key or Many-to-Many link to `Organization` (if representing a corporate entity).

### 2.2. Organization
- **Description:** Represents registered legal entities, charities, non-profits, or commercial donors.
- **Key Proposed Attributes:**
  - `id`, `name`, `organization_type` (Donor Entity vs. Recipient Charity / Food Bank).
  - Registration/Tax ID, official address, operational city, postal code.
  - Contact email, phone number, website URL.
  - `verification_status` (Pending, Verified, Rejected).
  - Timestamps: `created_at`, `updated_at`.

### 2.3. FoodCategory
- **Description:** Standardized taxonomic classification for surplus food donations to assist search, dietary filtering, and food safety compliance.
- **Examples:** Prepared Meals, Fresh Produce, Bakery & Bread, Dairy & Eggs, Packaged & Canned Goods, Frozen Food, Beverages.
- **Key Proposed Attributes:**
  - `id`, `name` (unique), `description`.
  - Safety & Handling metadata: `requires_refrigeration` (boolean), `shelf_life_guidance`, `created_at`.

### 2.4. FoodListing
- **Description:** Represents a specific surplus food donation posted by a Donor.
- **Key Proposed Attributes:**
  - `id`, `donor` (FK to User / Organization).
  - `category` (FK to FoodCategory).
  - `title`, `description`, `quantity`, `unit_of_measure` (e.g., kg, lbs, portions, boxes).
  - Dates & Urgency: `prepared_at`, `best_before_datetime`, `pickup_deadline`.
  - Food Safety & Dietary: `allergens_present` (JSON / flags), `handling_instructions`, `is_perishable`.
  - Location: `pickup_address`, `latitude`, `longitude`.
  - `status` (`AVAILABLE`, `RESERVED`, `PICKED_UP`, `COMPLETED`, `EXPIRED`, `CANCELLED`).
  - Timestamps: `created_at`, `updated_at`.

### 2.5. Reservation
- **Description:** A formal reservation made by an authorized Recipient organization on a `FoodListing`.
- **Key Proposed Attributes:**
  - `id`, `food_listing` (FK to FoodListing).
  - `reserved_by` (FK to User / Organization).
  - `quantity_reserved`.
  - `status` (`PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`).
  - `reserved_at`, `expires_at` (automatic cancellation if not picked up or assigned).
  - `cancellation_reason` (optional).

### 2.6. Pickup
- **Description:** Logistics and handover arrangement for retrieving reserved food from the donor.
- **Key Proposed Attributes:**
  - `id`, `reservation` (OneToOne or FK to Reservation).
  - `scheduled_pickup_window_start`, `scheduled_pickup_window_end`.
  - `actual_pickup_time` (nullable).
  - `pickup_instructions`, `pickup_contact_name`, `pickup_contact_phone`.
  - `verification_code` / OTP for donor handover confirmation.
  - `status` (`SCHEDULED`, `ARRIVED`, `COMPLETED`, `MISSED`, `CANCELLED`).

### 2.7. DeliveryEvent
- **Description:** Tracking record for transport logistics from the donor location to the recipient organization.
- **Key Proposed Attributes:**
  - `id`, `pickup` (FK to Pickup).
  - `volunteer` (FK to User, nullable if recipient performs self-pickup).
  - `event_type` (`VOLUNTEER_ASSIGNED`, `EN_ROUTE_TO_DONOR`, `FOOD_COLLECTED`, `EN_ROUTE_TO_RECIPIENT`, `DELIVERED`, `DELIVERY_FAILED`).
  - `timestamp`.
  - `notes` / status update description.
  - `proof_of_delivery` (image URL / recipient signature confirmation).

---

## 3. Pre-Implementation Agreement Requirements

Before writing Django models in `backend/` or generating migration files:
1. **Field Definitions & Constraints:** Exact field names, database types (e.g., `UUIDField` vs. `AutoField`), nullability (`null=True`, `blank=True`), default values, and foreign key `on_delete` behaviors (`CASCADE`, `PROTECT`, `SET_NULL`) must be formally agreed upon by team members.
2. **Review with API Needs:** All fields must align with the endpoints outlined in `docs/API_DOCUMENTATION.md`.
3. **No Solo Decisions:** No single developer should add fields or create new models unilaterally without team consensus.

---

## 4. Warning: Duplicate Models & Conflicting Migrations

In Django development with multiple contributors, migration conflicts are the most frequent source of broken builds and database corruption:

> [!WARNING]
> **Strict Migration Policy:**
> - **Never duplicate models:** Do not create separate or overlapping models (e.g., having both `Donation` and `FoodListing` or multiple user profile models).
> - **Coordinate migrations before merging:** Django creates sequential migration files (`0002_...`, `0003_...`). If Member A creates `0002_user_update.py` and Member B creates `0002_listing.py`, Git cannot reconcile them cleanly and Django will fail with conflicting migration leaf errors.
> - **Always pull latest `main`** and run `python manage.py makemigrations --merge` if an unavoidable branch collision occurs, after consulting with the team.
> - **Never edit or delete applied migrations** on the shared `main` branch.
