import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  ShieldCheck,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { api } from '../api';

export default function PlatformTransactionsTab({
  user,
  mode = 'admin-transactions',
  onRefresh
}) {
  const isAdmin = user?.role === 'ADMIN';
  const isReversalMode = mode === 'admin-reversals';

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(isReversalMode ? 'ELIGIBLE' : 'ALL');
  const [feedback, setFeedback] = useState(null);

  const [reversalTarget, setReversalTarget] = useState(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);

  const formatInr = (val) => {
    const num = parseFloat(val) || 0;
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTransactions();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load platform ledger.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    setTypeFilter(isReversalMode ? 'ELIGIBLE' : 'ALL');
  }, [isReversalMode]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (typeFilter === 'ELIGIBLE') {
        if (tx.reversed || tx.transactionType === 'REVERSAL') return false;
      } else if (typeFilter !== 'ALL' && tx.transactionType !== typeFilter) {
        return false;
      }

      if (!q) return true;
      return (
        tx.transactionId?.toLowerCase().includes(q) ||
        tx.referenceMemo?.toLowerCase().includes(q) ||
        tx.transactionType?.toLowerCase().includes(q) ||
        tx.sourceAccountNumber?.toLowerCase().includes(q) ||
        tx.destinationAccountNumber?.toLowerCase().includes(q) ||
        tx.initiatedByEmail?.toLowerCase().includes(q)
      );
    });
  }, [transactions, typeFilter, searchQuery]);

  const handleConfirmReversal = async (e) => {
    e.preventDefault();
    if (!reversalTarget) return;
    if (!reversalReason.trim()) {
      setFeedback({ type: 'error', text: 'Provide an explicit audit reason before reversing a ledger transaction.' });
      return;
    }

    setReversing(true);
    setFeedback(null);
    try {
      const result = await api.reverseTransaction(reversalTarget.transactionId, reversalReason.trim());
      setFeedback({
        type: 'success',
        text: `Compensating REVERSAL posted (${result.transactionId.slice(0, 8)}...) for ${formatInr(result.amount)}. Original ledger preserved immutably.`
      });
      setReversalTarget(null);
      setReversalReason('');
      await loadTransactions();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Reversal blocked (non-negative balance invariant or duplicate reversal check).'
      });
    } finally {
      setReversing(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['TransactionID', 'CreatedAt', 'Type', 'Status', 'Source', 'Destination', 'AmountINR', 'Balanced', 'Reversed', 'InitiatedBy', 'Memo'];
    const rows = filteredTransactions.map((tx) => [
      tx.transactionId,
      tx.createdAt || '',
      tx.transactionType,
      tx.status,
      tx.sourceAccountNumber || 'SYSTEM',
      tx.destinationAccountNumber || 'SYSTEM',
      tx.amount,
      tx.invariantBalanced ? 'BALANCED' : 'VARIANCE',
      tx.reversed ? 'YES' : 'NO',
      tx.initiatedByEmail || '',
      `"${(tx.referenceMemo || '').replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ledgerline-platform-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const headerTitle = isReversalMode
    ? 'Reversal Management'
    : mode === 'statements'
      ? 'Platform Transactions'
      : 'Transaction Management';

  const filterChips = isReversalMode
    ? [
        { id: 'ELIGIBLE', label: 'Eligible for Reversal' },
        { id: 'REVERSAL', label: 'Compensating Reversals' },
        { id: 'ALL', label: 'Full Ledger' }
      ]
    : [
        { id: 'ALL', label: 'All Types' },
        { id: 'DEPOSIT', label: 'Deposits' },
        { id: 'WITHDRAWAL', label: 'Withdrawals' },
        { id: 'TRANSFER', label: 'Transfers' },
        { id: 'REVERSAL', label: 'Reversals' }
      ];

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-[#eaf2e8] border border-[#d8e7d5] rounded-3xl p-7 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#40624c] flex items-center space-x-1.5 mb-2">
            <span>✱</span>
            <span>
              {isReversalMode
                ? 'COMPENSATING DOUBLE-ENTRY CORRECTIONS'
                : 'IMMUTABLE PLATFORM JOURNAL'}
            </span>
          </div>
          <h1 className="text-3xl font-serif font-normal text-[#122a1f]">{headerTitle}</h1>
          <p className="text-xs sm:text-sm text-[#4d6e58] mt-1.5 max-w-2xl">
            {isReversalMode
              ? 'Execute compensating double-entry reversal postings that swap historical debits and credits without mutating past records or permitting negative balances.'
              : 'Inspect every cross-vault deposit, withdrawal, peer transfer, and compensating reversal across the platform ledger.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredTransactions.length === 0}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white border border-[#d6e4d2] hover:bg-[#f2f6f0] disabled:opacity-50 text-xs font-medium text-[#122a1f] transition"
          >
            <Download className="w-4 h-4 text-[#133e2b]" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={loadTransactions}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#133e2b] hover:bg-[#194e37] text-xs font-semibold text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-start space-x-2.5 p-4 rounded-2xl text-xs border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
          )}
          <span className="font-medium leading-relaxed">{feedback.text}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#5b7566] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by account, actor email, memo, or TX UUID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#dce6d8] bg-[#f9fbf8] text-xs text-[#122a1f] placeholder-[#89a293] focus:outline-none focus:border-[#133e2b]"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 bg-[#f4f8f2] p-1.5 rounded-2xl border border-[#e2ece0]">
            {filterChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setTypeFilter(chip.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-semibold transition ${
                  typeFilter === chip.id
                    ? 'bg-[#133e2b] text-white'
                    : 'text-[#4c6b58] hover:text-[#122a1f]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e5ede3] text-[10px] font-mono uppercase tracking-wider text-[#698675]">
                <th className="py-3 pr-4">Timestamp &amp; Memo</th>
                <th className="py-3 px-3">Flow (DR → CR)</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Invariant</th>
                <th className="py-3 px-3 text-right">Amount</th>
                {isAdmin && <th className="py-3 pl-3 text-right">Reversal Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef3ec] text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-[#698675]">
                    {loading ? 'Loading platform journal...' : 'No transactions match the selected filter.'}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const canReverse = isAdmin && !tx.reversed && tx.transactionType !== 'REVERSAL';
                  return (
                    <tr key={tx.transactionId} className="hover:bg-[#f8fbf7] transition">
                      <td className="py-3.5 pr-4">
                        <p className="font-medium text-[#122a1f] max-w-xs truncate">
                          {tx.referenceMemo || tx.transactionType}
                        </p>
                        <p className="text-[11px] font-mono text-[#698675] mt-0.5">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '—'} ·{' '}
                          {tx.initiatedByEmail || 'SYSTEM'}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px] text-[#2a4536]">
                        {tx.sourceAccountNumber || 'SYSTEM'} → {tx.destinationAccountNumber || 'SYSTEM'}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                              tx.transactionType === 'REVERSAL'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-[#f2f6f0] text-[#133e2b] border-[#dde8da]'
                            }`}
                          >
                            {tx.transactionType}
                          </span>
                          {tx.reversed && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                              REVERSED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                            tx.invariantBalanced
                              ? 'bg-[#eaf2e8] text-[#133e2b]'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>{tx.invariantBalanced ? 'BALANCED' : 'VARIANCE'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-[#122a1f]">
                        {formatInr(tx.amount)}
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 pl-3 text-right">
                          {canReverse ? (
                            <button
                              type="button"
                              onClick={() => {
                                setReversalTarget(tx);
                                setReversalReason('');
                              }}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white border border-[#d6e4d2] hover:bg-[#eaf2e8] text-[#133e2b] text-[11px] font-medium transition"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reverse Entry</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono text-[#7a9685]">
                              {tx.transactionType === 'REVERSAL'
                                ? 'Compensating Tx'
                                : tx.reversed
                                  ? 'Already Reversed'
                                  : 'Immutable'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reversal Confirmation Modal */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#e5ede3] rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative space-y-5">
            <button
              type="button"
              onClick={() => setReversalTarget(null)}
              className="absolute right-5 top-5 text-[#6c8a77] hover:text-[#122a1f]"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#5c7c6a]">
                Double-Entry Compensation
              </p>
              <h3 className="font-serif text-2xl text-[#122a1f] mt-0.5">
                Confirm Transaction Reversal
              </h3>
              <p className="text-xs text-[#52705e] mt-1 leading-relaxed">
                This posts a new immutable <span className="font-mono font-semibold">REVERSAL</span>{' '}
                transaction swapping debits and credits. If reversing pushes a customer vault below zero, it is atomically rejected.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#f7faf6] border border-[#e2ece0] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#5c7c6a]">Original Type:</span>
                <span className="font-mono font-semibold text-[#122a1f]">{reversalTarget.transactionType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5c7c6a]">Amount:</span>
                <span className="font-mono font-bold text-[#133e2b]">{formatInr(reversalTarget.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5c7c6a]">Path:</span>
                <span className="font-mono text-[#122a1f]">
                  {reversalTarget.sourceAccountNumber || 'SYSTEM'} → {reversalTarget.destinationAccountNumber || 'SYSTEM'}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmReversal} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#5b7566] mb-1.5">
                  Mandatory Audit Reason
                </label>
                <textarea
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Duplicate instruction raised by treasury settlement team"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#dce6d8] bg-[#f9fbf8] text-xs text-[#122a1f] placeholder-[#89a293] focus:outline-none focus:border-[#133e2b]"
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setReversalTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#d6e4d2] text-xs font-medium text-[#122a1f] hover:bg-[#f2f6f0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversing}
                  className="flex-1 py-2.5 rounded-xl bg-[#133e2b] hover:bg-[#194e37] disabled:opacity-50 text-xs font-semibold text-white"
                >
                  {reversing ? 'Posting Compensation...' : 'Post Reversal Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

