import React from 'react';

export default function Navbar({ currentUser, activeTab, setActiveTab, onRoleChange, onOpenAuthModal }) {
  const roles = [
    { key: 'DONOR', label: 'Food Donor', icon: '🏪', color: 'bg-emerald-600' },
    { key: 'RECIPIENT', label: 'NGO Recipient', icon: '💚', color: 'bg-teal-600' },
    { key: 'VOLUNTEER', label: 'Volunteer Rider', icon: '🚚', color: 'bg-amber-600' },
    { key: 'ADMIN', label: 'Platform Admin', icon: '🛡️', color: 'bg-purple-600' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">FoodRescue</span>
                <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Network</span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Connecting surplus food with people who need it</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Role Portal
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'map' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>🗺️</span> Surplus Map
            </button>
            <button
              onClick={() => setActiveTab('forecast')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'forecast' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>📈</span> Demand Forecast
            </button>
            <button
              onClick={() => setActiveTab('scenario')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'scenario' ? 'bg-amber-100 text-amber-800 font-bold' : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <span>⚡</span> Demo Scenario
            </button>
          </nav>

          {/* Role Quick Switcher & User Profile */}
          <div className="flex items-center gap-3">
            {/* Quick Role Switcher Pill */}
            <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              {roles.map((r) => (
                <button
                  key={r.key}
                  onClick={() => onRoleChange(r.key)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all ${
                    currentUser?.role === r.key
                      ? 'bg-white text-slate-900 shadow-sm font-bold border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={`Switch to ${r.label}`}
                >
                  <span>{r.icon}</span>
                  <span>{r.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {currentUser.first_name || currentUser.username}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-emerald-600">
                    {currentUser.role}
                  </div>
                </div>
                <button
                  onClick={onOpenAuthModal}
                  className="w-9 h-9 rounded-full bg-slate-200 border-2 border-emerald-500 flex items-center justify-center text-xs font-bold text-slate-700 hover:opacity-90"
                  title="Account Settings / Switch"
                >
                  {currentUser.username.substring(0, 2).toUpperCase()}
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-sm hover:bg-emerald-700"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
