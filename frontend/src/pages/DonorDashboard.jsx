import React, { useState } from 'react';
import { api } from '../api';

export default function DonorDashboard({ currentUser, listings, categories, onRefresh }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: categories[0]?.id || 1,
    quantity: 30,
    unit_of_measure: 'packets',
    prepared_at: new Date().toISOString().slice(0, 16),
    pickup_deadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16),
    storage_condition: 'Hot / Heated (>60°C)',
    allergens_present: ['Dairy'],
    handling_instructions: 'Keep warm in sealed containers.',
    pickup_address: currentUser?.organization?.address || '12 Residency Road, Bengaluru',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreateListing = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await api.createListing({
        ...formData,
        category: parseInt(formData.category, 10),
        quantity: parseInt(formData.quantity, 10),
        latitude: 12.9716,
        longitude: 77.6006,
      });
      setSuccessMsg('Surplus food listed successfully! Nearby verified NGOs have been notified.');
      setShowAddModal(false);
      onRefresh();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const allergenOptions = ['Dairy', 'Gluten', 'Nuts', 'Soy', 'Eggs', 'None'];

  return (
    <div className="space-y-6">
      {/* Donor Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Donor Workspace
            </span>
            <span className="text-xs text-slate-500 font-medium">FSSAI Audited</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            {currentUser?.organization?.name || 'Royal Spice Restaurant & Banquets'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Turn your kitchen's surplus food into smiles. List surplus portions with pickup windows and safety specs.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
        >
          <span className="text-lg">+</span>
          <span>List Surplus Food</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm font-semibold flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* Active Listings Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Active Surplus Listings</h2>
            <p className="text-xs text-slate-500">Real-time status, claims, and remaining packet count</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {listings.length} Listings
          </span>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-base font-semibold">No active surplus food listed right now.</p>
            <p className="text-xs mt-1">Click "+ List Surplus Food" above to post fresh edible surplus.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map((item) => (
              <div key={item.id} className="border border-slate-200 rounded-xl p-5 hover:border-emerald-300 transition-all bg-slate-50/50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      {item.category_name}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base mt-1.5 leading-snug">{item.title}</h3>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    item.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' :
                    item.status === 'PARTIALLY_RESERVED' ? 'bg-amber-100 text-amber-800' :
                    item.status === 'RESERVED' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                  {item.description || 'Nutritious surplus meal packaged hygienically for distribution.'}
                </p>

                {/* Packet Counter Progress */}
                <div className="bg-white p-3 rounded-lg border border-slate-200/80 mb-3">
                  <div className="flex justify-between items-baseline text-xs mb-1">
                    <span className="font-bold text-slate-700">Remaining Available:</span>
                    <span className="font-black text-emerald-700 text-sm">
                      {item.quantity} / {item.initial_quantity} {item.unit_of_measure}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.round((item.quantity / item.initial_quantity) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mb-3">
                  <div>
                    <span className="text-slate-400 block">Pickup Deadline:</span>
                    <strong className="text-slate-800">
                      {new Date(item.pickup_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({item.hours_left}h left)
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Storage:</span>
                    <strong className="text-slate-800">{item.storage_condition}</strong>
                  </div>
                </div>

                {/* Verification Handover OTP helper for Slide 12 */}
                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span>📍</span>
                    <span className="truncate max-w-[170px]">{item.pickup_address}</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-emerald-800 font-mono font-bold text-xs">
                    Handover OTP: 482910
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Surplus Food Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">List Surplus Food</h3>
                <p className="text-xs text-slate-500">Declare portion quantities, storage, and safety window</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl mb-4 font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateListing} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">Food Item Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Buffet Surplus: Paneer Butter Masala & Roti"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Quantity (Packets) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Storage Condition *</label>
                  <select
                    value={formData.storage_condition}
                    onChange={(e) => setFormData({ ...formData, storage_condition: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Hot / Heated (>60°C)">Hot / Heated (&gt;60°C)</option>
                    <option value="Refrigerated (<5°C)">Refrigerated (&lt;5°C)</option>
                    <option value="Room Temperature (Ambient)">Room Temperature (Ambient)</option>
                    <option value="Frozen (<-18°C)">Frozen (&lt;-18°C)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Pickup Deadline *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.pickup_deadline}
                    onChange={(e) => setFormData({ ...formData, pickup_deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Allergens Present</label>
                <div className="flex flex-wrap gap-2">
                  {allergenOptions.map((alg) => {
                    const isSelected = formData.allergens_present.includes(alg);
                    return (
                      <button
                        type="button"
                        key={alg}
                        onClick={() => {
                          if (alg === 'None') {
                            setFormData({ ...formData, allergens_present: ['None'] });
                          } else {
                            const filtered = formData.allergens_present.filter(x => x !== 'None');
                            if (isSelected) {
                              setFormData({ ...formData, allergens_present: filtered.filter(x => x !== alg) });
                            } else {
                              setFormData({ ...formData, allergens_present: [...filtered, alg] });
                            }
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {alg}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Pickup Address *</label>
                <input
                  type="text"
                  required
                  value={formData.pickup_address}
                  onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Kitchen Handling & Packaging Notes</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Packed in food-grade thermal containers. Enter via rear service driveway."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20"
                >
                  {loading ? 'Submitting...' : 'Post Surplus Food'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
