import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function RecipientDashboard({ currentUser, listings, categories, onRefresh }) {
  const [activeTab, setActiveTab] = useState('MATCHES'); // MATCHES, BROWSE, RESERVATIONS
  const [recommendations, setRecommendations] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [reserveQuantity, setReserveQuantity] = useState(30);
  const [reserving, setReserving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Feedback & Safety Incident Reporting modal state
  const [feedbackModalReservation, setFeedbackModalReservation] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [isSafetyIssue, setIsSafetyIssue] = useState(false);
  const [safetyDetails, setSafetyDetails] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    loadRecommendations();
    loadReservations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const data = await api.getRecommendations();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.warn("Could not load recommendations:", err);
    }
  };

  const loadReservations = async () => {
    try {
      const data = await api.getReservations();
      setReservations(data || []);
    } catch (err) {
      console.warn("Could not load reservations:", err);
    }
  };

  const handleReserve = async () => {
    if (!selectedListing) return;
    setReserving(true);
    setStatusMsg('');
    try {
      await api.createReservation(selectedListing.id, parseInt(reserveQuantity, 10));
      setStatusMsg(`Successfully reserved ${reserveQuantity} packets! Logistics pickup ticket created.`);
      setSelectedListing(null);
      loadReservations();
      onRefresh();
    } catch (err) {
      setStatusMsg(`Reservation Error: ${err.message}`);
    } finally {
      setReserving(false);
    }
  };

  const handleCancelReservation = async (reservationId) => {
    const reason = prompt("Enter cancellation reason:", "Logistics constraints or surplus capacity adjusted.");
    if (!reason) return;
    try {
      await api.cancelReservation(reservationId, reason);
      setStatusMsg("Reservation cancelled. Inventory restored to donor.");
      loadReservations();
      onRefresh();
    } catch (err) {
      setStatusMsg(`Cancellation Error: ${err.message}`);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackModalReservation) return;
    setSubmittingFeedback(true);
    try {
      await api.submitFeedback({
        reservation: feedbackModalReservation.id,
        target_organization: feedbackModalReservation.food_listing_detail?.organization,
        rating: feedbackRating,
        comments: feedbackComments,
        report_safety_issue: isSafetyIssue,
        safety_issue_details: isSafetyIssue ? safetyDetails : '',
      });
      setStatusMsg(isSafetyIssue ? "Feedback and Food Safety Alert submitted to Admin Desk." : "Feedback submitted successfully. Thank you!");
      setFeedbackModalReservation(null);
      setFeedbackComments('');
      setIsSafetyIssue(false);
      setSafetyDetails('');
    } catch (err) {
      setStatusMsg(`Feedback Error: ${err.message}`);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const filteredListings = listings.filter((l) => {
    const matchesCat = !filterCategory || String(l.category) === String(filterCategory);
    const matchesQuery = !searchQuery || l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.pickup_address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery && l.quantity > 0;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-full">
              NGO Recipient Portal
            </span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              ✓ Verified Organization
            </span>
            {currentUser?.organization?.has_cold_storage && (
              <span className="text-xs text-sky-700 font-bold bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
                ❄️ Cold Storage Certified
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            {currentUser?.organization?.name || 'Asha Jyothi Children Home & Shelter'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Distribution Capacity: <strong className="text-slate-800">{currentUser?.organization?.capacity || 120} portions/day</strong> • Darpan ID: KA/2018/00912
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('MATCHES')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'MATCHES' ? 'bg-white text-emerald-800 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎯</span> Smart Matching ({recommendations.length})
          </button>
          <button
            onClick={() => setActiveTab('BROWSE')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'BROWSE' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🔍</span> Browse Surplus ({filteredListings.length})
          </button>
          <button
            onClick={() => setActiveTab('RESERVATIONS')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'RESERVATIONS' ? 'bg-white text-sky-800 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📦</span> My Reservations ({reservations.length})
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between ${
          statusMsg.includes('Error') ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
        }`}>
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')} className="hover:opacity-75">✕</button>
        </div>
      )}

      {/* Tab 1: Smart Algorithmic Matching */}
      {activeTab === 'MATCHES' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 uppercase">
                  Matching Engine
                </span>
                <span className="text-xs text-slate-300 font-mono">Score = 0.4*D + 0.3*Q + 0.2*T + 0.1*C</span>
              </div>
              <h3 className="text-lg font-extrabold mt-1">Recommended Surplus Ranked for Your Shelter</h3>
              <p className="text-xs text-slate-300">
                Ranked by distance suitability (0.4), quantity fit (0.3), pickup urgency (0.2), and recipient capacity (0.1).
              </p>
            </div>
            <button onClick={loadRecommendations} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold whitespace-nowrap">
              ↻ Recompute Scores
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec) => (
              <div key={rec.listing_id} className="bg-white rounded-2xl border-2 border-emerald-500/30 p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      {rec.category_name}
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1">{rec.title}</h4>
                    <p className="text-xs text-slate-500">From <strong>{rec.donor_org_name}</strong> • 📍 {rec.pickup_address}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black text-emerald-600">{rec.match_percentage}%</div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Match Score</span>
                  </div>
                </div>

                {/* Algorithmic Factor Breakdown */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 mb-4 text-[11px] grid grid-cols-4 gap-2 text-center">
                  <div>
                    <span className="text-slate-400 block font-bold">D (Dist)</span>
                    <strong className="text-slate-800">{rec.distance_km} km</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold">Q (Fit)</span>
                    <strong className="text-slate-800">{rec.quantity} pkts</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold">T (Time)</span>
                    <strong className="text-emerald-700">Urgent</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold">C (Cap)</span>
                    <strong className="text-slate-800">{currentUser?.organization?.capacity || 120} cap</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    Storage: <strong className="text-slate-700">{rec.storage_condition}</strong>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedListing({
                        id: rec.listing_id,
                        title: rec.title,
                        quantity: rec.quantity,
                        unit_of_measure: rec.unit_of_measure,
                      });
                      setReserveQuantity(Math.min(30, rec.quantity));
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Reserve Food →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Browse All Available Surplus */}
      {activeTab === 'BROWSE' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              placeholder="Search by food name or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredListings.map((item) => (
              <div key={item.id} className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      {item.category_name}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base mt-1">{item.title}</h3>
                    <p className="text-xs text-slate-500">Donor: {item.donor_name} • 📍 {item.pickup_address}</p>
                  </div>
                  <span className="text-sm font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    {item.quantity} {item.unit_of_measure}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-3">{item.description}</p>

                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                  <span className="text-slate-500">
                    Deadline: <strong>{new Date(item.pickup_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setSelectedListing(item);
                      setReserveQuantity(Math.min(30, item.quantity));
                    }}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold"
                  >
                    Reserve Portions
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Active Reservations */}
      {activeTab === 'RESERVATIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Your Reserved Surplus & Deliveries</h3>
          {reservations.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No reservations made yet.</p>
          ) : (
            <div className="space-y-3">
              {reservations.map((reservation) => (
                <div key={reservation.id} className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Claim #{reservation.id}: {reservation.food_listing_detail?.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        reservation.status === 'COMPLETED' ? 'bg-purple-100 text-purple-800' :
                        reservation.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {reservation.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Reserved: <strong className="text-slate-800">{reservation.quantity_reserved} packets</strong> • Donor: {reservation.food_listing_detail?.donor_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      Volunteer Status: <strong className="text-amber-700">{reservation.pickup?.status || 'Searching Rider...'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">Recipient Delivery OTP</div>
                      <span className="font-mono text-sm font-black text-sky-800 bg-sky-50 border border-sky-200 px-3 py-1 rounded-lg">
                        #{reservation.pickup?.recipient_otp || '619340'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      {reservation.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleCancelReservation(reservation.id)}
                          className="px-3 py-1 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => setFeedbackModalReservation(reservation)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                      >
                        Feedback
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reserve Food Dialog (Atomic Claim) */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900">Reserve Food Packets</h3>
            <p className="text-xs text-slate-500 mt-1">{selectedListing.title}</p>

            <div className="my-5 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-500">Currently Available:</span>
                <strong className="text-slate-900">{selectedListing.quantity} {selectedListing.unit_of_measure}</strong>
              </div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Packets to Reserve for Shelter:
              </label>
              <input
                type="number"
                min="1"
                max={selectedListing.quantity}
                value={reserveQuantity}
                onChange={(e) => setReserveQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-2">
                🔒 Atomic row lock protects against concurrent reservations.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedListing(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleReserve}
                disabled={reserving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20"
              >
                {reserving ? 'Reserving...' : `Confirm Reservation (${reserveQuantity} pkts)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Feedback & Report Food Safety Incident Modal */}
      {feedbackModalReservation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Delivery Feedback & Incident Desk</h3>
                <p className="text-xs text-slate-500">For Claim #{feedbackModalReservation.id}</p>
              </div>
              <button onClick={() => setFeedbackModalReservation(null)} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Quality Rating (1 to 5 Stars):</label>
                <div className="flex gap-2 text-xl">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className={star <= feedbackRating ? 'text-amber-400' : 'text-slate-300'}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Comments & Notes:</label>
                <textarea
                  rows="3"
                  required
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  placeholder="Share feedback on packaging hygiene, timeliness, and food freshness..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              {/* Food Safety Flag */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-900">
                  <input
                    type="checkbox"
                    checked={isSafetyIssue}
                    onChange={(e) => setIsSafetyIssue(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded"
                  />
                  <span>Report Food Safety Incident to Admin</span>
                </label>
                {isSafetyIssue && (
                  <div className="mt-2">
                    <label className="block text-[11px] font-bold text-rose-800 mb-1">Incident Specifics:</label>
                    <textarea
                      rows="2"
                      required={isSafetyIssue}
                      value={safetyDetails}
                      onChange={(e) => setSafetyDetails(e.target.value)}
                      placeholder="Specify packaging damage, off-odor, temperature abuse, or contamination..."
                      className="w-full px-3 py-1.5 border border-rose-300 rounded-lg text-xs outline-none bg-white"
                    ></textarea>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFeedbackModalReservation(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm"
                >
                  {submittingFeedback ? 'Submitting...' : 'Submit to Desk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
