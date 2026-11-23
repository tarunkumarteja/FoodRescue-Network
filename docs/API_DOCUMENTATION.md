# API Documentation (Contract)

## 1. Purpose of the API Contract

This document outlines the planned RESTful API specification for the **FoodRescueNetwork** platform, built using Python and Django REST Framework (DRF) on the backend and consumed by the React + Vite frontend.

The purpose of this contract is to:
- Establish a clear interface agreement between frontend and backend team members before writing code.
- Enable frontend team members to build UI components with realistic mock data in parallel with backend development.
- Prevent integration friction, inconsistent response structures, and mismatched HTTP status codes.

> [!IMPORTANT]
> **PROPOSED SPECIFICATION NOTICE:**
> All endpoints, URL routes, request parameters, and response schemas listed below are **PROPOSED DRAFTS**. They are **not finalized**.
> Full team agreement on request/response fields, permission matrices, and HTTP status codes is required before backend implementation begins.

---

## 2. Global Conventions

- **Base URL:** `/api/v1/` (proposed)
- **Data Format:** `application/json` for all requests and responses (unless multipart form data for image uploads).
- **Authentication Scheme:** Bearer Token via SimpleJWT (`Authorization: Bearer <access_token>`).
- **Standard HTTP Status Codes:**
  - `200 OK`: Successful read or update.
  - `201 Created`: Resource successfully created.
  - `204 No Content`: Successful deletion or action with no return payload.
  - `400 Bad Request`: Validation failure or malformed payload.
  - `401 Unauthorized`: Missing or invalid JWT access token.
  - `403 Forbidden`: Authenticated user lacks permission for this resource/action.
  - `404 Not Found`: Resource does not exist.
  - `409 Conflict`: Business logic conflict (e.g., listing already reserved).
  - `500 Internal Server Error`: Unhandled server exception.

---

## 3. Planned API Functional Areas

### 3.1. Authentication & User Management (`/api/v1/auth/`)
Handles user registration, login, token refresh, and profile retrieval.

| Method | Proposed Endpoint | Access | Purpose / Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register/` | Public | Register a new user account (Donor, Recipient, Volunteer). |
| `POST` | `/api/v1/auth/token/` | Public | Obtain JWT pair (access + refresh tokens) via credentials. |
| `POST` | `/api/v1/auth/token/refresh/` | Public | Refresh expired access token using refresh token. |
| `POST` | `/api/v1/auth/logout/` | Authenticated | Invalidate/blacklist refresh token. |
| `GET` | `/api/v1/auth/profile/` | Authenticated | Retrieve current authenticated user's profile and roles. |
| `PATCH` | `/api/v1/auth/profile/` | Authenticated | Update user contact details and preferences. |

### 3.2. Organizations (`/api/v1/organizations/`)
Handles organization profiles (donors and recipient charities) and verification.

| Method | Proposed Endpoint | Access | Purpose / Description |
|---|---|---|---|
| `GET` | `/api/v1/organizations/` | Authenticated | List registered organizations (filterable by type and city). |
| `POST` | `/api/v1/organizations/` | Authenticated | Register a new organization entity. |
| `GET` | `/api/v1/organizations/{id}/` | Authenticated | Get detailed profile of a specific organization. |
| `PATCH` | `/api/v1/organizations/{id}/` | Org Admin / Owner | Update organization details, address, or operating hours. |
| `POST` | `/api/v1/organizations/{id}/verify/` | Staff / Admin | Admin approval endpoint for organization credentials. |

### 3.3. Food Listings & Donations (`/api/v1/donations/`)
Handles creation, listing, searching, and managing surplus food postings.

| Method | Proposed Endpoint | Access | Purpose / Description |
|---|---|---|---|
| `GET` | `/api/v1/donations/categories/` | Public / Auth | List all food categories (e.g., Produce, Prepared Meals). |
| `GET` | `/api/v1/donations/listings/` | Authenticated | Search & filter available food listings (by category, location, expiry). |
| `POST` | `/api/v1/donations/listings/` | Donor | Create a new surplus food listing. |
| `GET` | `/api/v1/donations/listings/{id}/` | Authenticated | Retrieve full details for a specific food listing. |
| `PATCH` | `/api/v1/donations/listings/{id}/` | Listing Owner | Update quantity, deadline, or notes of an active listing. |
| `DELETE` | `/api/v1/donations/listings/{id}/` | Listing Owner | Cancel or remove an unreserved food listing. |

### 3.4. Reservations (`/api/v1/reservations/`)
Handles claiming and reserving surplus food listings by recipient organizations.

| Method | Proposed Endpoint | Access | Purpose / Description |
|---|---|---|---|
| `GET` | `/api/v1/reservations/` | Authenticated | List reservations relevant to the user/organization. |
| `POST` | `/api/v1/reservations/` | Recipient | Create a reservation for an available food listing. |
| `GET` | `/api/v1/reservations/{id}/` | Involved Parties | View specific reservation status and details. |
| `PATCH` | `/api/v1/reservations/{id}/` | Involved Parties | Update reservation status (e.g., Confirm reservation). |
| `POST` | `/api/v1/reservations/{id}/cancel/` | Recipient / Donor | Cancel a pending reservation. |

### 3.5. Pickups & Deliveries (`/api/v1/deliveries/`)
Coordinates logistics, volunteer assignments, pickup handovers, and drop-off confirmations.

| Method | Proposed Endpoint | Access | Purpose / Description |
|---|---|---|---|
| `GET` | `/api/v1/deliveries/available/` | Volunteer | List pending deliveries needing volunteer transport. |
| `POST` | `/api/v1/deliveries/{id}/claim/` | Volunteer | Volunteer claims a delivery assignment. |
| `POST` | `/api/v1/deliveries/{id}/pickup/` | Volunteer / Donor | Confirm food pickup at donor location (with verification code). |
| `POST` | `/api/v1/deliveries/{id}/complete/` | Volunteer / Recipient | Confirm successful delivery at recipient location. |
| `GET` | `/api/v1/deliveries/{id}/events/` | Involved Parties | Retrieve delivery audit event history and tracking logs. |

---

## 4. Next Steps for Team Alignment

Before building API endpoints in Django REST Framework:
1. Team members must review this proposed contract and confirm:
   - Are any critical operations missing?
   - Do request payloads require nested objects or flat structures?
   - What exact fields must be returned for list views vs. detail views?
2. Define explicit error payload formats (e.g., `{"error": {"code": "...", "message": "...", "details": {}}}`).
3. Lock in permission classes for each view (e.g., `IsAuthenticated`, `IsDonor`, `IsRecipient`, `IsVolunteer`).
