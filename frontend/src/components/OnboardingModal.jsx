import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative">
        <button
          onClick={handleReset}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!createdUser ? (
          <div>
            <div className="mb-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 font-bold">
                CLIENT ONBOARDING
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                Open Client Account
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Registers principal identity, assigns ACCOUNT_HOLDER role, and provisions primary depository vault.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alice Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mobile Contact
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Primary Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                  >
                    <option value="INR">INR — Indian Rupee</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-2xs flex items-center space-x-2"
                >
                  <span>{loading ? 'Registering...' : 'Complete Onboarding'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Client Onboarded Successfully
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Account Holder registered and primary vault provisioned.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-left font-mono text-xs space-y-2">
              <div><span className="text-slate-400">User ID:</span> {createdUser.userId}</div>
              <div><span className="text-slate-400">Email:</span> {createdUser.email}</div>
              <div><span className="text-slate-400">Vault Number:</span> <span className="font-bold text-indigo-700">{createdUser.primaryAccountNumber}</span></div>
              <div><span className="text-slate-400">Role:</span> {createdUser.role}</div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white font-semibold rounded-xl text-xs"
            >
              Close & Proceed to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
