import React, { useState } from 'react';
import { UserPlus, CheckCircle2, AlertCircle, X, Shield, ArrowRight } from 'lucide-react';
import { api } from '../api';

export default function OnboardingModal({ isOpen, onClose, onSuccess }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('SecurePass123!');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [currency, setCurrency] = useState('INR');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.register({
        email,
        password,
        fullName,
        phone,
        currency
      });
      setCreatedUser(res);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      setError(err.message || 'Onboarding failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCreatedUser(null);
    setFullName('');
    setEmail('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-obsidian-850 border border-obsidian-750 rounded-xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-obsidian-800"
        >
          <X className="w-4 h-4" />
        </button>

        {!createdUser ? (
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Customer Onboarding</h3>
                <p className="text-xs text-slate-400">
                  Provision new KYC user and automatically mint primary ledger account.
                </p>
              </div>
            </div>

            {error && (
              <div className="my-4 p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Johnathan Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Corporate / Personal Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jvance@swisscapital.ch"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Password (Min 8 Chars)
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Phone Contact
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Base Vault Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="INR">INR — Indian Rupee (Default Core)</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-obsidian-750">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm transition flex items-center space-x-1.5"
                >
                  <span>{loading ? 'Minting Identity...' : 'Register & Provision Vault'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-full bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Onboarding Complete</h3>
              <p className="text-xs text-slate-400">
                Identity established with RBAC role <span className="font-mono text-emerald-400">ACCOUNT_HOLDER</span>.
              </p>
            </div>

            <div className="bg-obsidian-950 p-4 rounded-lg border border-obsidian-750 space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-obsidian-800 pb-1.5">
                <span className="text-slate-400">Owner User ID:</span>
                <span className="text-slate-200 truncate max-w-[220px]">{createdUser.userId}</span>
              </div>
              <div className="flex justify-between border-b border-obsidian-800 pb-1.5">
                <span className="text-slate-400">Primary Account:</span>
                <span className="text-emerald-400 font-bold">{createdUser.primaryAccountNumber}</span>
              </div>
              <div className="flex justify-between border-b border-obsidian-800 pb-1.5">
                <span className="text-slate-400">Currency:</span>
                <span className="text-white">{currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Opening Balance:</span>
                <span className="text-white">0.0000 {currency}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition"
              >
                Access Active Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
