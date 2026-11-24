import React, { useState } from 'react';

export default function LandingPage({ stats, onOpenLogin, onOpenRegister, onSelectDemoPersona }) {
  const [contactForm, setContactForm] = useState({ name: '', email: '', role: 'DONOR', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const summary = stats?.impact_summary || {
    total_listings: 12,
    total_packets_donated: 765,
    total_packets_rescued: 341,
    total_packets_delivered: 341,
    co2_saved_kg: 613.8,
    active_deliveries: 1,
    verified_organizations: 13,
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactForm({ name: '', email: '', role: 'DONOR', message: '' });
      setContactSubmitted(false);
    }, 6000);
  };

  const demoPersonas = [
    { role: 'DONOR', label: 'Food Donor', org: 'Royal Spice Restaurant & Banquets', icon: '🏪', desc: 'Post surplus meals, monitor portion countdowns, and verify handover OTPs.' },
    { role: 'RECIPIENT', label: 'Food Recipient', org: 'Asha Jyothi Children Home & Shelter', icon: '💚', desc: 'Browse matched surplus, claim atomic reservations, and confirm arrival.' },
    { role: 'VOLUNTEER', label: 'Volunteer Logistics', org: 'City Logistics Volunteer Network', icon: '🚚', desc: 'Accept pickup dispatches, follow route coordinates, and verify 2-factor OTPs.' },
    { role: 'ADMIN', label: 'Platform Administrator', org: 'FoodRescue Network Trust & Safety', icon: '🛡️', desc: 'Audit FSSAI licenses, review safety declarations, and run demand forecasting.' },
  ];

  return (
    <div className="w-full text-slate-800">
      {/* ---------------------------------------------------------------------- */}
      {/* 1. HERO SECTION */}
      {/* ---------------------------------------------------------------------- */}
      <section id="home" className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-emerald-50/60 via-white to-slate-50">
        {/* Decorative background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-emerald-200/30 via-teal-100/20 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Next-Gen Surplus Food Redistribution & Zero Waste Coordination</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
              Connecting <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600">Surplus Food</span> With People In Need
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Every day, restaurants, caterers, and supermarkets prepare batches of fresh food at risk of waste.
              FoodRescue Network connects verified food donors directly with community shelters and non-profits through 
              smart matching and secure OTP logistics.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onOpenRegister('DONOR')}
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/25 transition-all transform hover:-translate-y-0.5 text-sm flex items-center justify-center gap-2"
              >
                <span>🏪</span>
                <span>Donate Surplus Food</span>
              </button>

              <button
                onClick={() => onOpenRegister('RECIPIENT')}
                className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-emerald-500 rounded-2xl font-bold shadow-sm transition-all transform hover:-translate-y-0.5 text-sm flex items-center justify-center gap-2"
              >
                <span>💚</span>
                <span>Claim Food For Shelter</span>
              </button>

              <button
                onClick={() => onOpenLogin()}
                className="w-full sm:w-auto px-6 py-3.5 text-emerald-700 hover:text-emerald-800 font-bold text-sm hover:underline"
              >
                Sign In to Portal →
              </button>
            </div>

            {/* Trust Badges */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> FSSAI & Darpan Audited
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> Cold-Chain Verification
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> 6-Digit OTP Handover
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> Zero Race-Condition Claims
              </span>
            </div>
          </div>

          {/* Public Impact Highlights (General Numbers only - no personal data) */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-200/80 shadow-sm text-center">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                🍱
              </div>
              <div className="text-3xl font-black text-slate-900">{summary.total_packets_rescued}+</div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Meals Rescued</p>
              <p className="text-[11px] text-slate-400 mt-1">From commercial kitchens & caterers</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-200/80 shadow-sm text-center">
              <div className="w-10 h-10 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                🌱
              </div>
              <div className="text-3xl font-black text-slate-900">{summary.co2_saved_kg} kg</div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">CO₂e Avoided</p>
              <p className="text-[11px] text-slate-400 mt-1">Methane emissions prevented</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-200/80 shadow-sm text-center">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                🏛️
              </div>
              <div className="text-3xl font-black text-slate-900">{summary.verified_organizations}</div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Verified Partners</p>
              <p className="text-[11px] text-slate-400 mt-1">Audited non-profits & donors</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-200/80 shadow-sm text-center">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                ⚡
              </div>
              <div className="text-3xl font-black text-slate-900">100%</div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">OTP Handover</p>
              <p className="text-[11px] text-slate-400 mt-1">Verified 2-factor chain of custody</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. ABOUT & THE CORE PROBLEM SECTION */}
      {/* ---------------------------------------------------------------------- */}
      <section id="about" className="py-20 bg-white border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-4">
                About Our Purpose
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                The Gap is Communication and Real-Time Coordination, Not Food Supply.
              </h2>
              <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
                Hotels, corporate cafeterias, and banquet halls regularly prepare batches of 100+ food packets. 
                When 70 are consumed, 30 wholesome meals risk disposal due to strict shelf-life limits. 
                Simultaneously, children's shelters, elderly care homes, and community kitchens just a few kilometers away need nutritious meals.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm shrink-0">
                    ✕
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Without Coordination</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Edible meals end up in landfills emitting methane, while non-profits exhaust operational budgets purchasing dinner supplies.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">With FoodRescue Network</h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Donors post in 60 seconds. Our matching engine pairs them with the most suitable verified shelter in minutes. 
                      Volunteers transport in thermal containers with OTP confirmation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Flow diagram card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl"></div>

              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-2">
                The FoodRescue Lifecycle
              </span>
              <h3 className="text-2xl font-black text-white mb-6">End-to-End Certified Safety Bridge</h3>

              <div className="space-y-6 relative">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-100">1. List Surplus</h5>
                    <p className="text-xs text-slate-400">Donor specifies portions, storage (hot/cold), allergens, and pickup window.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-100">2. Algorithmic Match</h5>
                    <p className="text-xs text-slate-400">4-factor formula evaluates distance, daily intake capacity, urgency, and cold storage.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-100">3. Atomic Claim</h5>
                    <p className="text-xs text-slate-400">Verified NGO reserves portions with row-level locks. Remaining portions update instantly.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                    4
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-100">4. OTP Handover Delivery</h5>
                    <p className="text-xs text-slate-400">Volunteer enters Donor OTP at kitchen and Recipient OTP at shelter to complete cycle.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. HOW IT WORKS (STEP-BY-STEP) */}
      {/* ---------------------------------------------------------------------- */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200">
              Operational Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
              How FoodRescue Network Works
            </h2>
            <p className="text-slate-600 text-sm mt-3">
              Built on mathematical matching, atomic database transactions, and tamper-evident volunteer dispatching.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl mb-4 font-bold">
                🏪
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">Step 01</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Declare Surplus</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kitchens specify meal names, portion quantities, storage temperature requirements (Ambient, &gt;60°C Hot, &lt;5°C Cold), and strict pickup deadlines.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl mb-4 font-bold">
                🎯
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">Step 02</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">4-Factor Match</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Algorithm scores: <code>Score = 0.4D + 0.3Q + 0.2T + 0.1C</code>. 
                Ranks verified recipient organizations by distance, intake volume, deadline buffer, and cold storage setup.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl mb-4 font-bold">
                ⚡
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Step 03</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Atomic Reservation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Recipient shelters claim portions with database row-level locking. Eliminates race conditions and prevents double-booking under concurrent load.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl mb-4 font-bold">
                🚚
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">Step 04</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">OTP Handover</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Volunteers collect from the donor using a 6-digit donor OTP, then deliver to the shelter using the recipient OTP. Impact metrics update immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 4. FEATURES BY ROLE */}
      {/* ---------------------------------------------------------------------- */}
      <section id="features" className="py-20 bg-white border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
              Tailored Workspaces
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
              Purpose-Built For Four Distinct Roles
            </h2>
            <p className="text-slate-600 text-sm mt-3">
              Every participant enjoys a dedicated interface designed strictly for their operational responsibilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Donor Role */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 hover:border-emerald-500/50 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-600/20">
                  🏪
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Food Donors</h3>
                  <p className="text-xs font-semibold text-emerald-700">Restaurants, Hotels, Supermarkets & Caterers</p>
                </div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Fast 60-second surplus meal listing with storage & allergen declaration
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Real-time countdown portion decrements as shelters place claims
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Secure 6-digit donor OTP to verify volunteer handover
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Corporate Social Responsibility (CSR) impact certificates and carbon offset tallies
                </li>
              </ul>
              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between">
                <button
                  onClick={() => onOpenRegister('DONOR')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  Register As Donor →
                </button>
                <button
                  onClick={() => onSelectDemoPersona('DONOR')}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200"
                >
                  Try Demo Donor
                </button>
              </div>
            </div>

            {/* Recipient Role */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 hover:border-teal-500/50 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xl shadow-md shadow-teal-600/20">
                  💚
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Food Recipients</h3>
                  <p className="text-xs font-semibold text-teal-700">NGOs, Orphanages, Community Shelters & Kitchens</p>
                </div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2">
                  <span className="text-teal-600 font-bold">✓</span> Admin-verified organization status ensuring food reaches legitimate beneficiaries
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-teal-600 font-bold">✓</span> Algorithmic top matches ranking listings by distance, capacity, and freshness
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-teal-600 font-bold">✓</span> Instant atomic claims with zero chance of over-allocation
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-teal-600 font-bold">✓</span> Delivery feedback and immediate food safety incident reporting desk
                </li>
              </ul>
              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between">
                <button
                  onClick={() => onOpenRegister('RECIPIENT')}
                  className="text-xs font-bold text-teal-700 hover:text-teal-800"
                >
                  Register As Recipient →
                </button>
                <button
                  onClick={() => onSelectDemoPersona('RECIPIENT')}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200"
                >
                  Try Demo NGO
                </button>
              </div>
            </div>

            {/* Volunteer Role */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 hover:border-amber-500/50 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center text-xl shadow-md shadow-amber-600/20">
                  🚚
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Volunteer Logistics</h3>
                  <p className="text-xs font-semibold text-amber-700">Transit Riders, Food Rescue Drivers & Couriers</p>
                </div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2">
                  <span className="text-amber-600 font-bold">✓</span> Live dispatch board showing available pickup and delivery tasks in your zone
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-600 font-bold">✓</span> Interactive map coordinates with donor-to-recipient transit polyline
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-600 font-bold">✓</span> 4-stage delivery tracking: Assigned → En Route → Collected → Delivered
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-600 font-bold">✓</span> Full audit trail logged with timestamps and delivery proof notes
                </li>
              </ul>
              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between">
                <button
                  onClick={() => onOpenRegister('VOLUNTEER')}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800"
                >
                  Join As Volunteer →
                </button>
                <button
                  onClick={() => onSelectDemoPersona('VOLUNTEER')}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200"
                >
                  Try Demo Rider
                </button>
              </div>
            </div>

            {/* Administrator Role */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 hover:border-purple-500/50 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-xl shadow-md shadow-purple-600/20">
                  🛡️
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Platform Administrators</h3>
                  <p className="text-xs font-semibold text-purple-700">Trust, Verification, Safety & Predictive Intelligence</p>
                </div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2">
                  <span className="text-purple-600 font-bold">✓</span> Organization Verification Desk: Review FSSAI licenses & NGO Darpan certificates
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-600 font-bold">✓</span> Food safety dispute desk: Review feedback ratings and resolve safety incidents
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-600 font-bold">✓</span> 7-day predictive demand forecasting comparing donor supply with shelter demand
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-600 font-bold">✓</span> In-app multi-agent network simulation engine for stress testing
                </li>
              </ul>
              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between">
                <button
                  onClick={() => onOpenLogin()}
                  className="text-xs font-bold text-purple-700 hover:text-purple-800"
                >
                  Admin Sign In →
                </button>
                <button
                  onClick={() => onSelectDemoPersona('ADMIN')}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200"
                >
                  Try Demo Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 5. 1-CLICK DEMO PERSONAS PREVIEW */}
      {/* ---------------------------------------------------------------------- */}
      <section className="py-16 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
              Interactive Evaluation
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-3">
              Explore The Platform In 1-Click
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">
              Select any pre-configured demo account below to test the complete workflow immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {demoPersonas.map((p) => (
              <div
                key={p.role}
                onClick={() => onSelectDemoPersona(p.role)}
                className="bg-white/10 hover:bg-white/15 border border-white/10 hover:border-emerald-400 p-5 rounded-2xl cursor-pointer transition-all transform hover:-translate-y-1"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{p.icon}</span>
                  <span className="text-sm font-bold text-white">{p.label}</span>
                </div>
                <div className="text-[11px] font-semibold text-emerald-300 truncate mb-2">{p.org}</div>
                <p className="text-xs text-slate-300 leading-snug">{p.desc}</p>
                <div className="mt-4 flex items-center justify-between text-xs font-bold text-emerald-400 pt-3 border-t border-white/10">
                  <span>Sign In As {p.role}</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 6. CONTACT & FAQS */}
      {/* ---------------------------------------------------------------------- */}
      <section id="contact" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Column: FAQs */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                Frequently Asked Questions
              </span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-3 mb-6">
                Common Questions About Safety, Verification & Logistics
              </h2>

              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Who can register as a surplus food donor?</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Commercial food entities including restaurants, cafeterias, hotels, banquet halls, and grocery retailers.
                    Organizations submit official registration or FSSAI license credentials for platform verification.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-900 mb-1">How are recipient organizations vetted?</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Charities and shelters provide tax exemption registrations (e.g., 80G, Darpan ID) and proof documents. 
                    Platform staff conduct audit verifications before any organization can claim food.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Is there any fee or cost for shelters to receive food?</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    No. FoodRescue Network operates strictly for philanthropic redistribution. Surplus food is provided completely free of charge to registered charities.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-900 mb-1">How does handover security work?</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The platform generates unique 6-digit numeric OTPs. The donor gives their OTP to the volunteer at collection.
                    The recipient gives their OTP to the volunteer at shelter drop-off, providing tamper-evident custody.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Get In Touch
              </span>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Connect With FoodRescue Network</h3>
              <p className="text-xs text-slate-500 mb-6">
                Interested in onboarding your kitchen or non-profit? Send our coordination desk a message.
              </p>

              {contactSubmitted ? (
                <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center">
                  <div className="text-3xl mb-2">🎉</div>
                  <h4 className="text-sm font-bold text-emerald-900">Message Received!</h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    Thank you for contacting FoodRescue Network. Our community logistics team will respond to your email within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-700 mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="you@organization.org"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1">I Am Inquiring As *</label>
                    <select
                      value={contactForm.role}
                      onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="DONOR">Commercial Food Donor (Restaurant/Hotel)</option>
                      <option value="RECIPIENT">Recipient Organization (NGO/Shelter)</option>
                      <option value="VOLUNTEER">Volunteer Logistics Driver</option>
                      <option value="PARTNER">Corporate CSR / Government Partner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1">Message or Questions *</label>
                    <textarea
                      rows="4"
                      required
                      placeholder="Tell us about your daily surplus, shelter capacity, or operational location..."
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all text-xs"
                  >
                    Send Message to Coordination Desk
                  </button>
                </form>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4 text-slate-500 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block">Hub Location</span>
                  <span>Bengaluru Central, Karnataka</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Support Desk</span>
                  <span>support@foodrescue.org</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
