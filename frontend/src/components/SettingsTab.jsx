import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, DollarSign, Globe, CheckCircle2, Save } from 'lucide-react';

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
    <div className="space-y-6 max-w-3xl">
      {/* Header Eyebrow & Title */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#5c7c6a] font-semibold">
          PREFERENCES
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#122a1f] mt-1">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#52705e] mt-1 font-sans">
          Customize your workspace view and operational preferences.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-2xl text-xs flex items-center space-x-2.5 bg-[#eaf2e8] text-[#133e2b] border border-[#cbdec7] transition">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#133e2b]" />
          <span className="font-medium">Workspace preferences saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Workspace Display Card */}
        <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center space-x-2 border-b border-[#edf3ec] pb-3">
            <Globe className="w-4 h-4 text-[#133e2b]" />
            <h2 className="text-base font-semibold text-[#122a1f]">
              Display & Currency
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-2">
              Primary Accounting Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#122a1f] font-sans focus:outline-none focus:border-[#133e2b]"
            >
              <option value="INR">INR — Indian Rupee (₹)</option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="EUR">EUR — Euro (€)</option>
              <option value="GBP">GBP — British Pound (£)</option>
            </select>
            <p className="text-[11px] text-[#6c8a77] mt-1.5">
              Standard base currency used for double-entry ledger calculation and aggregate reporting.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-2">
              Telemetry Refresh Cadence
            </label>
            <select
              value={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.value)}
              className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#122a1f] font-sans focus:outline-none focus:border-[#133e2b]"
            >
              <option value="10s">Real-Time (Every 10 seconds)</option>
              <option value="30s">Standard (Every 30 seconds)</option>
              <option value="60s">Consolidated (Every 60 seconds)</option>
              <option value="manual">Manual Refresh Only</option>
            </select>
          </div>
        </div>

        {/* Notifications Preferences */}
        <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#edf3ec] pb-3">
            <Bell className="w-4 h-4 text-[#133e2b]" />
            <h2 className="text-base font-semibold text-[#122a1f]">
              Notification Triggers
            </h2>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-center justify-between p-3.5 bg-[#f8faf7] border border-[#e5ede3] rounded-2xl cursor-pointer hover:bg-[#f2f6f1] transition">
              <div>
                <div className="text-xs font-semibold text-[#122a1f]">
                  Financial Activity Alerts
                </div>
                <div className="text-[11px] text-[#6c8a77] mt-0.5">
                  Receive real-time notifications on transfers, deposits, and settlement approvals.
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyTransactions}
                onChange={(e) => setNotifyTransactions(e.target.checked)}
                className="w-4 h-4 accent-[#133e2b] rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-[#f8faf7] border border-[#e5ede3] rounded-2xl cursor-pointer hover:bg-[#f2f6f1] transition">
              <div>
                <div className="text-xs font-semibold text-[#122a1f]">
                  Maker-Checker Treasury Notifications
                </div>
                <div className="text-[11px] text-[#6c8a77] mt-0.5">
                  Notify when deposit requests are created, reviewed, approved, or rejected.
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyApprovals}
                onChange={(e) => setNotifyApprovals(e.target.checked)}
                className="w-4 h-4 accent-[#133e2b] rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 bg-[#133e2b] hover:bg-[#0e2e1f] text-white rounded-2xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
