import React, { useState, useEffect } from 'react';
import { Send, ArrowRightLeft, PlusCircle, MinusCircle, RefreshCw, Repeat, ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle, Copy, Info } from 'lucide-react';
import { generateUUID } from '../api';

export default function TransferForm({ accounts, user, onExecuteTransfer, onExecuteDeposit, onExecuteWithdraw, onRefreshAccounts }) {
  const [activeTab, setActiveTab] = useState('transfer'); // 'transfer', 'withdraw', 'deposit'
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destAccountId, setDestAccountId] = useState('');
  const [amount, setAmount] = useState('100.00');
  const [description, setDescription] = useState('');

  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [lastExecutedKey, setLastExecutedKey] = useState(null);
  const [lastPayload, setLastPayload] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isSimulatedRetry, setIsSimulatedRetry] = useState(false);

  // Auto-generate fresh idempotency key on mount or tab change
  useEffect(() => {
    generateNewKey();
  }, [activeTab]);

  useEffect(() => {
    if (accounts.length > 0 && !sourceAccountId) {
      setSourceAccountId(accounts[0].id);
    }
    if (accounts.length > 1 && !destAccountId) {
      setDestAccountId(accounts[1].id);
    }
  }, [accounts]);

  const generateNewKey = () => {
    setIdempotencyKey(generateUUID());
    setIsSimulatedRetry(false);
  };

  const handleSimulateRetry = () => {
    if (!lastExecutedKey || !lastPayload) return;
    setIdempotencyKey(lastExecutedKey);
    setIsSimulatedRetry(true);
    handleSubmit(null, lastExecutedKey, lastPayload);
  };

  const handleSubmit = async (e, forcedKey = null, forcedPayload = null) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    const keyToUse = forcedKey || idempotencyKey || generateUUID();
    const payload = forcedPayload || {
      sourceAccountId,
      destAccountId,
      amount: parseFloat(amount) || 0,
      description
    };

    const startTime = performance.now();

    try {
      let res;
      if (activeTab === 'transfer') {
        res = await onExecuteTransfer({
          sourceAccountId: payload.sourceAccountId,
          destinationAccountId: payload.destAccountId,
          amount: payload.amount,
          description: payload.description
        }, keyToUse);
      } else if (activeTab === 'withdraw') {
        res = await onExecuteWithdraw({
          accountId: payload.sourceAccountId,
          amount: payload.amount,
          description: payload.description
        }, keyToUse);
      } else if (activeTab === 'deposit') {
        res = await onExecuteDeposit({
          accountId: payload.sourceAccountId,
          amount: payload.amount,
          description: payload.description
        }, keyToUse);
      }

      const elapsedMs = Math.round(performance.now() - startTime);

      setResult({
        data: res,
        key: keyToUse,
        latencyMs: elapsedMs,
        isRetry: forcedKey !== null || isSimulatedRetry
      });

      setLastExecutedKey(keyToUse);
      setLastPayload(payload);

      if (!forcedKey) {
        // Prepare next fresh key
        setIdempotencyKey(generateUUID());
        setIsSimulatedRetry(false);
      }

      onRefreshAccounts();
    } catch (err) {
      setError(err.message || 'Transaction failed');
      onRefreshAccounts();
    } finally {
      setSubmitting(false);
    }
  };

  const isAuditor = user.role === 'AUDITOR';

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <ArrowRightLeft className="w-5 h-5 text-sky-400" />
            <span>Fund Movement & Double-Entry Engine</span>
          </h2>
          <p className="text-xs text-slate-400">
            Atomic ACID operations with deterministic locking and distributed idempotency.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('transfer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'transfer' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Transfer (Zero-Sum)
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'withdraw' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Withdraw
          </button>
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'deposit' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Deposit
          </button>
        </div>
      </div>

      {isAuditor && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
          <span>
            <strong>Auditor Mode Active:</strong> You are signed in with the AUDITOR role. Write operations are strictly blocked by Spring Security.
          </span>
        </div>
      )}

      {/* Idempotency Key Ribbon */}
      <div className="mb-5 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="text-slate-400">Active Header </span>
            <span className="font-mono font-semibold text-sky-400">Idempotency-Key:</span>
            <div className="font-mono text-[11px] text-slate-300 select-all truncate max-w-[280px] sm:max-w-md">
              {idempotencyKey}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={generateNewKey}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
            title="Generate a new UUID"
          >
            <RefreshCw className="w-3 h-3" />
            <span>New Key</span>
          </button>

          {lastExecutedKey && (
            <button
              type="button"
              onClick={handleSimulateRetry}
              disabled={submitting}
              className="flex items-center space-x-1 text-xs text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-3 py-1.5 rounded-lg transition font-semibold"
              title="Replays the exact same Idempotency-Key to test cached response"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Simulate Network Retry</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Transaction Refused / Error</div>
            <div className="mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {result && (
        <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Transaction {result.data.status}</span>
            </div>
            {result.isRetry ? (
              <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                ⚡ Cached Idempotent Response ({result.latencyMs}ms)
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                Fresh Execution ({result.latencyMs}ms)
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono pt-1">
            <div>Tx ID: <span className="text-white">{result.data.transactionId}</span></div>
            <div>Amount: <span className="text-white">₹{result.data.amount}</span></div>
            <div>Idempotency Key: <span className="text-slate-400 truncate block">{result.key}</span></div>
            <div>Timestamp: <span className="text-white">{new Date(result.data.timestamp).toLocaleTimeString()}</span></div>
          </div>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Source Account */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Source Account (Debited)
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountNumber} (Bal: ₹{acc.balance}) - {acc.ownerEmail}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Account (Only for Transfer) */}
          {activeTab === 'transfer' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Destination Account (Credited)
              </label>
              <select
                value={destAccountId}
                onChange={(e) => setDestAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} disabled={acc.id === sourceAccountId}>
                    {acc.accountNumber} (Bal: ₹{acc.balance}) - {acc.ownerEmail} {acc.id === sourceAccountId ? '(Source)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Operation Type
              </label>
              <div className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono">
                {activeTab === 'withdraw' ? 'Debit from Vault' : 'Credit to Vault'}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Amount (₹ INR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Memo / Purpose (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Invoice settlement or payroll"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting || isAuditor}
            className="flex items-center space-x-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-sky-500/20 transition"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Double-Entry Atomicity...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>
                  Submit {activeTab === 'transfer' ? 'Transfer' : activeTab === 'withdraw' ? 'Withdrawal' : 'Deposit'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
