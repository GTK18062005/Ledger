import React, { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  ArrowUpRight,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Landmark
} from 'lucide-react';
import { api } from '../api';

export default function OperationsDeskTab({ user, accounts = [], onRefresh }) {
  const isAdmin = user?.role === 'ADMIN';
  const customerAccounts = accounts.filter(
    (a) => !a.isSystem && !a.accountNumber?.startsWith('ACC-SYSTEM')
  );
  const activeAccounts = customerAccounts.filter((a) => a.status === 'ACTIVE');

  const [mode, setMode] = useState(isAdmin ? 'admin-deposit' : 'deposit-request');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [destinationAccount, setDestinationAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [depositRequests, setDepositRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [requestFilter, setRequestFilter] = useState('PENDING');

  const formatInr = (val) => {
    const num = parseFloat(val) || 0;
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  useEffect(() => {
    if (!selectedAccountId && activeAccounts.length > 0) {
      setSelectedAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, selectedAccountId]);

  const loadDepositRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const data = await api.getDepositRequests();
      setDepositRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setDepositRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadDepositRequests();
  }, [loadDepositRequests]);

  const selectedAccount =
    activeAccounts.find((a) => a.id === selectedAccountId) || activeAccounts[0] || null;

  const handleSubmitOperation = async (e) => {
    e.preventDefault();
    setFeedback(null);

    const parsedAmount = parseFloat(amount);
    if (!selectedAccount) {
      setFeedback({ type: 'error', text: 'Select an active platform account first.' });
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setFeedback({ type: 'error', text: 'Enter a valid positive amount greater than zero.' });
      return;
    }

    if ((mode === 'withdraw' || mode === 'transfer') && parsedAmount > parseFloat(selectedAccount.balance || 0)) {
      setFeedback({
        type: 'error',
        text: `Insufficient funds: negative balances are strictly blocked (Available: ${formatInr(selectedAccount.balance)}).`
      });
      return;
    }

    if (mode === 'transfer' && !destinationAccount.trim()) {
      setFeedback({ type: 'error', text: 'Enter a destination account number or UUID.' });
      return;
    }

    setSubmitting(true);
    try {
      const combinedMemo = reference.trim()
        ? `Ref: ${reference.trim()} | ${memo.trim() || 'Treasury Desk Operation'}`
        : memo.trim();

      if (mode === 'admin-deposit' && isAdmin) {
        await api.adminDeposit({
          accountId: selectedAccount.id,
          amount: parsedAmount,
          description: combinedMemo || 'Administrator Treasury Credit'
        });
        setFeedback({
          type: 'success',
          text: `Credited ${formatInr(parsedAmount)} to ${selectedAccount.accountNumber} via atomic SYSTEM_FUNDING debit.`
        });
      } else if (mode === 'deposit-request') {
        await api.createDepositRequest({
          accountId: selectedAccount.id,
          amount: parsedAmount,
          referenceMemo: combinedMemo || 'External Inward Deposit Request'
        });
        setFeedback({
          type: 'success',
          text: `Submitted deposit request for ${formatInr(parsedAmount)} to ${selectedAccount.accountNumber} (Pending Admin approval).`
        });
      } else if (mode === 'withdraw') {
        await api.withdraw({
          accountId: selectedAccount.id,
          amount: parsedAmount,
          description: combinedMemo || 'Customer Liquidity Withdrawal'
        });
        setFeedback({
          type: 'success',
          text: `Withdrew ${formatInr(parsedAmount)} from ${selectedAccount.accountNumber}. Double-entry ledger balanced.`
        });
      } else if (mode === 'transfer') {
        await api.transfer({
          sourceAccountId: selectedAccount.id,
          destinationAccountId: destinationAccount.trim(),
          amount: parsedAmount,
          description: combinedMemo || 'Customer Peer Transfer'
        });
        setFeedback({
          type: 'success',
          text: `Transferred ${formatInr(parsedAmount)} from ${selectedAccount.accountNumber} to ${destinationAccount.trim()}.`
        });
      }

      setAmount('');
      setReference('');
      setMemo('');
      if (mode === 'transfer') setDestinationAccount('');
      await loadDepositRequests();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Operation could not be completed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewRequest = async (id, action) => {
    setProcessingRequestId(id);
    setFeedback(null);
    try {
      if (action === 'approve') {
        await api.approveDepositRequest(id, 'Approved via Operations & Liquidity Desk');
        setFeedback({
          type: 'success',
          text: 'Deposit request authorized and posted atomically to double-entry ledger.'
        });
      } else {
        await api.rejectDepositRequest(id, 'Declined during Operations & Liquidity verification');
        setFeedback({
          type: 'success',
          text: 'Deposit request declined and logged to immutable audit trail.'
        });
      }
      await loadDepositRequests();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Review action failed.' });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const filteredRequests = depositRequests.filter(
    (r) => requestFilter === 'ALL' || r.status === requestFilter
  );

  const pendingCount = depositRequests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-8 pb-16">
      {/* Editorial Header */}
      <div className="bg-[#eaf2e8] border border-[#d8e7d5] rounded-3xl p-7 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#40624c] flex items-center space-x-1.5 mb-2">
            <span>✱</span>
            <span>OPERATIONS &amp; LIQUIDITY DESK</span>
          </div>
          <h1 className="text-3xl font-serif font-normal text-[#122a1f]">
            Deposit &amp; Withdraw Operations
          </h1>
          <p className="text-xs sm:text-sm text-[#4d6e58] mt-1.5 max-w-2xl">
            Execute dual-control deposit authorizations, non-negative liquidity withdrawals, and atomic peer settlements guarded by pessimistic row locking.
          </p>
        </div>

        <button
          onClick={() => {
            loadDepositRequests();
            if (onRefresh) onRefresh();
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white border border-[#d6e4d2] hover:bg-[#f2f6f0] text-xs font-medium text-[#122a1f] transition self-start lg:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#133e2b] ${loadingRequests ? 'animate-spin' : ''}`} />
          <span>Sync Liquidity State</span>
        </button>
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

      {/* Two-Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Execution Desk */}
        <div className="lg:col-span-5 bg-white border border-[#e5ede3] rounded-3xl p-6 shadow-xs space-y-5">
          <div>
            <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#5c7c6a]">
              {isAdmin ? 'Treasury Execution' : 'Self-Service Desk'}
            </p>
            <h2 className="font-serif text-xl text-[#122a1f] mt-0.5">
              Initiate Movement
            </h2>
          </div>

          {/* Action Mode Switcher */}
          <div className="flex flex-wrap gap-1.5 bg-[#f4f8f2] p-1.5 rounded-2xl border border-[#e2ece0]">
            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => { setMode('admin-deposit'); setFeedback(null); }}
                  className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                    mode === 'admin-deposit'
                      ? 'bg-[#133e2b] text-white shadow-xs'
                      : 'text-[#395745] hover:bg-white'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Direct Treasury Credit</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('deposit-request'); setFeedback(null); }}
                  className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                    mode === 'deposit-request'
                      ? 'bg-[#133e2b] text-white shadow-xs'
                      : 'text-[#395745] hover:bg-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Stage Request</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { setMode('deposit-request'); setFeedback(null); }}
                  className={`flex-1 flex items-center justify-center space-x-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition ${
                    mode === 'deposit-request'
                      ? 'bg-[#133e2b] text-white shadow-xs'
                      : 'text-[#395745] hover:bg-white'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Deposit</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('withdraw'); setFeedback(null); }}
                  className={`flex-1 flex items-center justify-center space-x-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition ${
                    mode === 'withdraw'
                      ? 'bg-[#133e2b] text-white shadow-xs'
                      : 'text-[#395745] hover:bg-white'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Withdraw</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('transfer'); setFeedback(null); }}
                  className={`flex-1 flex items-center justify-center space-x-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition ${
                    mode === 'transfer'
                      ? 'bg-[#133e2b] text-white shadow-xs'
                      : 'text-[#395745] hover:bg-white'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Transfer</span>
                </button>
              </>
            )}
          </div>

          <form onSubmit={handleSubmitOperation} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#5b7566] mb-1.5">
                {mode === 'transfer' ? 'Source Account' : 'Target Active Account'}
              </label>
              <select
                value={selectedAccount?.id || ''}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                disabled={activeAccounts.length === 0}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#dce6d8] bg-[#f9fbf8] text-xs font-mono text-[#122a1f] focus:outline-none focus:border-[#133e2b]"
              >
                {activeAccounts.length === 0 ? (
                  <option value="">No active accounts available</option>
                ) : (
                  activeAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountNumber} · {acc.ownerEmail || acc.accountType} ({formatInr(acc.balance)})
                    </option>
                  ))
                )}
              </select>
              {selectedAccount && (
                <p className="text-[11px] font-mono text-[#52705e] mt-1">
                  Available vault balance:{' '}
                  <span className="font-semibold text-[#133e2b]">{formatInr(selectedAccount.balance)}</span>
                </p>
              )}
            </div>

            {mode === 'transfer' && (
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#5b7566] mb-1.5">
                  Destination Account Number
                </label>
                <input
                  type="text"
                  value={destinationAccount}
                  onChange={(e) => setDestinationAccount(e.target.value)}
                  placeholder="e.g. ACC-2001 or UUID"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#dce6d8] bg-[#f9fbf8] text-xs font-mono text-[#122a1f] placeholder-[#89a293] focus:outline-none focus:border-[#133e2b]"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#5b7566] mb-1.5">
                Amount (INR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#dce6d8] bg-[#f9fbf8] text-sm font-mono font-semibold text-[#122a1f] placeholder-[#89a293] focus:outline-none focus:border-[#133e2b]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#5b7566] mb-1.5">
                  Reference ID (Optional)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="UTR / Wire Ref"
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6d8] bg-[#f9fbf8] text-xs text-[#122a1f] placeholder-[#89a293] focus:outline-none focus:border-[#133e2b]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#5b7566] mb-1.5">
                  Ledger Memo
                </label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Settlement description"
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6d8] bg-[#f9fbf8] text-xs text-[#122a1f] placeholder-[#89a293] focus:outline-none focus:border-[#133e2b]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || activeAccounts.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-[#133e2b] hover:bg-[#194e37] disabled:opacity-50 text-white text-xs font-semibold transition flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Executing Atomic Posting...'
                  : mode === 'admin-deposit'
                    ? 'Authorize Direct Treasury Credit'
                    : mode === 'deposit-request'
                      ? 'Submit Deposit Request'
                      : mode === 'withdraw'
                        ? 'Execute Verified Withdrawal'
                        : 'Settle Peer Transfer'}
              </span>
            </button>
          </form>
        </div>

        {/* Right: Maker-Checker Deposit Queue / Status */}
        <div className="lg:col-span-7 bg-white border border-[#e5ede3] rounded-3xl p-6 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#5c7c6a]">
                Maker-Checker Pipeline
              </p>
              <h2 className="font-serif text-xl text-[#122a1f] mt-0.5 flex items-center gap-2">
                <span>{isAdmin ? 'Deposit Authorization Queue' : 'Your Deposit Requests'}</span>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#eaf2e8] text-[#133e2b] border border-[#cde0ca]">
                    {pendingCount} Pending
                  </span>
                )}
              </h2>
            </div>

            <div className="flex items-center space-x-1 bg-[#f4f8f2] p-1 rounded-xl border border-[#e2ece0] self-start">
              {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setRequestFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition ${
                    requestFilter === f
                      ? 'bg-[#133e2b] text-white'
                      : 'text-[#4c6b58] hover:text-[#122a1f]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center bg-[#f8fbf7] rounded-2xl border border-dashed border-[#d9e7d6]">
              <Landmark className="w-7 h-7 text-[#6b8b78] mb-2" />
              <p className="text-sm font-serif text-[#122a1f]">No {requestFilter.toLowerCase()} deposit requests</p>
              <p className="text-xs text-[#698675] mt-1 max-w-sm">
                All external funding submissions and administrator dual-control reviews appear here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-[#f8fbf7] border border-[#e2ece0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-mono text-xs font-bold text-[#122a1f]">
                        {req.accountNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                      <span className="font-mono text-xs font-semibold text-[#133e2b]">
                        {formatInr(req.amount)}
                      </span>
                    </div>
                    <p className="text-xs text-[#3f5d4b] truncate">
                      {req.referenceMemo || 'Inward funding request'}
                    </p>
                    <p className="text-[11px] font-mono text-[#698675]">
                      {req.requesterEmail} · {req.createdAt ? new Date(req.createdAt).toLocaleString() : '—'}
                    </p>
                    {req.adminNotes && req.status !== 'PENDING' && (
                      <p className="text-[11px] text-[#456150] italic">
                        Review note: {req.adminNotes}
                      </p>
                    )}
                  </div>

                  {isAdmin && req.status === 'PENDING' && (
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        disabled={processingRequestId === req.id}
                        onClick={() => handleReviewRequest(req.id, 'approve')}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#133e2b] hover:bg-[#194e37] text-white text-xs font-medium transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        disabled={processingRequestId === req.id}
                        onClick={() => handleReviewRequest(req.id, 'reject')}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-medium transition disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

