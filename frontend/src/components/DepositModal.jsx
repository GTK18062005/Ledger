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
        // Direct admin treasury injection
        await api.adminDeposit({
          accountId: selectedAcc.id,
          amount: parsedAmount,
          description: combinedMemo || 'Admin Treasury Injection'
        });
        setStatus({
          type: 'success',
          text: `Directly credited ₹${parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to ${selectedAcc.accountNumber}. Double-entry balanced via SYSTEM_FUNDING.`
        });
      } else {
        // Maker-Checker Deposit Request (Requires Admin Approval)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-[#e5ede3] rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-[#6c8a77] hover:text-[#122a1f] transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <div className="flex items-center space-x-1.5 text-[10px] font-mono uppercase tracking-widest text-[#5c7c6a]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#133e2b]" />
            <span>{isAdmin && mode === 'direct' ? 'TREASURY DIRECT INJECTION' : 'MAKER-CHECKER DEPOSIT'}</span>
          </div>
          <h3 className="font-serif text-2xl font-normal text-[#122a1f] mt-0.5">
            {isAdmin && mode === 'direct' ? 'Direct Deposit' : 'Request Deposit'}
          </h3>
          <p className="text-xs text-[#52705e] mt-1 leading-relaxed">
            {isAdmin && mode === 'direct'
              ? 'Administrator authority: credits customer account and atomically debits SYSTEM_FUNDING.'
              : 'Deposits require dual-control verification by an administrator before ledger balances are credited.'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex bg-[#f2f6f1] p-1 rounded-xl mb-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode('request')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                mode === 'request'
                  ? 'bg-white text-[#122a1f] shadow-xs font-semibold'
                  : 'text-[#5c7c6a] hover:text-[#122a1f]'
              }`}
            >
              Submit for Approval
            </button>
            <button
              type="button"
              onClick={() => setMode('direct')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                mode === 'direct'
                  ? 'bg-[#133e2b] text-white shadow-xs font-semibold'
                  : 'text-[#5c7c6a] hover:text-[#122a1f]'
              }`}
            >
              Direct Admin Credit
            </button>
          </div>
        )}

        {status && (
          <div className={`p-3.5 rounded-xl text-xs mb-4 flex items-start space-x-2 ${
            status.type === 'success'
              ? 'bg-[#eaf2e8] text-[#133e2b] border border-[#cbdec7]'
              : 'bg-[#fff5f5] text-[#b91c1c] border border-[#fed7d7]'
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
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
              Destination Account
            </label>
            <select
              value={targetAccount}
              onChange={(e) => setTargetAccount(e.target.value)}
              className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2.5 text-xs text-[#122a1f] font-mono focus:outline-none focus:border-[#133e2b]"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.accountNumber || acc.id}>
                  {acc.accountNumber} ({acc.currency}) — Balance: ₹{Number(acc.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
              Deposit Amount (₹ INR)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-mono text-[#6c8a77]">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="1000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl pl-8 pr-3 py-2.5 text-xs text-[#122a1f] font-mono focus:outline-none focus:border-[#133e2b]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
              Wire UTR / Inward Reference
            </label>
            <input
              type="text"
              placeholder="e.g. UTR-20261111-998234 or Bank Ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2.5 text-xs text-[#122a1f] focus:outline-none focus:border-[#133e2b]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
              Settlement Notes / Memo
            </label>
            <input
              type="text"
              placeholder="e.g. Customer Inward Remittance"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2.5 text-xs text-[#122a1f] focus:outline-none focus:border-[#133e2b]"
            />
          </div>

          <div className="p-3 bg-[#f7f9f6] border border-[#e5ede3] rounded-xl flex items-center space-x-2 text-[11px] text-[#52705e]">
            <Clock className="w-4 h-4 text-[#5c7c6a] shrink-0" />
            <span>
              {mode === 'direct' && isAdmin
                ? 'Direct transaction: executes immediately against ACC-SYSTEM-FUNDING.'
                : 'Maker-Checker rule: Admin approval is required before ledger balances are credited.'}
            </span>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-[#52705e] hover:text-[#122a1f]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !amount}
              className="px-5 py-2.5 bg-[#133e2b] hover:bg-[#0e2e1f] disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-sm"
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
