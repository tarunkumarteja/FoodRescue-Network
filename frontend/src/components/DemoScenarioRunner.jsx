import React, { useState } from 'react';

export default function DemoScenarioRunner({ onCompleteCycle, onRoleSwitch }) {
  const [currentStep, setCurrentStep] = useState(10);
  const [isSimulating, setIsSimulating] = useState(false);

  const steps = [
    {
      step: 1,
      title: "Restaurant Registers & Gets Verified",
      actor: "Food Donor",
      roleKey: "DONOR",
      desc: "Royal Spice Restaurant registers on platform. Administrator audits FSSAI license and approves profile.",
      badge: "Verified Org"
    },
    {
      step: 2,
      title: "Adds 50 Surplus Food Packets",
      actor: "Food Donor",
      roleKey: "DONOR",
      desc: "Kitchen posts 50 packets of hot Vegetable Biryani & Gravy with 3h pickup deadline and allergen disclosures.",
      badge: "50 pkts listed"
    },
    {
      step: 3,
      title: "NGO Registers & Audited",
      actor: "Food Recipient",
      roleKey: "RECIPIENT",
      desc: "Asha Jyothi Children Home (capacity: 120 packets) gets verified by admin under Darpan ID KA/2018/00912.",
      badge: "Audited Charity"
    },
    {
      step: 4,
      title: "NGO Searches Available Food",
      actor: "Food Recipient",
      roleKey: "RECIPIENT",
      desc: "NGO filters by cooked meals, max distance (10km), and urgent pickup deadlines.",
      badge: "Search Query"
    },
    {
      step: 5,
      title: "Algorithmic Matching Recommends Listing",
      actor: "Matching Engine",
      roleKey: "RECIPIENT",
      desc: "Score = 0.4*D + 0.3*Q + 0.2*T + 0.1*C scores Asha Jyothi at 86.0% (Distance: 0.91 km).",
      badge: "86.0% Match Score"
    },
    {
      step: 6,
      title: "NGO Reserves 30 Packets",
      actor: "Food Recipient",
      roleKey: "RECIPIENT",
      desc: "Atomic database locking decrements quantity to 20 remaining. Zero risk of double booking.",
      badge: "20 pkts left"
    },
    {
      step: 7,
      title: "Volunteer Claims Pickup Task",
      actor: "Volunteer Rider",
      roleKey: "VOLUNTEER",
      desc: "Rider Arun Teja claims the assignment and navigates to Royal Spice via Leaflet map.",
      badge: "Volunteer Assigned"
    },
    {
      step: 8,
      title: "Volunteer Collects Food",
      actor: "Volunteer Rider",
      roleKey: "VOLUNTEER",
      desc: "Rider arrives at kitchen service door. Checks thermal containers and packaging seal.",
      badge: "At Donor Location"
    },
    {
      step: 9,
      title: "Donor Handover Confirmed with OTP",
      actor: "Donor + Volunteer",
      roleKey: "VOLUNTEER",
      desc: "Donor provides 6-digit OTP #482910. Volunteer verifies OTP. Delivery changes status to FOOD_COLLECTED.",
      badge: "OTP: 482910 Verified"
    },
    {
      step: 10,
      title: "Delivery to Shelter & Dashboard Updates",
      actor: "Recipient + Platform",
      roleKey: "ADMIN",
      desc: "Recipient enters OTP #619340 upon receiving 30 warm meals. Impact statistics & carbon offset refresh instantly!",
      badge: "Cycle Completed"
    }
  ];

  const runFullSimulation = () => {
    setIsSimulating(true);
    setCurrentStep(1);
    let s = 1;
    const interval = setInterval(() => {
      s += 1;
      if (s > 10) {
        clearInterval(interval);
        setIsSimulating(false);
        if (onCompleteCycle) onCompleteCycle();
      } else {
        setCurrentStep(s);
      }
    }, 1200);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-8 border border-slate-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-700/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-wider">
              Slide 12 Specification
            </span>
            <span className="text-slate-400 text-xs">Team 2 Demo Protocol</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Full Donation Cycle Scenario</h2>
          <p className="text-slate-400 text-sm mt-1">
            50 Packets Listed → 30 Packets Reserved → 20 Packets Remaining → 1 Completed Verified Delivery
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runFullSimulation}
            disabled={isSimulating}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg ${
              isSimulating
                ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 hover:scale-105'
            }`}
          >
            <span>{isSimulating ? '⏳' : '▶'}</span>
            <span>{isSimulating ? 'Simulating Steps...' : 'Re-run Auto Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Progress Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
        <div className="bg-slate-800/80 border border-slate-700 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 uppercase font-bold">1. Initial Prepared</span>
          <div className="text-xl font-extrabold text-white mt-0.5">50 <span className="text-xs font-normal text-slate-400">packets</span></div>
        </div>
        <div className="bg-slate-800/80 border border-slate-700 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 uppercase font-bold">2. Reserved by NGO</span>
          <div className="text-xl font-extrabold text-amber-400 mt-0.5">30 <span className="text-xs font-normal text-slate-400">packets</span></div>
        </div>
        <div className="bg-slate-800/80 border border-slate-700 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 uppercase font-bold">3. Remaining Surplus</span>
          <div className="text-xl font-extrabold text-emerald-400 mt-0.5">20 <span className="text-xs font-normal text-slate-400">packets</span></div>
        </div>
        <div className="bg-slate-800/80 border border-slate-700 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 uppercase font-bold">4. Verified Handover</span>
          <div className="text-xl font-extrabold text-sky-400 mt-0.5">100% <span className="text-xs font-normal text-slate-400">OTP Verified</span></div>
        </div>
      </div>

      {/* Step by Step Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Simulation Step {currentStep} of 10</span>
          <span>Click any step to view role perspective</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {steps.map((s) => {
            const isPassed = s.step <= currentStep;
            const isCurrent = s.step === currentStep;

            return (
              <div
                key={s.step}
                onClick={() => {
                  setCurrentStep(s.step);
                  if (onRoleSwitch) onRoleSwitch(s.roleKey);
                }}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-amber-500/10 border-amber-500 text-white shadow-md ring-1 ring-amber-500'
                    : isPassed
                    ? 'bg-slate-800/60 border-emerald-500/40 text-slate-200 hover:border-emerald-500'
                    : 'bg-slate-800/20 border-slate-800 text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isPassed ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {isPassed ? '✓' : s.step}
                    </span>
                    <span className="text-xs font-bold text-slate-300">{s.title}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-700/80 text-amber-300">
                    {s.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 pl-8 leading-relaxed">
                  {s.desc}
                </p>
                <div className="mt-2 pl-8 flex items-center gap-3 text-[11px]">
                  <span className="text-slate-400">Actor: <strong className="text-slate-200">{s.actor}</strong></span>
                  <span className="text-amber-400 font-semibold hover:underline">Switch to Role →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
