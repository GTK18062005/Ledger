import React, { useState, useEffect } from 'react';
import {
  PlusCircle, Clock, CheckCircle2, XCircle, AlertCircle,
  Loader2, RefreshCw, ShieldCheck, Building2, CreditCard
} from 'lucide-react';
import { api } from '../api';

export default function AccountRequestTab({ user, onRefreshAccounts }) {
  const [accountType, setAccountType] = useState('Business');
  const [currency, setCurrency] = useState('INR');
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await api.getAccountRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch account requests:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (val) => {
    setAccountType(val);
    setBanner(null);
    if (val === 'International Currency') {
      setCurrency('USD');
    } else if (currency === 'USD' && val !== 'International Currency') {
      setCurrency('INR');
    }
  };

  const normalizedSelectedType = accountType.trim().toUpperCase().replace(/\s+/g, '_');
  const hasPendingForSelectedType = requests.some(
    (r) => r.accountType === normalizedSelectedType && r.status === 'PENDING'
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (hasPendingForSelectedType) {
      setBanner({
        type: 'warning',
        text: `A pending account request already exists for ${accountType}. Please wait for administrator review.`
      });
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      const created = await api.createAccountRequest({
        accountType,
        currency,
        reason: reason.trim() || `${accountType} (${currency}) treasury onboarding request`
      });

      setRequests((prev) => [created, ...prev]);
      setReason('');
      setBanner({
        type: 'success',
        text: `Submitted ${accountType} (${currency}) account request. Your vault will activate automatically once reviewed and approved by an administrator.`
      });
      if (onRefreshAccounts) await onRefreshAccounts();
    } catch (err) {
      setBanner({
        type: 'error',
        text: err.message || 'Unable to submit account opening request.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'APPROVED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
          <CheckCircle2 className="w-3 h-3" />
          <span>APPROVED</span>
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-mono font-bold">
          <XCircle className="w-3 h-3" />
          <span>REJECTED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono font-bold">
        <Clock className="w-3 h-3" />
        <span>PENDING REVIEW</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider">
            <span className="text-indigo-600">VAULT ONBOARDING</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">MAKER-CHECKER PROVISIONING</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Add Account Request
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Request additional sovereign vaults under your profile. Customer accounts open automatically after administrator approval.
          </p>
        </div>

        <button
          onClick={loadRequests}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Main Submission Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
          <div className="flex items-center space-x-2.5 pb-4 mb-5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">New Vault Application</h2>
              <p className="text-[11px] text-slate-500">Persisted to PostgreSQL and queued for compliance triage</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Requested Account Type
                </label>
                <select
                  value={accountType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                >
                  <option value="Business">Business Operating Account</option>
                  <option value="Personal">Personal Checking Vault</option>
                  <option value="Treasury Vault">Treasury Reserve Vault</option>
                  <option value="International Currency">International FX Vault</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Settlement Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                >
                  <option value="INR">INR (Indian Rupee)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="GBP">GBP (British Pound)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Purpose / Onboarding Note
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Operating liquidity account for Q4 vendor settlements"
                maxLength={250}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            {hasPendingForSelectedType && !banner && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  A pending request already exists for <strong>{accountType}</strong>. Choose another type or await administrator approval.
                </span>
              </div>
            )}

            {banner && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium flex items-center space-x-2.5 border ${
                  banner.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : banner.type === 'warning'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {banner.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{banner.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || hasPendingForSelectedType}
              className="w-full py-3 bg-[#0f172a] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Submitting Account Request...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 text-emerald-400" />
                  <span>Submit Account Opening Request</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Compliance Side Notice */}
        <div className="bg-[#0f172a] text-white rounded-2xl p-6 border border-slate-800 flex flex-col justify-between shadow-md">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>DUAL-CONTROL ONBOARDING</span>
            </div>

            <h3 className="text-base font-bold leading-snug">
              How Account Opening Works
            </h3>

            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 text-emerald-400">
                  1
                </span>
                <span>Submit your desired vault category and currency. It is saved immediately in PostgreSQL.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 text-emerald-400">
                  2
                </span>
                <span>Administrators verify your request in <strong>Account Management</strong>.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 text-emerald-400">
                  3
                </span>
                <span>Upon approval, a real active zero-balance account appears in your workspace automatically.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>NON-NEGATIVE INVARIANT</span>
            <span className="text-emerald-400">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Persisted Request History Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Your Account Requests</h2>
            <p className="text-[11px] text-slate-500">Live status synced from Supabase PostgreSQL</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold">
            {requests.length} Total
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading submitted account requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <CreditCard className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              No account opening requests submitted yet. Use the form above to request a new vault.
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      {req.accountType?.replace(/_/g, ' ')} ACCOUNT
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                      {req.currency}
                    </span>
                    {getStatusBadge(req.status)}
                  </div>

                  {req.reason && (
                    <div className="text-xs text-slate-600">{req.reason}</div>
                  )}

                  {req.createdAccountNumber && (
                    <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 inline-block px-2 py-0.5 rounded-md mt-1">
                      Provisioned Vault: <strong>{req.createdAccountNumber}</strong>
                    </div>
                  )}

                  {req.adminNotes && (
                    <div className="text-[11px] text-slate-500 italic">
                      Admin note: &ldquo;{req.adminNotes}&rdquo;
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[11px] font-mono text-slate-500">
                    {req.createdAt
                      ? new Date(req.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
