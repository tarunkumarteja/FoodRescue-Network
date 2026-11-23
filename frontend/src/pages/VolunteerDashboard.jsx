import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function VolunteerDashboard({ currentUser, onRefresh }) {
  const [deliveries, setDeliveries] = useState([]);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [modalType, setModalType] = useState(null); // 'DONOR_OTP' or 'RECIPIENT_OTP' or 'QR_SCAN'
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    try {
      const data = await api.getDeliveries();
      setDeliveries(data || []);
      if (data && data.length > 0 && !selectedPickup) {
        setSelectedPickup(data[0]);
      }
    } catch (err) {
      console.warn("Could not load deliveries:", err);
    }
  };

  const handleClaimTask = async (pickupId) => {
    try {
      await api.claimDeliveryTask(pickupId);
      setStatusMsg('Delivery claimed! Proceed to donor location.');
      loadDeliveries();
      onRefresh();
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  const handleVerifyDonorOtp = async () => {
    if (!selectedPickup) return;
    setVerifying(true);
    setStatusMsg('');
    try {
      await api.verifyDonorPickup(selectedPickup.id, otpInput);
      setStatusMsg('✓ Donor handover confirmed! Food collected into transport bags.');
      setModalType(null);
      setOtpInput('');
      loadDeliveries();
      onRefresh();
    } catch (err) {
      setStatusMsg(`Verification Failed: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyRecipientOtp = async () => {
    if (!selectedPickup) return;
    setVerifying(true);
    setStatusMsg('');
    try {
      await api.verifyRecipientDelivery(selectedPickup.id, otpInput);
      setStatusMsg('✓ Delivery successfully completed and acknowledged by recipient NGO!');
      setModalType(null);
      setOtpInput('');
      loadDeliveries();
      onRefresh();
    } catch (err) {
      setStatusMsg(`Delivery Verification Failed: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
              Volunteer Rider Operations
            </span>
            <span className="text-xs text-slate-500 font-medium">Logistics & Handover Verification</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            {currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}` : 'Arun Teja'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Transporting surplus food with zero delay. Confirm handovers securely via 6-digit OTP or QR codes.
          </p>
        </div>

        <button
          onClick={loadDeliveries}
          className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          ↻ Refresh Dispatches
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between ${
          statusMsg.includes('Failed') || statusMsg.includes('Error')
            ? 'bg-rose-50 border border-rose-200 text-rose-800'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
        }`}>
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')} className="hover:opacity-75">✕</button>
        </div>
      )}

      {/* Deliveries List & Interactive Handover Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Delivery Dispatches */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Active Dispatches ({deliveries.length})
          </h3>

          {deliveries.length === 0 ? (
            <p className="text-xs text-slate-400 p-6 bg-white rounded-2xl border border-slate-200/80 text-center">
              No delivery requests currently pending.
            </p>
          ) : (
            deliveries.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPickup(p)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedPickup?.id === p.id
                    ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Dispatch #{p.id}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    p.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                    p.status === 'PICKED_UP' ? 'bg-blue-100 text-blue-800' :
                    p.status === 'ASSIGNED' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {p.status}
                  </span>
                </div>

                <h4 className="font-extrabold text-slate-900 text-sm">{p.listing_title}</h4>
                <div className="text-xs font-bold text-amber-700 mt-0.5">
                  {p.listing_quantity} {p.unit_of_measure}
                </div>

                <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                  <p>🏪 From: {p.donor_name || 'Restaurant'}</p>
                  <p>💚 To: {p.recipient_name || 'NGO Shelter'}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Handover Verification Console */}
        <div className="lg:col-span-2">
          {selectedPickup ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                    Logistics Order #{selectedPickup.id}
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-1">
                    {selectedPickup.listing_title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Transporting {selectedPickup.listing_quantity} {selectedPickup.unit_of_measure}
                  </p>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                  selectedPickup.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                  selectedPickup.status === 'PICKED_UP' ? 'bg-blue-100 text-blue-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  ● {selectedPickup.status.replace('_', ' ')}
                </span>
              </div>

              {/* 4-Step Handover Stepper */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className={`p-2.5 rounded-xl border ${
                  ['ASSIGNED', 'PICKED_UP', 'DELIVERED'].includes(selectedPickup.status)
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  1. Assigned
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  ['PICKED_UP', 'DELIVERED'].includes(selectedPickup.status)
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                    : selectedPickup.status === 'ASSIGNED'
                    ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold animate-pulse'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  2. At Donor
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  ['PICKED_UP', 'DELIVERED'].includes(selectedPickup.status)
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  3. In Transit
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  selectedPickup.status === 'DELIVERED'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  4. Delivered
                </div>
              </div>

              {/* Route Details Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Donor Pickup Location */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Pickup From
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      OTP: {selectedPickup.donor_otp || '482910'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedPickup.donor_name}</h4>
                  <p className="text-xs text-slate-500 mt-1">📍 {selectedPickup.pickup_address}</p>
                  <p className="text-xs text-slate-500">📞 {selectedPickup.donor_phone}</p>
                </div>

                {/* Recipient Drop-off Location */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                      Deliver To
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      OTP: {selectedPickup.recipient_otp || '619340'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedPickup.recipient_name}</h4>
                  <p className="text-xs text-slate-500 mt-1">📍 {selectedPickup.recipient_address}</p>
                  <p className="text-xs text-slate-500">📞 {selectedPickup.recipient_phone}</p>
                </div>
              </div>

              {/* Action Buttons for Handover Verification */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm">Handover Verification Protocol</h4>
                  <p className="text-xs text-slate-400">Secure confirmation prevents missing parcels & dispute claims.</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {selectedPickup.status === 'ASSIGNED' && (
                    <button
                      onClick={() => {
                        setModalType('DONOR_OTP');
                        setOtpInput(selectedPickup.donor_otp || '482910');
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md uppercase tracking-wider"
                    >
                      Verify Donor Handover (OTP)
                    </button>
                  )}

                  {selectedPickup.status === 'PICKED_UP' && (
                    <button
                      onClick={() => {
                        setModalType('RECIPIENT_OTP');
                        setOtpInput(selectedPickup.recipient_otp || '619340');
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl shadow-md uppercase tracking-wider"
                    >
                      Confirm Drop-off (Recipient OTP)
                    </button>
                  )}

                  {selectedPickup.status === 'DELIVERED' && (
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs bg-emerald-950/60 border border-emerald-800 px-4 py-2 rounded-xl">
                      <span>✓</span>
                      <span>Delivery Successfully Completed</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Audit Event History */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Delivery Audit Trail
                </h4>
                <div className="space-y-2">
                  {(selectedPickup.events || []).map((ev) => (
                    <div key={ev.id} className="text-xs p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{ev.event_type.replace('_', ' ')}</span>
                        <p className="text-slate-500 text-[11px] mt-0.5">{ev.notes}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 shadow-sm">
              Select a dispatch on the left to manage pickup verification.
            </div>
          )}
        </div>
      </div>

      {/* OTP Verification Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl mx-auto mb-3 font-bold">
              🔐
            </div>
            <h3 className="text-lg font-black text-slate-900">
              {modalType === 'DONOR_OTP' ? 'Donor Handover OTP' : 'Recipient Drop-off OTP'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {modalType === 'DONOR_OTP'
                ? 'Enter the 6-digit code shown on the food donor\'s dashboard.'
                : 'Enter the 6-digit delivery acknowledgment code from the recipient NGO.'}
            </p>

            <div className="my-5">
              <input
                type="text"
                maxLength="6"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                className="w-full text-center tracking-[0.5em] font-mono text-2xl font-black py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="482910"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Demo helper: Pre-filled with valid OTP
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setModalType(null)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-xs text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={modalType === 'DONOR_OTP' ? handleVerifyDonorOtp : handleVerifyRecipientOtp}
                disabled={verifying}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs shadow-md"
              >
                {verifying ? 'Verifying...' : 'Confirm OTP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
