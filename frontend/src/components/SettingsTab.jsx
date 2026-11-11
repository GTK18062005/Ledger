import React, { useState } from 'react';
import { Bell, Globe, CheckCircle2, Save, Lock } from 'lucide-react';

export default function SettingsTab({ user }) {
  const [currency, setCurrency] = useState('INR');
  const [notifyTransactions, setNotifyTransactions] = useState(true);
  const [notifyApprovals, setNotifyApprovals] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState('30s');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-3xl pb-12">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 font-bold">
          WORKSPACE CONFIGURATION
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
          Preferences & Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure base reporting currency, live telemetry intervals, and alert subscriptions.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl text-xs flex items-center space-x-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-medium">Workspace preferences saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3.5">
            <Globe className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Display & Accounting Currency
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Primary Accounting Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
            >
              <option value="INR">INR — Indian Rupee (₹)</option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="EUR">EUR — Euro (€)</option>
              <option value="GBP">GBP — British Pound (£)</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Base reporting denomination for dashboard cards and reconciliation tables.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Telemetry Refresh Cadence
            </label>
            <select
              value={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
            >
              <option value="10s">Real-Time (Every 10 seconds)</option>
              <option value="30s">Standard (Every 30 seconds)</option>
              <option value="60s">Consolidated (Every 60 seconds)</option>
              <option value="manual">Manual Refresh Only</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3.5">
            <Bell className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Notification Triggers
            </h2>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl cursor-pointer hover:bg-indigo-50/40 transition">
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  Settlement & Transfer Alerts
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Receive live badges when double-entry transfers or withdrawals settle.
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyTransactions}
                onChange={(e) => setNotifyTransactions(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl cursor-pointer hover:bg-indigo-50/40 transition">
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  Maker-Checker Queue Alerts
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Notify when account openings or deposit requests change status.
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyApprovals}
                onChange={(e) => setNotifyApprovals(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-2xs inline-flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      <div className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div>LedgerLine Institutional Infrastructure</div>
        <div className="flex items-center space-x-1.5 text-[11px] font-mono">
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
          <span>AES-256 Encrypted Session</span>
        </div>
      </div>
    </div>
  );
}
