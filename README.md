# FoodRescue Network 🍱🌱

> **"Connecting surplus edible food with the people who need it"**
> *Team 2 | Web-based food donation and distribution platform*

---

## 🌟 Overview & Problem Solved

Every day, restaurants, supermarkets, hotels, and banquet halls prepare large batches of meals and sell only a portion (e.g., 100 food packets prepared, 70 sold, **30 packets at risk of waste**). Meanwhile, nearby verified NGOs, orphanages, and community kitchens desperately need nutritious food.

The gap is **communication and real-time coordination**, not supply.

**FoodRescue Network** bridges this gap through an end-to-end cycle:
$$\text{List} \longrightarrow \text{Match} \longrightarrow \text{Reserve} \longrightarrow \text{Deliver}$$

---

## 🚀 Key Features by User Role

The platform provides dedicated workspaces for **four user roles**:

### 1. 🏪 Food Donors (Restaurants, Supermarkets, Caterers)
- **Surplus Food Declaration:** Post meals specifying food category, initial portions, storage requirements (Hot >60°C, Refrigerated <5°C, Ambient), allergens, and pickup deadlines.
- **Real-time Inventory:** Remaining portion counters decrement atomically as reservations are made.
- **Handover Security:** 6-digit OTP code (`#482910`) displayed to verify food handover to assigned volunteers.

### 2. 💚 Food Recipients (NGOs, Orphanages, Community Shelters)
- **Verified Organization Access:** Strict access control ensuring only admin-audited non-profits can claim food.
- **Smart Algorithmic Matching (Slide 8):** Ranks available food listings based on:
  $$\text{Score} = 0.4 \times D + 0.3 \times Q + 0.2 \times T + 0.1 \times C$$
  - $D$: Distance suitability (Haversine formula within delivery radius)
  - $Q$: Quantity fit (matching recipient daily intake capacity)
  - $T$: Pickup urgency factor
  - $C$: Recipient capacity and verified reliability
- **Atomic Reservation Engine:** Database row-level locking (`select_for_update`) prevents double-booking.
- **Delivery Confirmation:** 6-digit OTP code (`#619340`) required upon arrival.

### 3. 🚚 Volunteer Logistics
- **Dispatch Board:** Claim pending pickup and drop-off jobs with interactive routing.
- **Interactive Leaflet Map:** Displays donor origin, recipient destination, and live transit polyline.
- **4-Stage Delivery Lifecycle:**
  1. `VOLUNTEER_ASSIGNED`
  2. `EN_ROUTE_TO_DONOR`
  3. `FOOD_COLLECTED` (Donor OTP confirmation)
  4. `DELIVERED` (Recipient OTP confirmation)
- **Audit Event Trail:** Real-time tamper-evident event log for every leg of the journey.

### 4. 🛡️ Platform Administrators
- **Verification Desk:** Audit tax IDs, FSSAI licenses, and Darpan registration certificates. Approve or reject with 1 click.
- **Safety & Dispute Control:** Monitor safety declarations, review ratings, and suspend suspicious accounts.
- **Predictive Demand Forecasting:** 7-day projection comparing donor surplus trends against shelter demand with peak surplus windows (Lunch 14:00-16:00, Dinner 21:30-23:30).

---

## ⚡ Slide 12 Demo Walkthrough

The platform includes a pre-seeded, interactive demo scenario:

1. **Restaurant registers** and receives FSSAI verification.
2. **Kitchen posts 50 food packets** of Vegetable Biryani & Paneer Gravy.
3. **NGO (Asha Jyothi Children Home)** gets verified by the administrator.
4. **NGO searches available food** within Bengaluru central area.
5. **Matching Engine recommends** the Biryani batch with an **86.0% Match Score** (Distance: 0.91 km).
6. **NGO reserves 30 packets** $\rightarrow$ Inventory updates atomically: **20 packets remaining**.
7. **Volunteer (Arun Teja)** claims the delivery dispatch.
8. **Volunteer arrives at kitchen** and collects thermal food containers.
9. **Donor Handover verified** using OTP `#482910`.
10. **Delivery completed at shelter** using Recipient OTP `#619340`. Both dashboards and CO₂ statistics refresh instantly!

---

## 🔑 Pre-Configured Test Accounts

| Role | Username | Password | Organization / Persona |
|---|---|---|---|
| **Admin** | `admin` | `Admin@123` | Priya Sharma (Platform Admin) |
| **Donor** | `donor_restaurant` | `Donor@123` | Royal Spice Restaurant & Banquets |
| **Recipient** | `recipient_ngo` | `Recipient@123` | Asha Jyothi Children Home & Shelter |
| **Volunteer** | `volunteer_rider` | `Volunteer@123` | Arun Teja (Logistics Rider) |

*(You can also switch personas instantly via the **Quick 1-Click Role Switcher** in the top navigation bar).*

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Leaflet Maps (OpenStreetMap)
- **Backend:** Python, Django 5.2, Django REST Framework (DRF)
- **Database:** PostgreSQL / SQLite (zero-config local SQLite included, ready for PostgreSQL production)
- **Security:** SimpleJWT (JSON Web Tokens), role-based permissions, CORS protection
- **Verification:** 6-digit numeric OTP and QR token generation for logistics handovers

---

## 💻 How to Run Locally

### Option 1: Quick Launch (Windows Batch)
Double-click `start_all.bat` in the repository root. This opens both the Django REST backend (`http://localhost:8000`) and the Vite React frontend (`http://localhost:5173`).

### Option 2: Manual Terminal Startup

#### 1. Backend:
```bash
cd backend
py.cmd manage.py migrate
py.cmd manage.py seed_demo    # Seeds test accounts and Slide 12 demo
py.cmd manage.py runserver 0.0.0.0:8000
```

#### 2. Frontend:
```bash
cd frontend
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🧪 Running Automated Tests

Run the test suite covering the 4-factor matching algorithm, atomic reservation locking, and OTP handover verification:

```bash
cd backend
py.cmd manage.py test core
```

Output:
```text
Creating test database for alias 'default'...
...
Ran 3 tests in 8.452s
OK
```

---

## 🛡️ Safety, Ethics & Limitations

> **Safety First:** The platform collects and displays safety metadata (prep time, storage instructions, expiry deadlines). It acts as a transparent coordination bridge and **never declares food safe to eat on its own**. Verified recipient organizations inspect container seals and temperatures prior to serving.
