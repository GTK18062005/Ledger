import React, { useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, PlusCircle, ShieldAlert, Lock } from 'lucide-react';
import { api } from '../api';

export default function AccountRequestTab({ user, accounts, onRefreshAccounts }) {
  const [accountType, setAccountType] = useState('Business');
  const [currency, setCurrency] = useState('INR');
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState(null);

  // Stored submitted requests state
  const [requests, setRequests] = useState([
    {
      id: 'req-initial-1',
      type: 'PERSONAL',
      currency: 'INR',
      status: 'PENDING',
      timestamp: '11 Nov 2026, 12:46 am'
    }
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if pending request exists for this type
    const hasPending = requests.some(r => r.type === accountType.toUpperCase() && r.status === 'PENDING');
    if (hasPending) {
      setBanner({
        type: 'warning',
        text: 'A pending account request already exists'
      });
      return;
    }

    setSubmitting(true);
    setBanner(null);

    try {
      // If user is already authenticated, open the account via account service
      const cleanCurrency = accountType === 'International Currency' ? 'USD' : currency;
      await api.openSecondaryAccount(cleanCurrency);

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + 
        ', ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      const newReq = {
        id: `req-${Date.now()}`,
        type: accountType.toUpperCase(),
        currency: cleanCurrency,
        status: 'PENDING',
        timestamp: dateStr
      };

      setRequests(prev => [newReq, ...prev]);
      setBanner({
        type: 'success',
        text: `Successfully registered ${accountType} account request. Pending compliance authorization.`
      });

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

  return (
    <div className="space-y-8 pb-16 max-w-4xl">
      {/* Title Header */}
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

      {/* Main Request Form Card */}
      <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-2">
              Requested account type
            </label>
            <select
              value={accountType}
              onChange={(e) => {
                setAccountType(e.target.value);
                setBanner(null);
              }}
              className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-4 py-3 text-xs text-[#122a1f] font-medium focus:outline-none focus:border-[#133e2b] transition"
            >
              <option value="Business">Business</option>
              <option value="Personal">Personal</option>
              <option value="Treasury Vault">Treasury Vault</option>
              <option value="International Currency">International Currency (USD Core)</option>
            </select>
          </div>

          {/* Warning / Error / Success Banner matching reference screenshot */}
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

      {/* Your Requests List */}
      <div className="space-y-4 pt-4">
        <h2 className="font-serif text-2xl font-normal text-[#122a1f]">
          Your requests
        </h2>

        <div className="space-y-2.5">
          {requests.map(req => (
            <div
              key={req.id}
              className="bg-white border border-[#e5ede3] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="text-xs font-sans font-bold text-[#122a1f] tracking-wide uppercase">
                  {req.type} account
                </div>
                <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#edf5ec] text-[#2c6b48] border border-[#d6e7d4]">
                  {req.status}
                </span>
              </div>

              <div className="text-xs font-mono text-[#8a9e91]">
                {req.timestamp}
              </div>
            </div>
          ))}
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

