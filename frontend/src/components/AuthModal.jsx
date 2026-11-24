import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
  initialRole = 'DONOR'
}) {
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Register state
  const [regData, setRegData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: initialRole || 'DONOR',
    phone_number: '',
    organization_name: '',
    organization_address: '',
    organization_capacity: 100,
  });

  useEffect(() => {
    setIsRegister(initialMode === 'register');
    if (initialRole) {
      setRegData(prev => ({ ...prev, role: initialRole }));
    }
    setErrorMsg('');
    setSuccessMsg('');
  }, [initialMode, initialRole, isOpen]);

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
      setErrorMsg(err.message || 'Authentication failed');
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
      setErrorMsg(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await api.register(regData);
      setSuccessMsg('Account created successfully! Logging you in...');
      // Automatically log in after registration
      const loginData = await api.login(regData.username, regData.password);
      setTimeout(() => {
        onAuthSuccess(loginData.user);
        onClose();
      }, 500);
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8 max-h-[92vh] overflow-y-auto">
        {/* Header with Close */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-base font-black shadow-md shadow-emerald-600/20">
              🌱
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {isRegister ? 'Join FoodRescue Network' : 'Welcome Back'}
              </h3>
              <p className="text-xs text-slate-500">
                {isRegister ? 'Register your organization or volunteer profile' : 'Sign in to access your role workspace'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Toggle: Sign In vs Register */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              !isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl mb-4 font-semibold flex items-start gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl mb-4 font-semibold flex items-start gap-2">
            <span>✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1-Click Demo Personas (Visible in Login Mode) */}
        {!isRegister && (
          <div className="mb-6 bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                ⚡ 1-Click Demo Evaluation Accounts:
              </span>
              <span className="text-[10px] text-slate-400">Pre-seeded & tested</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickPersonas.map((p) => (
                <button
                  key={p.username}
                  type="button"
                  onClick={() => handleQuickLogin(p)}
                  disabled={loading}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-sm text-left transition-all group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                    <span>{p.icon}</span>
                    <span className="truncate">{p.name.split(' ')[0]}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">
                    {p.role}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* LOGIN FORM */}
        {/* ----------------------------------------------------------------- */}
        {!isRegister ? (
          <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-700 mb-1">Username or Account ID</label>
              <input
                type="text"
                required
                placeholder="e.g. donor_restaurant"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="text-xs text-emerald-700 font-bold hover:underline"
              >
                Need an account? Register →
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all text-xs"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>
          </form>
        ) : (
          /* ----------------------------------------------------------------- */
          /* REGISTRATION FORM */
          /* ----------------------------------------------------------------- */
          <form onSubmit={handleRegister} className="space-y-3.5 text-xs font-semibold">
            <div>
              <label className="block text-slate-700 mb-1">Select Your Platform Role *</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'DONOR', label: 'Food Donor', icon: '🏪' },
                  { key: 'RECIPIENT', label: 'NGO / Shelter', icon: '💚' },
                  { key: 'VOLUNTEER', label: 'Volunteer Rider', icon: '🚚' },
                ].map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRegData({ ...regData, role: r.key })}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      regData.role === r.key
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-lg">{r.icon}</div>
                    <div className="text-[11px] mt-0.5">{r.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. green_caterer"
                  value={regData.username}
                  onChange={(e) => setRegData({ ...regData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="contact@org.com"
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
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={regData.password}
                  onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98450 12345"
                  value={regData.phone_number}
                  onChange={(e) => setRegData({ ...regData, phone_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Organization Specifics (For Donors and Recipients) */}
            {['DONOR', 'RECIPIENT'].includes(regData.role) && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
                  Organization Verification Info
                </span>

                <div>
                  <label className="block text-slate-700 mb-1">
                    {regData.role === 'DONOR' ? 'Restaurant / Business Entity Name *' : 'NGO / Shelter Registered Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hope Orphanage Home or Royal Kitchen"
                    value={regData.organization_name}
                    onChange={(e) => setRegData({ ...regData, organization_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Physical Operating Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Street address, Area, Bengaluru"
                    value={regData.organization_address}
                    onChange={(e) => setRegData({ ...regData, organization_address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Already registered? Sign In
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all text-xs"
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
