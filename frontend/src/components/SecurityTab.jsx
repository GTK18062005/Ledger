import React, { useState } from 'react';
import { KeyRound, ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { api } from '../api';

export default function SecurityTab({ user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Current password is required.' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    if (currentPassword === newPassword) {
      setMessage({ type: 'error', text: 'New password cannot be the same as your current password.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.changePassword({
        currentPassword,
        newPassword,
        confirmPassword
      });
      setMessage({
        type: 'success',
        text: res.message || 'Password updated successfully. Your workspace security credentials are active.'
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl pb-12">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 font-bold">
          AUTHENTICATION & CREDENTIALS
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
          Security Controls
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Rotate your cryptographic access credentials and verify institutional security standards.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs flex items-center space-x-2.5 ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Change Password Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3.5 mb-5">
          <KeyRound className="w-4 h-4 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">
            Update Password
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Recommended: combine uppercase, lowercase, digits, and symbols.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#0f172a] hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-2xs inline-flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>{submitting ? 'Updating Credentials...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security Safeguards Status Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3.5 mb-5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">
            Institutional Protection Standards
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 font-bold">
              SESSION AUTHENTICATION
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>HMAC-SHA256 JWT Token</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Cryptographically signed bearer token validated per request.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 font-bold">
              MAKER-CHECKER ENFORCEMENT
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Dual-Control Active</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Deposits and account openings require administrator sign-off.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 font-bold">
              RATE LIMITING PROTECTION
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Sliding-Window Throttle</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Protects transfer & login routes from abuse and replay floods.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 font-bold">
              NON-NEGATIVE BALANCE GUARD
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Pessimistic Row Locks</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Database CHECK constraints and deterministic locking prevent overdrafts.
            </p>
          </div>
        </div>
      </div>

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
