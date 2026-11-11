import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Lock, CheckCircle2, Clock, XCircle, Building2 } from 'lucide-react';
import { api } from '../api';

export default function AccountRequestTab({ user, accounts, onRefreshAccounts }) {
  const [accountType, setAccountType] = useState('Business');
  const [currency, setCurrency] = useState('INR');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [banner, setBanner] = useState(null);
  const [requests, setRequests] = useState([]);

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const data = await api.getAccountRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setBanner({
        type: 'error',
        text: err.message || 'Unable to load submitted account requests.'
      });
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAccountTypeChange = (value) => {
    setAccountType(value);
    if (value === 'International Currency') {
      setCurrency('USD');
    }
    setBanner(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedType = accountType.trim().toUpperCase().replace(/\s+/g, '_');
    const hasPending = requests.some(
      (r) => r.accountType?.toUpperCase() === normalizedType && r.status === 'PENDING'
    );
    if (hasPending) {
      setBanner({
        type: 'warning',
        text: `A pending account request already exists for ${accountType}.`
      });
      return;
    }

    setSubmitting(true);
    setBanner(null);

    try {
      const cleanCurrency = currency || (accountType === 'International Currency' ? 'USD' : 'INR');
      await api.createAccountRequest({
        accountType,
        currency: cleanCurrency,
        reason: reason.trim() || undefined
      });

      setReason('');
      setBanner({
        type: 'success',
        text: `Successfully registered ${accountType} (${cleanCurrency}) account request. Pending compliance authorization.`
      });

      await fetchRequests();
      if (onRefreshAccounts) await onRefreshAccounts();
    } catch (err) {
      setBanner({
        type: 'error',
        text: err.message || 'Failed to submit account request'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimestamp = (value) => {
    if (!value) return 'Just now';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return (
      parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ', ' +
      parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    );
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#5d7d6b]">
            ONBOARDING
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#122a1f] mt-1">
            Account request
          </h1>
          <p className="text-xs text-[#52705e] mt-1">
            Customer accounts are opened after administrator review.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          disabled={loadingRequests}
          className="inline-flex items-center space-x-1.5 text-xs bg-white hover:bg-[#f2f6f1] text-[#1a4a35] px-3.5 py-2 rounded-xl border border-[#d6e2d4] transition shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingRequests ? 'animate-spin text-[#133e2b]' : ''}`} />
          <span>Refresh status</span>
        </button>
      </div>

      {/* Main Request Form Card */}
      <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1e3c2c] mb-2">
                Requested account type
              </label>
              <select
                value={accountType}
                onChange={(e) => handleAccountTypeChange(e.target.value)}
                className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-4 py-3 text-xs text-[#122a1f] font-medium focus:outline-none focus:border-[#133e2b] transition"
              >
                <option value="Business">Business</option>
                <option value="Personal">Personal</option>
                <option value="Treasury Vault">Treasury Vault</option>
                <option value="International Currency">International Currency (USD Core)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1e3c2c] mb-2">
                Base currency
              </label>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  setBanner(null);
                }}
                className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-4 py-3 text-xs text-[#122a1f] font-mono font-medium focus:outline-none focus:border-[#133e2b] transition"
              >
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-2">
              Purpose / compliance note (optional)
            </label>
            <input
              type="text"
              maxLength={450}
              placeholder="e.g. Dedicated vendor settlement or multi-currency operating reserve"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-4 py-3 text-xs text-[#122a1f] placeholder-[#819e8e] focus:outline-none focus:border-[#133e2b] transition"
            />
          </div>

          {/* Warning / Error / Success Banner matching Swiss green theme */}
          {banner && (
            <div className={`p-3.5 rounded-xl text-xs font-medium ${
              banner.type === 'warning' || banner.type === 'error'
                ? 'bg-[#fff1f0] text-[#c53030] border border-[#fcdad7]'
                : 'bg-[#eaf2e8] text-[#133e2b] border border-[#cbdec7]'
            }`}>
              <span>{banner.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#123825] hover:bg-[#0e291b] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-sm tracking-wide"
          >
            {submitting ? 'Submitting request...' : 'Submit request'}
          </button>
        </form>
      </div>

      {/* Persisted Requests List */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-normal text-[#122a1f]">
            Your requests
          </h2>
          <span className="text-[11px] font-mono text-[#6a8776]">
            {requests.length} application{requests.length === 1 ? '' : 's'} recorded
          </span>
        </div>

        {loadingRequests && requests.length === 0 ? (
          <div className="bg-white border border-[#e5ede3] rounded-2xl p-6 text-center text-xs text-[#6a8776] font-mono">
            Loading persisted account opening applications...
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white border border-dashed border-[#d6e2d4] rounded-2xl p-8 text-center space-y-2">
            <Building2 className="w-7 h-7 text-[#7fa08c] mx-auto" />
            <p className="text-xs text-[#52705e]">
              No account opening requests submitted yet. Submit an application above to request a new depository vault.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const isApproved = req.status === 'APPROVED';
              const isRejected = req.status === 'REJECTED';
              return (
                <div
                  key={req.id}
                  className="bg-white border border-[#e5ede3] rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-sans font-bold text-[#122a1f] tracking-wide uppercase">
                        {(req.accountType || 'ACCOUNT').replace(/_/g, ' ')} account
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#f8faf7] text-[#133e2b] border border-[#d6e2d4]">
                        {req.currency || 'INR'}
                      </span>
                      <span className={`inline-flex items-center space-x-1 text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${
                        isApproved
                          ? 'bg-[#edf5ec] text-[#133e2b] border-[#cbdec7]'
                          : isRejected
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {isApproved ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : isRejected ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{req.status}</span>
                      </span>
                    </div>

                    <div className="text-xs font-mono text-[#8a9e91]">
                      {formatTimestamp(req.createdAt)}
                    </div>
                  </div>

                  {req.reason && (
                    <div className="text-xs text-[#52705e]">
                      {req.reason}
                    </div>
                  )}

                  {(req.createdAccountNumber || req.adminNotes) && (
                    <div className="pt-2 border-t border-[#edf3ec] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                      {req.createdAccountNumber ? (
                        <span className="text-[#133e2b] font-semibold">
                          Provisioned Vault: {req.createdAccountNumber}
                        </span>
                      ) : (
                        <span className="text-[#789685]">Review complete</span>
                      )}
                      {req.adminNotes && (
                        <span className="text-[#597866]">
                          Note: {req.adminNotes}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
