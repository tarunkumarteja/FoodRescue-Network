import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ImpactStats from './components/ImpactStats';
import MapView from './components/MapView';
import DemoScenarioRunner from './components/DemoScenarioRunner';
import AuthModal from './components/AuthModal';
import LandingPage from './pages/LandingPage';
import DonorDashboard from './pages/DonorDashboard';
import RecipientDashboard from './pages/RecipientDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DemandForecastView from './pages/DemandForecastView';
import { api, getCurrentUser } from './api';

export default function App() {
  const [currentUser, setUser] = useState(getCurrentUser());
  // If user is already logged in from previous session, go to dashboard; otherwise start at public landing page
  const [activeTab, setActiveTab] = useState(getCurrentUser() ? 'dashboard' : 'landing');
  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  
  // Auth Modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authRole, setAuthRole] = useState('DONOR');
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAppData();
  }, [currentUser]);

  const initializeAppData = async () => {
    setLoading(true);
    try {
      // 1. Fetch public analytics (available to both public landing page and authenticated portal)
      const analyticsData = await api.getAnalytics().catch(() => null);
      if (analyticsData) setStats(analyticsData);

      // 2. If authenticated, fetch private operational data
      if (currentUser) {
        await refreshPrivateData();
      } else {
        setListings([]);
        setOrganizations([]);
      }
    } catch (err) {
      console.warn("Error during initialization:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshPrivateData = async () => {
    try {
      const [analyticsData, listingsData, categoriesData, orgsData] = await Promise.all([
        api.getAnalytics().catch(() => null),
        api.getListings().catch(() => []),
        api.getCategories().catch(() => []),
        api.getOrganizations().catch(() => []),
      ]);
      if (analyticsData) setStats(analyticsData);
      if (listingsData) setListings(listingsData);
      if (categoriesData) setCategories(categoriesData);
      if (orgsData) setOrganizations(orgsData);
    } catch (err) {
      console.warn("Error refreshing operational data:", err);
    }
  };

  // Login handler
  const handleOpenLogin = () => {
    setAuthMode('login');
    setAuthModalOpen(true);
  };

  // Register handler with optional role preselection
  const handleOpenRegister = (role = 'DONOR') => {
    setAuthMode('register');
    setAuthRole(role);
    setAuthModalOpen(true);
  };

  // Quick 1-click persona login
  const handleSelectDemoPersona = async (targetRole) => {
    const roleCredentialMap = {
      DONOR: { user: 'donor_restaurant', pass: 'Donor@123' },
      RECIPIENT: { user: 'recipient_ngo', pass: 'Recipient@123' },
      VOLUNTEER: { user: 'volunteer_rider', pass: 'Volunteer@123' },
      ADMIN: { user: 'admin', pass: 'Admin@123' },
    };

    const creds = roleCredentialMap[targetRole];
    if (creds) {
      try {
        setLoading(true);
        const data = await api.login(creds.user, creds.pass);
        setUser(data.user);
        setActiveTab('dashboard');
        await refreshPrivateData();
      } catch (err) {
        console.error("Failed to login as demo persona:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Logout handler
  const handleLogout = () => {
    api.logout();
    setUser(null);
    setActiveTab('landing');
    setListings([]);
    setOrganizations([]);
  };

  // Protected route helper: only allow internal tabs if user is logged in
  const handleTabChange = (tabKey) => {
    if (!currentUser && tabKey !== 'landing') {
      handleOpenLogin();
      return;
    }
    setActiveTab(tabKey);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ------------------------------------------------------------- */}
      {/* Top Navigation Bar */}
      {/* ------------------------------------------------------------- */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onRoleChange={handleSelectDemoPersona}
        onOpenLogin={handleOpenLogin}
        onOpenRegister={handleOpenRegister}
        onSelectDemoPersona={handleSelectDemoPersona}
        onLogout={handleLogout}
      />

      {/* ------------------------------------------------------------- */}
      {/* Main Content Area */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 w-full">
        {/* PUBLIC EXPERIENCE (When unauthenticated OR when user explicitly views landing page) */}
        {(!currentUser || activeTab === 'landing') ? (
          <div>
            {/* If user is logged in but visiting the public landing page, show a quick return banner */}
            {currentUser && (
              <div className="bg-emerald-900 text-emerald-100 text-xs py-2 px-4 text-center font-bold flex items-center justify-center gap-3 border-b border-emerald-800">
                <span>Viewing Public Landing Page as <strong>{currentUser.username} ({currentUser.role})</strong></span>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                >
                  Return to Dashboard →
                </button>
              </div>
            )}

            <LandingPage
              stats={stats}
              onOpenLogin={handleOpenLogin}
              onOpenRegister={handleOpenRegister}
              onSelectDemoPersona={handleSelectDemoPersona}
            />
          </div>
        ) : (
          /* AUTHENTICATED EXPERIENCE (Protected Private Portal) */
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Top Impact Ticker */}
            <ImpactStats stats={stats} onRefresh={refreshPrivateData} />

            {/* Dynamic Authenticated Tab Content */}
            {activeTab === 'scenario' && (
              <DemoScenarioRunner
                onCompleteCycle={refreshPrivateData}
                onRoleSwitch={(role) => {
                  handleSelectDemoPersona(role);
                  setActiveTab('dashboard');
                }}
              />
            )}

            {activeTab === 'map' && (
              <MapView
                listings={listings}
                organizations={organizations}
                onSelectListing={(listing) => {
                  setActiveTab('dashboard');
                }}
              />
            )}

            {activeTab === 'forecast' && (
              <DemandForecastView />
            )}

            {activeTab === 'dashboard' && (
              <div>
                {currentUser?.role === 'DONOR' && (
                  <DonorDashboard
                    currentUser={currentUser}
                    listings={listings}
                    categories={categories}
                    onRefresh={refreshPrivateData}
                  />
                )}

                {currentUser?.role === 'RECIPIENT' && (
                  <RecipientDashboard
                    currentUser={currentUser}
                    listings={listings}
                    categories={categories}
                    onRefresh={refreshPrivateData}
                  />
                )}

                {currentUser?.role === 'VOLUNTEER' && (
                  <VolunteerDashboard
                    currentUser={currentUser}
                    onRefresh={refreshPrivateData}
                  />
                )}

                {currentUser?.role === 'ADMIN' && (
                  <AdminDashboard
                    currentUser={currentUser}
                    onRefresh={refreshPrivateData}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* Global Clean Footer */}
      {/* ------------------------------------------------------------- */}
      <footer className="bg-white border-t border-slate-200 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                🌱
              </div>
              <div>
                <span className="font-extrabold text-slate-900">FoodRescue Network</span>
                <span className="text-slate-400 ml-2">• Connecting surplus food with communities in need</span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-slate-600 font-medium">
              <button onClick={() => handleTabChange('landing')} className="hover:text-emerald-700">Public Home</button>
              {currentUser ? (
                <>
                  <button onClick={() => setActiveTab('dashboard')} className="hover:text-emerald-700">Dashboard</button>
                  <button onClick={() => setActiveTab('map')} className="hover:text-emerald-700">Surplus Map</button>
                  <button onClick={handleLogout} className="text-rose-600 font-bold hover:underline">Log Out</button>
                </>
              ) : (
                <>
                  <button onClick={handleOpenLogin} className="hover:text-emerald-700">Sign In</button>
                  <button onClick={() => handleOpenRegister('DONOR')} className="hover:text-emerald-700">Donate Food</button>
                  <button onClick={() => handleOpenRegister('RECIPIENT')} className="hover:text-emerald-700">Register Shelter</button>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
            <div>
              © 2026 FoodRescue Network. All rights reserved. Zero Waste & Food Safety Initiative.
            </div>
            <div className="flex items-center gap-3">
              <span>React 18</span>
              <span>•</span>
              <span>Django REST Framework</span>
              <span>•</span>
              <span>SimpleJWT</span>
              <span>•</span>
              <span>Leaflet Maps</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* Authentication Modal (Sign In / Register) */}
      {/* ------------------------------------------------------------- */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        initialRole={authRole}
        onAuthSuccess={(user) => {
          setUser(user);
          setActiveTab('dashboard');
          refreshPrivateData();
        }}
      />
    </div>
  );
}
