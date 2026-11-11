import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../api';

export default function WithdrawModal({ isOpen, onClose, accounts, user, onRefresh }) {
  if (!isOpen) return null;

  const [sourceAccount, setSourceAccount] = useState(accounts[0]?.accountNumber || accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('External Settlement Withdrawal');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const selectedAcc = accounts.find(a => a.accountNumber === sourceAccount || a.id === sourceAccount) || accounts[0];
  const maxAvailable = Math.max(0, parseFloat(selectedAcc?.balance || 0));
  const numAmount = parseFloat(amount) || 0;
  const isOverdraft = numAmount > maxAvailable;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || numAmount <= 0) {
      setStatus({ type: 'error', text: 'Please enter a valid positive withdrawal amount.' });
      return;
    }
    if (isOverdraft) {
      setStatus({ type: 'error', text: `Cannot withdraw ₹${numAmount.toFixed(2)}. Available balance is ₹${maxAvailable.toFixed(2)}. Negative balances are prohibited.` });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const payload = {
        accountId: selectedAcc.id,
        amount: numAmount,
        description: memo.trim() || 'External Settlement Withdrawal'
      };

      await api.withdraw(payload);
      setStatus({
        type: 'success',
        text: `Successfully withdrew ₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Credited to SYSTEM_SETTLEMENT.`
      });
      setAmount('');
      if (onRefresh) await onRefresh();
      setTimeout(() => {
        onClose();
        setStatus(null);
      }, 1500);
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Withdrawal failed' });
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
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#5c7c6a]">
            DOUBLE-ENTRY SETTLEMENT
          </div>
          <h3 className="font-serif text-2xl font-normal text-[#122a1f] mt-0.5">
            Withdraw funds
          </h3>
          <p className="text-xs text-[#52705e] mt-1">
            Debits your account and credits SYSTEM_SETTLEMENT to clear funds externally.
          </p>
        </div>

        {status && (
          <div className={`p-3.5 rounded-xl text-xs mb-4 flex items-center space-x-2 ${
            status.type === 'success'
              ? 'bg-[#eaf2e8] text-[#133e2b] border border-[#cbdec7]'
              : 'bg-[#fff5f5] text-[#b91c1c] border border-[#fed7d7]'
          }`}>
            {status.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{status.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#1e3c2c]">
                Select Source Account
              </label>
              <span className="text-[11px] font-mono font-medium text-[#2d5c41]">
                Available: ₹{maxAvailable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <select
              value={sourceAccount}
              onChange={(e) => setSourceAccount(e.target.value)}
              className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2.5 text-xs text-[#122a1f] font-mono focus:outline-none focus:border-[#133e2b]"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.accountNumber || acc.id}>
                  {acc.accountNumber} ({acc.currency}) — ₹{Math.max(0, parseFloat(acc.balance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#1e3c2c]">
                Amount (₹ INR)
              </label>
              <button
                type="button"
                onClick={() => setAmount(maxAvailable.toString())}
                className="text-[10px] font-mono uppercase font-bold text-[#133e2b] bg-[#eaf2e8] hover:bg-[#d8e8d5] px-2 py-0.5 rounded border border-[#cbdec7] transition"
              >
                Use Max (₹{maxAvailable.toFixed(2)})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-mono text-[#6c8a77]">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxAvailable}
                required
                placeholder="500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full bg-[#f8faf7] border rounded-xl pl-8 pr-16 py-2.5 text-xs text-[#122a1f] font-mono focus:outline-none transition ${
                  isOverdraft
                    ? 'border-rose-400 focus:border-rose-600 bg-rose-50/40'
                    : 'border-[#d6e2d4] focus:border-[#133e2b]'
                }`}
              />
              <span className="absolute right-3.5 top-2.5 text-[10px] font-mono text-[#6c8a77]">INR</span>
            </div>

            {isOverdraft && (
              <div className="mt-1.5 text-[11px] text-rose-600 flex items-center space-x-1 font-sans">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Overdraft prohibited. Maximum available balance is ₹{maxAvailable.toFixed(2)}.</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
              Settlement Memo (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Bank payout to external checking account"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2.5 text-xs text-[#122a1f] focus:outline-none focus:border-[#133e2b]"
            />
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
              disabled={submitting || !amount || numAmount <= 0 || isOverdraft}
              className="px-5 py-2.5 bg-[#133e2b] hover:bg-[#0e2e1f] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition shadow-sm"
            >
              {submitting ? 'Executing Settlement...' : isOverdraft ? 'Insufficient Funds' : 'Confirm Withdrawal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

