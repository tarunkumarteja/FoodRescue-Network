import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ImpactStats from './components/ImpactStats';
import MapView from './components/MapView';
import DemoScenarioRunner from './components/DemoScenarioRunner';
import AuthModal from './components/AuthModal';
import DonorDashboard from './pages/DonorDashboard';
import RecipientDashboard from './pages/RecipientDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DemandForecastView from './pages/DemandForecastView';
import { api, getCurrentUser, setCurrentUser } from './api';

export default function App() {
  const [currentUser, setUser] = useState(getCurrentUser());
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, map, forecast, scenario
  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAppData();
  }, []);

  const initializeAppData = async () => {
    setLoading(true);
    try {
      // Auto login as demo donor if no user is saved
      if (!currentUser) {
        try {
          const authRes = await api.login('donor_restaurant', 'Donor@123');
          setUser(authRes.user);
        } catch (e) {
          console.warn("Could not auto-login with demo credentials:", e);
        }
      }

      await refreshAllData();
    } catch (err) {
      console.warn("Error during initialization:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = async () => {
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
      console.warn("Error refreshing data:", err);
    }
  };

  const handleRoleChange = async (targetRole) => {
    const roleCredentialMap = {
      DONOR: { user: 'donor_restaurant', pass: 'Donor@123' },
      RECIPIENT: { user: 'recipient_ngo', pass: 'Recipient@123' },
      VOLUNTEER: { user: 'volunteer_rider', pass: 'Volunteer@123' },
      ADMIN: { user: 'admin', pass: 'Admin@123' },
    };

    const creds = roleCredentialMap[targetRole];
    if (creds) {
      try {
        const data = await api.login(creds.user, creds.pass);
        setUser(data.user);
        setActiveTab('dashboard');
        await refreshAllData();
      } catch (err) {
        console.error("Failed to switch role:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRoleChange={handleRoleChange}
        onOpenAuthModal={() => setAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Impact Ticker */}
        <ImpactStats stats={stats} onRefresh={refreshAllData} />

        {/* Dynamic View Content */}
        {activeTab === 'scenario' && (
          <DemoScenarioRunner
            onCompleteCycle={refreshAllData}
            onRoleSwitch={(role) => {
              handleRoleChange(role);
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
                onRefresh={refreshAllData}
              />
            )}

            {currentUser?.role === 'RECIPIENT' && (
              <RecipientDashboard
                currentUser={currentUser}
                listings={listings}
                categories={categories}
                onRefresh={refreshAllData}
              />
            )}

            {currentUser?.role === 'VOLUNTEER' && (
              <VolunteerDashboard
                currentUser={currentUser}
                onRefresh={refreshAllData}
              />
            )}

            {currentUser?.role === 'ADMIN' && (
              <AdminDashboard
                currentUser={currentUser}
                onRefresh={refreshAllData}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800">FoodRescue Network</span>
            <span>• Team 2 Capstone Platform</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>React + Tailwind</span>
            <span>•</span>
            <span>Django REST + PostgreSQL</span>
            <span>•</span>
            <span>Leaflet Maps</span>
            <span>•</span>
            <span>OTP Verification</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setUser(user);
          refreshAllData();
        }}
        currentRole={currentUser?.role}
        onRoleSwitch={handleRoleChange}
      />
    </div>
  );
}
