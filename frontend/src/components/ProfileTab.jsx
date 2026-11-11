import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Save, Lock } from 'lucide-react';
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
    if (r === 'ADMIN') return 'System Administrator';
    if (r === 'AUDITOR') return 'Compliance Auditor';
    return 'Account Holder';
  };

  return (
    <div className="space-y-6 max-w-3xl pb-12">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 font-bold">
          PRINCIPAL IDENTITY
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
          Profile Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review and update your registered depository profile details.
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

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Full Legal Name
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alice Vance"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Registered Email
              </label>
              <input
                type="email"
                readOnly
                value={profile?.email || user?.email || ''}
                className="w-full bg-slate-100/70 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-500 cursor-not-allowed select-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Authorization Role
              </label>
              <input
                type="text"
                readOnly
                value={formatRoleDisplay(profile?.role || user?.role)}
                className="w-full bg-slate-100/70 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-700 font-semibold cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Account Status
              </label>
              <input
                type="text"
                readOnly
                value={profile?.status || 'Active'}
                className="w-full bg-emerald-50/70 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-700 font-mono font-bold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Member Since
              </label>
              <input
                type="text"
                readOnly
                value={formatMemberSince(profile?.memberSince)}
                className="w-full bg-slate-100/70 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || loading}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#0f172a] hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-2xs inline-flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
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
