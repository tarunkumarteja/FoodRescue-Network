import React, { useState } from 'react';
import { api } from '../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, currentRole, onRoleSwitch }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('donor_restaurant');
  const [password, setPassword] = useState('Donor@123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Register state
  const [regData, setRegData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'RECIPIENT',
    phone_number: '',
    organization_name: '',
    organization_address: '',
    organization_capacity: 100,
  });

  if (!isOpen) return null;

  const quickPersonas = [
    { role: 'DONOR', name: 'Royal Spice Restaurant', username: 'donor_restaurant', pass: 'Donor@123', icon: '🏪' },
    { role: 'RECIPIENT', name: 'Asha Jyothi Children Home', username: 'recipient_ngo', pass: 'Recipient@123', icon: '💚' },
    { role: 'VOLUNTEER', name: 'Arun Teja (Logistics)', username: 'volunteer_rider', pass: 'Volunteer@123', icon: '🚚' },
    { role: 'ADMIN', name: 'Priya Sharma (Admin)', username: 'admin', pass: 'Admin@123', icon: '🛡️' },
  ];

  const handleQuickLogin = async (persona) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await api.login(persona.username, persona.pass);
      onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await api.login(username, password);
      onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await api.register(regData);
      // Auto login after register
      const loginData = await api.login(regData.username, regData.password);
      onAuthSuccess(loginData.user);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              {isRegister ? 'Create FoodRescue Account' : 'Sign In to FoodRescue Network'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure role-based access with SimpleJWT authentication
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl mb-4 font-semibold">
            {errorMsg}
          </div>
        )}

        {/* 1-Click Demo Persona Switcher */}
        {!isRegister && (
          <div className="mb-6 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-2.5">
              Quick 1-Click Demo Personas:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {quickPersonas.map((p) => (
                <button
                  key={p.username}
                  onClick={() => handleQuickLogin(p)}
                  disabled={loading}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-sm text-left transition-all"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <span>{p.icon}</span>
                    <span className="truncate">{p.name.split(' ')[0]}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">
                    Role: {p.role}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {isRegister ? (
          /* Registration Form */
          <form onSubmit={handleRegister} className="space-y-3 text-xs font-semibold">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={regData.username}
                  onChange={(e) => setRegData({ ...regData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={regData.email}
                  onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={regData.password}
                  onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">Role *</label>
                <select
                  value={regData.role}
                  onChange={(e) => setRegData({ ...regData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="DONOR">Food Donor (Restaurant / Hotel)</option>
                  <option value="RECIPIENT">Food Recipient (NGO / Shelter)</option>
                  <option value="VOLUNTEER">Volunteer Logistics Rider</option>
                </select>
              </div>
            </div>

            {['DONOR', 'RECIPIENT'].includes(regData.role) && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-[11px] font-black uppercase text-emerald-800">
                  Organization Details (Subject to Admin Verification)
                </span>
                <div>
                  <label className="block text-slate-700 mb-1">Organization / Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Care Foundation or Grand Palace Banquet"
                    value={regData.organization_name}
                    onChange={(e) => setRegData({ ...regData, organization_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Official Address *</label>
                  <input
                    type="text"
                    required
                    value={regData.organization_address}
                    onChange={(e) => setRegData({ ...regData, organization_address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="text-xs text-emerald-700 font-bold hover:underline"
              >
                ← Back to Login
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20"
              >
                {loading ? 'Registering...' : 'Register Organization'}
              </button>
            </div>
          </form>
        ) : (
          /* Regular Login Form */
          <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-700 mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="text-xs text-slate-600 font-bold hover:underline"
              >
                Need an account? Register →
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
