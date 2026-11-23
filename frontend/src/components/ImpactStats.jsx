import React from 'react';

export default function ImpactStats({ stats, onRefresh }) {
  const summary = stats?.impact_summary || {
    total_packets_donated: 90,
    total_packets_rescued: 70,
    total_packets_delivered: 30,
    co2_saved_kg: 126.0,
    active_deliveries: 1,
    verified_organizations: 2,
    community_members: { donors: 1, recipients: 2, volunteers: 1 }
  };

  return (
    <section className="mb-8">
      {/* Food Safety Banner (Slide 9) */}
      <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <span className="text-base">🛡️</span>
          <span>
            <strong className="font-bold">Food Safety First:</strong> The platform collects and displays preparation time, storage requirements, and pickup deadlines. Verified NGOs inspect temperature and seal integrity before distribution.
          </span>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline ml-2 whitespace-nowrap"
        >
          Refresh Live Stats
        </button>
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Packets Rescued */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Food Rescued</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">🍱</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary.total_packets_rescued}</span>
            <span className="text-xs font-medium text-slate-500">packets</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, Math.round((summary.total_packets_rescued / (summary.total_packets_donated || 1)) * 100))}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {summary.total_packets_donated} total surplus packets listed
          </p>
        </div>

        {/* Card 2: CO2 Avoided */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">CO₂ Avoided</span>
            <span className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">🌱</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary.co2_saved_kg}</span>
            <span className="text-xs font-medium text-slate-500">kg CO₂e</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-3 flex items-center gap-1">
            <span>↓ 1.8 kg/portion</span> landfill emissions diverted
          </p>
        </div>

        {/* Card 3: Deliveries Handed Over */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Deliveries Completed</span>
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">🚚</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary.total_packets_delivered > 0 ? 1 : 0}</span>
            <span className="text-xs font-medium text-slate-500">trips ({summary.total_packets_delivered} pkts)</span>
          </div>
          <p className="text-[11px] text-amber-700 font-medium mt-3 flex items-center gap-1">
            <span>●</span> {summary.active_deliveries} active en route
          </p>
        </div>

        {/* Card 4: Verified Organizations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Verified Network</span>
            <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">🏛️</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary.verified_organizations}</span>
            <span className="text-xs font-medium text-slate-500">charities & donors</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Admin audited & KYC verified
          </p>
        </div>
      </div>
    </section>
  );
}
