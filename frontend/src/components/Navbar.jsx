import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Navbar({
  currentUser,
  activeTab,
  setActiveTab,
  onRoleChange,
  onOpenLogin,
  onOpenRegister,
  onSelectDemoPersona,
  onLogout
}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roles = [
    { key: 'DONOR', label: 'Food Donor', icon: '🏪', color: 'bg-emerald-600' },
    { key: 'RECIPIENT', label: 'NGO Recipient', icon: '💚', color: 'bg-teal-600' },
    { key: 'VOLUNTEER', label: 'Volunteer Rider', icon: '🚚', color: 'bg-amber-600' },
    { key: 'ADMIN', label: 'Platform Admin', icon: '🛡️', color: 'bg-purple-600' },
  ];

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 20000); // 20s poll
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const loadNotifications = async () => {
    try {
      const [list, countRes] = await Promise.all([
        api.getNotifications().catch(() => []),
        api.getUnreadCount().catch(() => ({ unread_count: 0 }))
      ]);
      setNotifications(list.slice(0, 8));
      setUnreadCount(countRes.unread_count || 0);
    } catch (e) {
      // quiet fail
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkOne = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const scrollToSection = (sectionId) => {
    setMobileMenuOpen(false);
    if (currentUser) {
      // If logged in, navigate back to public home view if requested
      setActiveTab('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              if (currentUser) setActiveTab('dashboard');
              else scrollToSection('home');
            }}
          >
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

          {/* ------------------------------------------------------------- */}
          {/* NAVIGATION LINKS (Public vs Authenticated) */}
          {/* ------------------------------------------------------------- */}
          {currentUser ? (
            /* Authenticated Nav */
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'map' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>🗺️</span> Surplus Map
              </button>
              <button
                onClick={() => setActiveTab('forecast')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'forecast' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>📈</span> Forecast
              </button>
              <button
                onClick={() => setActiveTab('scenario')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'scenario' ? 'bg-amber-100 text-amber-800 font-bold' : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                <span>⚡</span> Demo Walkthrough
              </button>
            </nav>
          ) : (
            /* Public Nav */
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => scrollToSection('home')}
                className="px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-slate-50 transition-colors"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-slate-50 transition-colors"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-slate-50 transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-slate-50 transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className="px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-slate-50 transition-colors"
              >
                Contact
              </button>
            </nav>
          )}

          {/* ------------------------------------------------------------- */}
          {/* RIGHT CONTROLS: Switchers, Notifications, Login / Register */}
          {/* ------------------------------------------------------------- */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              /* Authenticated Controls */
              <>
                {/* Quick Role Switcher Pill */}
                <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {roles.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => onRoleChange(r.key)}
                      className={`px-2 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all ${
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

                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setNotifOpen(!notifOpen);
                      setProfileMenuOpen(false);
                    }}
                    className="relative p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                    title="Notifications"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">Notifications ({unreadCount} new)</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => handleMarkOne(n.id)}
                              className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                                !n.is_read ? 'bg-emerald-50/50 font-medium' : 'text-slate-600'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-800">{n.title}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-600 leading-snug">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Profile Pill & Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(!profileMenuOpen);
                      setNotifOpen(false);
                    }}
                    className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all"
                  >
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        {currentUser.first_name || currentUser.username}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-emerald-600">
                        {currentUser.role}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
                      {currentUser.username.substring(0, 2).toUpperCase()}
                    </div>
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Profile Menu Dropdown */}
                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="font-bold text-slate-900">{currentUser.first_name || currentUser.username} {currentUser.last_name || ''}</p>
                        <p className="text-slate-500 text-[11px] truncate">{currentUser.email}</p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                            {currentUser.role}
                          </span>
                          {currentUser.organization && (
                            <span className="text-[10px] text-slate-500 font-medium truncate">
                              • {currentUser.organization.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-2 border-b border-slate-100">
                        <button
                          onClick={() => {
                            setActiveTab('dashboard');
                            setProfileMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                        >
                          Role Portal
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('landing');
                            setProfileMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                        >
                          View Public Website
                        </button>
                      </div>

                      <div className="p-2">
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold flex items-center justify-between"
                        >
                          <span>Log Out</span>
                          <span>↪</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Public Auth Controls */
              <div className="flex items-center gap-2">
                {/* 1-Click Demo Personas Button */}
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                    className="px-3 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <span>⚡</span>
                    <span>Demo Personas</span>
                  </button>

                  {demoMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 block">
                        Instant 1-Click Login:
                      </span>
                      {roles.map((r) => (
                        <button
                          key={r.key}
                          onClick={() => {
                            setDemoMenuOpen(false);
                            onSelectDemoPersona(r.key);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium text-slate-800"
                        >
                          <span>{r.icon}</span>
                          <span>{r.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sign In Button */}
                <button
                  onClick={onOpenLogin}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Sign In
                </button>

                {/* Sign Up / Register Button */}
                <button
                  onClick={() => onOpenRegister()}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all transform hover:-translate-y-0.5"
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          {currentUser ? (
            <>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-xs text-slate-900">{currentUser.first_name || currentUser.username}</p>
                  <p className="text-[10px] text-emerald-700 font-bold uppercase">{currentUser.role}</p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  Log Out
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center ${
                    activeTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    setActiveTab('map');
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center ${
                    activeTab === 'map' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Surplus Map
                </button>
                <button
                  onClick={() => {
                    setActiveTab('forecast');
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center ${
                    activeTab === 'forecast' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Demand Forecast
                </button>
                <button
                  onClick={() => {
                    setActiveTab('scenario');
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center ${
                    activeTab === 'scenario' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Demo Scenario
                </button>
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Switch Persona:</span>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => {
                        onRoleChange(r.key);
                        setMobileMenuOpen(false);
                      }}
                      className="p-2 rounded-xl border border-slate-200 text-xs text-left font-semibold flex items-center gap-1.5"
                    >
                      <span>{r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => scrollToSection('home')}
                className="w-full text-left py-2 text-sm font-semibold text-slate-700 hover:text-emerald-700"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="w-full text-left py-2 text-sm font-semibold text-slate-700 hover:text-emerald-700"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="w-full text-left py-2 text-sm font-semibold text-slate-700 hover:text-emerald-700"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="w-full text-left py-2 text-sm font-semibold text-slate-700 hover:text-emerald-700"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className="w-full text-left py-2 text-sm font-semibold text-slate-700 hover:text-emerald-700"
              >
                Contact
              </button>

              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-800"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenRegister();
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                >
                  Sign Up (Register)
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
