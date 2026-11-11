import React, { useState, useEffect } from 'react';
import { User as UserIcon, CheckCircle2, AlertCircle, Save, Lock } from 'lucide-react';
import { api, setStoredUser, getStoredUser } from '../api';

export default function ProfileTab({ user, onUserUpdated }) {
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getProfile();
      setProfile(data);
      setFullName(data.fullName || '');
    } catch (err) {
      // Fallback from local user state
      const fallbackName = user?.fullName || (user?.email?.includes('tharun') ? 'Tharun Kumar Gangavarapu' : user?.email?.split('@')[0]);
      setFullName(fallbackName);
      setProfile({
        fullName: fallbackName,
        email: user?.email || '',
        role: user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'AUDITOR' ? 'Auditor' : 'Account holder',
        status: 'Active',
        memberSince: '11 Nov 2026, 1:11 am'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setMessage({ type: 'error', text: 'Full name cannot be empty.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateProfile({ fullName: fullName.trim() });
      setProfile(updated);
      setFullName(updated.fullName);
      
      // Update stored user
      const stored = getStoredUser() || {};
      const newStored = { ...stored, fullName: updated.fullName };
      setStoredUser(newStored);
      if (onUserUpdated) onUserUpdated(newStored);

      setMessage({ type: 'success', text: 'Personal details updated successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const formatMemberSince = (raw) => {
    if (!raw) return '11 Nov 2026, 1:11 am';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return raw;
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }) + ', ' + d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).toLowerCase();
    } catch {
      return raw;
    }
  };

  const formatRoleDisplay = (role) => {
    if (!role) return 'Account holder';
    const r = role.toUpperCase();
    if (r === 'ADMIN') return 'Administrator';
    if (r === 'AUDITOR') return 'Auditor';
    return 'Account holder';
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header Eyebrow & Title */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#5c7c6a] font-semibold">
          YOUR ACCOUNT
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#122a1f] mt-1">
          Profile
        </h1>
        <p className="text-xs sm:text-sm text-[#52705e] mt-1 font-sans">
          Review and update your personal details.
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

      {/* Main Form Container */}
      <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-2">
              Full name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Tharun Kumar Gangavarapu"
              className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#122a1f] font-sans focus:outline-none focus:border-[#133e2b] focus:bg-white transition"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-2">
              Email
            </label>
            <input
              type="email"
              readOnly
              value={profile?.email || user?.email || ''}
              className="w-full bg-[#f4f7f3] border border-[#d6e2d4] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#52705e] font-sans cursor-not-allowed select-all"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-2">
              Role
            </label>
            <input
              type="text"
              readOnly
              value={formatRoleDisplay(profile?.role || user?.role)}
              className="w-full bg-[#f4f7f3] border border-[#d6e2d4] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#52705e] font-sans cursor-not-allowed"
            />
          </div>

          {/* Account Status */}
          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-2">
              Account status
            </label>
            <input
              type="text"
              readOnly
              value={profile?.status || 'Active'}
              className="w-full bg-[#f4f7f3] border border-[#d6e2d4] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#133e2b] font-medium font-sans cursor-not-allowed"
            />
          </div>

          {/* Member Since */}
          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-2">
              Member since
            </label>
            <input
              type="text"
              readOnly
              value={formatMemberSince(profile?.memberSince)}
              className="w-full bg-[#f4f7f3] border border-[#d6e2d4] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#52705e] font-sans cursor-not-allowed"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 bg-[#133e2b] hover:bg-[#0e2e1f] disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving changes...' : 'Save changes'}</span>
            </button>
          </div>
        </form>
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

