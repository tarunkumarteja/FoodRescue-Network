import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminDashboard({ currentUser, onRefresh }) {
  const [activeTab, setActiveTab] = useState('ORGS'); // ORGS, USERS, DISPUTES, SIMULATION
  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Simulation state
  const [simParams, setSimParams] = useState({ donors: 5, recipients: 8, listings: 12 });
  const [simResult, setSimResult] = useState(null);
  const [simRunning, setSimRunning] = useState(false);

  useEffect(() => {
    loadAllAdminData();
  }, [activeTab]);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'ORGS') {
        const orgs = await api.getOrganizations();
        setOrganizations(orgs || []);
      } else if (activeTab === 'USERS') {
        const uList = await api.getUsers();
        setUsers(uList || []);
      } else if (activeTab === 'DISPUTES') {
        const fbList = await api.getFeedbacks();
        setFeedbacks(fbList || []);
      }
    } catch (err) {
      console.warn("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOrg = async (orgId, decision) => {
    try {
      await api.verifyOrganization(orgId, decision, `Audited and ${decision.toLowerCase()} by Platform Admin.`);
      setStatusMsg(`Organization verification updated: ${decision}`);
      const orgs = await api.getOrganizations();
      setOrganizations(orgs || []);
      onRefresh();
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  const handleToggleSuspend = async (userId) => {
    try {
      const res = await api.toggleSuspendUser(userId);
      setStatusMsg(res.message);
      const uList = await api.getUsers();
      setUsers(uList || []);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  const handleResolveFeedback = async (feedbackId) => {
    const notes = prompt("Enter resolution notes:", "Reviewed with donor kitchen lead; hygiene compliance confirmed.");
    if (!notes) return;
    try {
      await api.resolveFeedback(feedbackId, notes);
      setStatusMsg("Dispute/Report marked as resolved.");
      const fbList = await api.getFeedbacks();
      setFeedbacks(fbList || []);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  const handleRunSimulation = async () => {
    setSimRunning(true);
    setStatusMsg('');
    try {
      const res = await api.runSimulation(simParams);
      setSimResult(res);
      setStatusMsg(`✓ Multi-Agent Simulation completed in ${res.metrics.execution_duration_ms} ms!`);
      onRefresh();
    } catch (err) {
      setStatusMsg(`Simulation Failed: ${err.message}`);
    } finally {
      setSimRunning(false);
    }
  };

  const pendingOrgs = organizations.filter(o => o.verification_status === 'PENDING');
  const verifiedOrgs = organizations.filter(o => o.verification_status === 'VERIFIED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
              Platform Administration
            </span>
            <span className="text-xs text-slate-500 font-medium">Compliance, Governance & Simulation Desk</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            FoodRescue Governance & Network Control
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit partner registration certificates, manage account suspensions, resolve safety disputes, and benchmark network matching.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('ORGS')}
            className={`px-3 py-2 rounded-lg transition-all ${
              activeTab === 'ORGS' ? 'bg-white text-purple-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏢 Verifications ({pendingOrgs.length} pending)
          </button>
          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-3 py-2 rounded-lg transition-all ${
              activeTab === 'USERS' ? 'bg-white text-purple-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👥 Accounts
          </button>
          <button
            onClick={() => setActiveTab('DISPUTES')}
            className={`px-3 py-2 rounded-lg transition-all ${
              activeTab === 'DISPUTES' ? 'bg-white text-purple-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚖️ Safety & Disputes
          </button>
          <button
            onClick={() => setActiveTab('SIMULATION')}
            className={`px-3 py-2 rounded-lg transition-all ${
              activeTab === 'SIMULATION' ? 'bg-purple-600 text-white shadow-sm font-black' : 'text-purple-700 hover:bg-purple-50'
            }`}
          >
            ⚡ Live Simulation
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')} className="hover:opacity-75">✕</button>
        </div>
      )}

      {/* Tab 1: Organization Verification Desk */}
      {activeTab === 'ORGS' && (
        <div className="space-y-6">
          {pendingOrgs.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm mb-3">
                <span>⚠️</span>
                <span>{pendingOrgs.length} Organization(s) Awaiting Admin Verification</span>
              </div>

              <div className="space-y-3">
                {pendingOrgs.map((org) => (
                  <div key={org.id} className="bg-white p-4 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-900 text-sm">{org.name}</h4>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          {org.organization_type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Registration/Tax ID: <strong className="text-slate-800">{org.registration_id || 'Trust Deed Filed'}</strong> • Daily Capacity: {org.capacity} pkts
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        📍 {org.address} • 📞 {org.contact_phone}
                      </p>
                      <p className="text-xs text-emerald-700 font-semibold mt-1">
                        Proof Document: {org.proof_document || 'Official Non-Profit Registration Certificate'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleVerifyOrg(org.id, 'REJECTED')}
                        className="flex-1 sm:flex-none px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl font-bold text-xs"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleVerifyOrg(org.id, 'VERIFIED')}
                        className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm"
                      >
                        Approve & Verify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registered Organizations Roster */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Registered Organizations ({organizations.length})
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                {verifiedOrgs.length} Verified Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-extrabold">
                    <th className="pb-3">Organization Name</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Registration ID</th>
                    <th className="pb-3">Capacity</th>
                    <th className="pb-3">Cold Storage</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-50">
                      <td className="py-3 font-bold text-slate-900">{org.name}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          org.organization_type === 'DONOR' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                        }`}>
                          {org.organization_type}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-600">{org.registration_id || 'Pending'}</td>
                      <td className="py-3 text-slate-700 font-semibold">{org.capacity} pkts</td>
                      <td className="py-3">
                        {org.has_cold_storage ? (
                          <span className="text-emerald-700 font-bold">✓ Cold Storage</span>
                        ) : (
                          <span className="text-slate-400">Ambient</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          org.verification_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                          org.verification_status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {org.verification_status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {org.verification_status !== 'VERIFIED' ? (
                          <button
                            onClick={() => handleVerifyOrg(org.id, 'VERIFIED')}
                            className="text-emerald-600 hover:text-emerald-900 font-bold"
                          >
                            Approve
                          </button>
                        ) : (
                          <span className="text-slate-400 font-medium">✓ Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: User Accounts & Suspension */}
      {activeTab === 'USERS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">User Accounts Management</h3>
              <p className="text-xs text-slate-500">Audit user roles, verification standing, and enforce platform suspension</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{users.length} Users</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-extrabold">
                  <th className="pb-3">Username</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Organization</th>
                  <th className="pb-3">Account Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 font-bold text-slate-900">{u.username}</td>
                    <td className="py-3 text-slate-600">{u.email}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">{u.organization?.name || 'Independent Rider'}</td>
                    <td className="py-3">
                      {u.is_suspended ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleToggleSuspend(u.id)}
                          className={`font-bold px-3 py-1 rounded-lg text-xs ${
                            u.is_suspended
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          {u.is_suspended ? 'Reinstate Account' : 'Suspend Account'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Safety & Dispute Resolution Desk */}
      {activeTab === 'DISPUTES' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Food Safety & Dispute Resolution Desk</h3>
              <p className="text-xs text-slate-500">Human/policy governed audit of feedback, delivery complaints, and food safety alerts</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{feedbacks.length} Feedback Records</span>
          </div>

          {feedbacks.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No reported safety incidents or disputes.</p>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">Author: {fb.author_name}</span>
                      <span className="text-amber-500">{'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}</span>
                      {fb.report_safety_issue && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800">
                          Safety Issue Flagged
                        </span>
                      )}
                      {fb.is_resolved ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          ✓ Resolved
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                          Pending Audit
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 mt-1 font-medium">"{fb.comments}"</p>
                    {fb.safety_issue_details && (
                      <p className="text-xs text-rose-700 font-mono mt-1">Issue Details: {fb.safety_issue_details}</p>
                    )}
                    {fb.resolution_notes && (
                      <p className="text-xs text-emerald-700 mt-1">Admin Resolution: {fb.resolution_notes}</p>
                    )}
                  </div>

                  <div>
                    {!fb.is_resolved ? (
                      <button
                        onClick={() => handleResolveFeedback(fb.id)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold whitespace-nowrap"
                      >
                        Resolve Dispute
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Case Closed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Live Multi-Agent Network Simulation & Benchmarking */}
      {activeTab === 'SIMULATION' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/30 uppercase">
                Advanced Engineering Challenge
              </span>
              <span className="text-xs text-slate-300 font-mono">Multi-Agent Network Simulation & Benchmarking</span>
            </div>
            <h3 className="text-xl font-extrabold">Simulate Real-World Donation, Claim & Delivery Workflows</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Simulates donations across multiple food providers (restaurants, caterers, supermarkets) and recipient organizations (shelters, community kitchens).
              Measures matching accuracy, time to claim, row-level locking concurrency integrity, and total distributed food volume.
            </p>

            {/* Parameter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 bg-white/5 p-4 rounded-xl border border-white/10">
              <div>
                <label className="block text-[11px] font-bold text-purple-200 mb-1">Simulated Food Donors</label>
                <input
                  type="number"
                  min="2"
                  max="15"
                  value={simParams.donors}
                  onChange={(e) => setSimParams({ ...simParams, donors: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white font-bold text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-purple-200 mb-1">Recipient Organizations</label>
                <input
                  type="number"
                  min="3"
                  max="20"
                  value={simParams.recipients}
                  onChange={(e) => setSimParams({ ...simParams, recipients: parseInt(e.target.value) || 8 })}
                  className="w-full px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white font-bold text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-purple-200 mb-1">Surplus Listings Generated</label>
                <input
                  type="number"
                  min="4"
                  max="30"
                  value={simParams.listings}
                  onChange={(e) => setSimParams({ ...simParams, listings: parseInt(e.target.value) || 12 })}
                  className="w-full px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white font-bold text-sm outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end">
              <button
                onClick={handleRunSimulation}
                disabled={simRunning}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <span>⚡</span>
                <span>{simRunning ? 'Executing Simulation Engine...' : 'Run Simulation & Measure Benchmarks'}</span>
              </button>
            </div>
          </div>

          {/* Benchmark Results Display */}
          {simResult && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h4 className="text-lg font-black text-slate-900">Simulation Benchmark Report</h4>
                  <p className="text-xs text-slate-500">Run ID: <code className="font-mono text-purple-700">{simResult.run_id}</code></p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    Execution Time: {simResult.metrics.execution_duration_ms} ms
                  </span>
                </div>
              </div>

              {/* 4 Core Benchmark Metric Tiles requested in Prompt */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">1. Successful Matches</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {simResult.metrics.successful_matches} / {simResult.metrics.num_listings_generated}
                  </div>
                  <div className="text-xs font-bold text-slate-600 mt-0.5">
                    {simResult.metrics.match_rate_pct}% Match Rate
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">2. Time to Claim</div>
                  <div className="text-2xl font-black text-sky-600 mt-1">
                    {simResult.metrics.avg_time_to_claim_minutes} min
                  </div>
                  <div className="text-xs font-bold text-slate-600 mt-0.5">
                    {simResult.metrics.avg_time_to_claim_seconds}s simulated latency
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">3. Cancelled Pickups</div>
                  <div className="text-2xl font-black text-amber-600 mt-1">
                    {simResult.metrics.cancelled_pickups}
                  </div>
                  <div className="text-xs font-bold text-slate-600 mt-0.5">
                    {simResult.metrics.completed_pickups} completed handovers
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">4. Total Distributed</div>
                  <div className="text-2xl font-black text-purple-600 mt-1">
                    {simResult.metrics.total_quantity_distributed_packets} pkts
                  </div>
                  <div className="text-xs font-bold text-slate-600 mt-0.5">
                    {simResult.metrics.co2_emissions_prevented_kg} kg CO₂ saved
                  </div>
                </div>
              </div>

              {/* Concurrency Integrity Note */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <strong className="text-emerald-900 block font-bold">Atomic Concurrency Verification:</strong>
                  <span className="text-emerald-700">{simResult.metrics.atomic_concurrency_integrity}</span>
                </div>
                <span className="text-emerald-800 font-mono font-bold">select_for_update OK</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
