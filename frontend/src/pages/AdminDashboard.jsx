import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminDashboard({ currentUser, onRefresh }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [activeTab, setActiveTab] = useState('ORGS'); // ORGS, VERIFICATIONS, SAFETY

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const data = await api.getOrganizations();
      setOrganizations(data || []);
    } catch (err) {
      console.warn("Could not load organizations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (orgId, decision) => {
    try {
      await api.verifyOrganization(orgId, decision, `Reviewed and ${decision.toLowerCase()} by Platform Admin.`);
      setStatusMsg(`Organization verification updated: ${decision}`);
      loadOrganizations();
      onRefresh();
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
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
            <span className="text-xs text-slate-500 font-medium">Compliance & Verification Desk</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            FoodRescue Governance & Verification
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit partner registration certificates, resolve food safety reports, and manage network trust.
          </p>
        </div>

        <button
          onClick={loadOrganizations}
          className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          ↻ Refresh Records
        </button>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')} className="hover:opacity-75">✕</button>
        </div>
      )}

      {/* Pending Verifications Alert Box */}
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
                    Reg/Tax ID: <strong className="text-slate-800">{org.registration_id || 'Trust Deed Filed'}</strong> • Daily Capacity: {org.capacity} pkts
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    📍 {org.address} • 📞 {org.contact_phone}
                  </p>
                  <p className="text-xs text-emerald-700 font-semibold mt-1">
                    Proof Attached: {org.proof_document || 'Official Non-Profit Registration Certificate'}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleVerify(org.id, 'REJECTED')}
                    className="flex-1 sm:flex-none px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl font-bold text-xs"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleVerify(org.id, 'VERIFIED')}
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

      {/* Verified Partners Roster */}
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
                <th className="pb-3">Role</th>
                <th className="pb-3">Reg ID / License</th>
                <th className="pb-3">Capacity</th>
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
                        onClick={() => handleVerify(org.id, 'VERIFIED')}
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
  );
}
