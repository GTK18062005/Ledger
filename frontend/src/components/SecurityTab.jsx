import React, { useState } from 'react';
import { KeyRound, Shield, ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';
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
        text: res.message || 'Password changed successfully. Your financial vault is secured.'
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
    <div className="space-y-6 max-w-3xl">
      {/* Header Eyebrow & Title */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#5c7c6a] font-semibold">
          AUTHENTICATION & SECURITY
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#122a1f] mt-1">
          Security
        </h1>
        <p className="text-xs sm:text-sm text-[#52705e] mt-1 font-sans">
          Manage your access credentials and protect your financial vault.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs flex items-center space-x-2.5 transition ${
          message.type === 'success'
            ? 'bg-[#eaf2e8] text-[#133e2b] border border-[#cbdec7]'
            : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#133e2b]" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Change Password Card */}
      <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center space-x-2 border-b border-[#edf3ec] pb-3 mb-5">
          <KeyRound className="w-4 h-4 text-[#133e2b]" />
          <h2 className="text-base font-semibold text-[#122a1f]">
            Change Password
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-2">
              Current password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#122a1f] font-sans focus:outline-none focus:border-[#133e2b] focus:bg-white transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3.5 top-3 text-[#6c8a77] hover:text-[#122a1f]"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-2">
              New password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#122a1f] font-sans focus:outline-none focus:border-[#133e2b] focus:bg-white transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3.5 top-3 text-[#6c8a77] hover:text-[#122a1f]"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-[#6c8a77] mt-1">
              Must be at least 6 characters. Use letters, numbers, and symbols.
            </p>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-2">
              Confirm new password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#122a1f] font-sans focus:outline-none focus:border-[#133e2b] focus:bg-white transition"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-3 bg-[#133e2b] hover:bg-[#0e2e1f] disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>{submitting ? 'Updating password...' : 'Update password'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security Safeguards Status Card */}
      <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center space-x-2 border-b border-[#edf3ec] pb-3 mb-5">
          <ShieldCheck className="w-4 h-4 text-[#133e2b]" />
          <h2 className="text-base font-semibold text-[#122a1f]">
            Vault Protection Standards
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-[#f8faf7] border border-[#e5ede3] rounded-2xl">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#5c7c6a] font-semibold">
              SESSION AUTHENTICATION
            </div>
            <div className="text-sm font-semibold text-[#122a1f] mt-1 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>HMAC-SHA256 JWT Token</span>
            </div>
            <p className="text-[11px] text-[#6c8a77] mt-1">
              Cryptographically signed bearer token issued by BalanceVault engine.
            </p>
          </div>

          <div className="p-4 bg-[#f8faf7] border border-[#e5ede3] rounded-2xl">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#5c7c6a] font-semibold">
              MAKER-CHECKER ENFORCEMENT
            </div>
            <div className="text-sm font-semibold text-[#122a1f] mt-1 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Dual-Control Active</span>
            </div>
            <p className="text-[11px] text-[#6c8a77] mt-1">
              External deposits require independent administrator verification.
            </p>
          </div>

          <div className="p-4 bg-[#f8faf7] border border-[#e5ede3] rounded-2xl">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#5c7c6a] font-semibold">
              RATE LIMITING PROTECTION
            </div>
            <div className="text-sm font-semibold text-[#122a1f] mt-1 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Redis Sliding-Window Guard</span>
            </div>
            <p className="text-[11px] text-[#6c8a77] mt-1">
              Guards against brute-force attacks and denial-of-service abuse.
            </p>
          </div>

          <div className="p-4 bg-[#f8faf7] border border-[#e5ede3] rounded-2xl">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#5c7c6a] font-semibold">
              LEDGER IMMUTABILITY
            </div>
            <div className="text-sm font-semibold text-[#122a1f] mt-1 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Append-Only Postings</span>
            </div>
            <p className="text-[11px] text-[#6c8a77] mt-1">
              PostgreSQL trigger aborts any UPDATE or DELETE attempt on financial entries.
            </p>
          </div>
        </div>
      </div>

      {/* Swiss Depository Footer */}
      <div className="pt-8 border-t border-[#e5ede3] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6a8776]">
        <div>BalanceVault — Financial clarity, by design</div>
        <div className="flex items-center space-x-1.5 text-[11px] font-mono">
          <Lock className="w-3.5 h-3.5 text-[#597866]" />
          <span>Secure session</span>
        </div>
      </div>
    </div>
  );
}

