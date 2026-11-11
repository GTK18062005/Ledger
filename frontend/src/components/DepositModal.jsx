import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { api } from '../api';

export default function DepositModal({ isOpen, onClose, accounts, user, onRefresh }) {
  if (!isOpen) return null;

  const isAdmin = user?.role === 'ADMIN';
  const [mode, setMode] = useState(isAdmin ? 'direct' : 'request');
  const [targetAccount, setTargetAccount] = useState(accounts[0]?.accountNumber || accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [memo, setMemo] = useState('Inward Settlement / Customer Funding');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setStatus({ type: 'error', text: 'Please enter a valid positive deposit amount.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const selectedAcc = accounts.find(a => a.accountNumber === targetAccount || a.id === targetAccount) || accounts[0];
      const parsedAmount = parseFloat(amount);
      const combinedMemo = reference.trim()
        ? `Ref: ${reference.trim()} | ${memo.trim()}`
        : memo.trim();

      if (mode === 'direct' && isAdmin) {
        await api.adminDeposit({
          accountId: selectedAcc.id,
          amount: parsedAmount,
          description: combinedMemo || 'Admin Treasury Injection'
        });
        setStatus({
          type: 'success',
          text: `Directly credited ₹${parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to ${selectedAcc.accountNumber}. Balanced via SYSTEM_FUNDING.`
        });
      } else {
        await api.createDepositRequest({
          accountId: selectedAcc.id,
          amount: parsedAmount,
          referenceMemo: combinedMemo || 'External Customer Deposit'
        });
        setStatus({
          type: 'success',
          text: `Deposit request for ₹${parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} submitted. Status: PENDING administrator approval.`
        });
      }

      setAmount('');
      setReference('');
      if (onRefresh) await onRefresh();
      setTimeout(() => {
        onClose();
        setStatus(null);
      }, 1800);
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Deposit submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <div className="flex items-center space-x-1.5 text-[10px] font-mono uppercase tracking-widest text-indigo-600 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isAdmin && mode === 'direct' ? 'TREASURY DIRECT INJECTION' : 'MAKER-CHECKER DEPOSIT'}</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mt-1">
            {isAdmin && mode === 'direct' ? 'Direct Treasury Deposit' : 'Request Inward Deposit'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {isAdmin && mode === 'direct'
              ? 'Administrator authority: credits target vault immediately and debits SYSTEM_FUNDING.'
              : 'All customer deposits require dual-control verification by an administrator before clearance.'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('request')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                mode === 'request'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Submit for Approval
            </button>
            <button
              type="button"
              onClick={() => setMode('direct')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                mode === 'direct'
                  ? 'bg-[#0f172a] text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Direct Admin Credit
            </button>
          </div>
        )}

        {status && (
          <div className={`p-3.5 rounded-xl text-xs mb-4 flex items-start space-x-2 font-medium ${
            status.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {status.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{status.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Destination Account
            </label>
            <select
              value={targetAccount}
              onChange={(e) => setTargetAccount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.accountNumber || acc.id}>
                  {acc.accountNumber} ({acc.currency}) — Balance: ₹{Math.max(0, Number(acc.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Deposit Amount (₹ INR)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-mono text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="1000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Wire UTR / Inward Reference
            </label>
            <input
              type="text"
              placeholder="e.g. UTR-20261111-998234 or Bank Ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Settlement Notes / Memo
            </label>
            <input
              type="text"
              placeholder="e.g. Customer Inward Remittance"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center space-x-2 text-[11px] text-slate-600">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              {mode === 'direct' && isAdmin
                ? 'Direct credit: settles immediately against ACC-SYSTEM-FUNDING.'
                : 'Maker-Checker rule: Admin verification is required before balance increases.'}
            </span>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !amount}
              className="px-5 py-2 bg-[#0f172a] hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-2xs"
            >
              {submitting
                ? 'Submitting...'
                : mode === 'direct' && isAdmin
                  ? 'Confirm Direct Deposit'
                  : 'Submit Deposit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
