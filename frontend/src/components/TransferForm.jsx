import React, { useState, useEffect } from 'react';
import { Send, ArrowRightLeft, PlusCircle, MinusCircle, RefreshCw, Repeat, ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle, Copy, Info, Check } from 'lucide-react';
import { generateUUID } from '../api';

export default function TransferForm({
  accounts,
  user,
  onExecuteTransfer,
  onExecuteDeposit,
  onExecuteWithdraw,
  onRefreshAccounts
}) {
  const [activeTab, setActiveTab] = useState('transfer'); // 'transfer', 'withdraw', 'deposit'
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destAccountId, setDestAccountId] = useState('');
  const [amount, setAmount] = useState('100.00');
  const [description, setDescription] = useState('');

  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [lastExecutedKey, setLastExecutedKey] = useState(null);
  const [lastPayload, setLastPayload] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

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

  const handleCopyKey = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(idempotencyKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
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
        // Auto-generate fresh key for next unique operation
        setIdempotencyKey(generateUUID());
      }

      if (onRefreshAccounts) {
        onRefreshAccounts();
      }
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-obsidian-850 border border-obsidian-750 rounded-xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header and Operation Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-obsidian-750">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <span>Double-Entry Financial Mutation</span>
          </h2>
          <p className="text-xs text-slate-400">
            Atomic transactions with deterministic lexicographical locking and database-backed idempotency.
          </p>
        </div>

        {/* Operation Tabs */}
        <div className="flex items-center bg-obsidian-950 p-1 rounded-lg border border-obsidian-750">
          <button
            onClick={() => { setActiveTab('transfer'); setResult(null); setError(null); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'transfer'
                ? 'bg-obsidian-800 text-white shadow-sm border border-obsidian-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>P2P Transfer</span>
          </button>

          <button
            onClick={() => { setActiveTab('deposit'); setResult(null); setError(null); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'deposit'
                ? 'bg-obsidian-800 text-white shadow-sm border border-obsidian-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>External Deposit</span>
          </button>

          <button
            onClick={() => { setActiveTab('withdraw'); setResult(null); setError(null); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'withdraw'
                ? 'bg-obsidian-800 text-white shadow-sm border border-obsidian-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MinusCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>External Withdraw</span>
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
        {/* Account Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
              {activeTab === 'deposit' ? 'Target Customer Account (Credit)' : 'Source Account (Debit)'}
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountNumber} ({acc.ownerEmail || 'Owner'}) — {parseFloat(acc.balance).toFixed(4)} {acc.currency} [{acc.status}]
                </option>
              ))}
            </select>
          </div>

          {activeTab === 'transfer' ? (
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                Destination Account (Credit)
              </label>
              <select
                value={destAccountId}
                onChange={(e) => setDestAccountId(e.target.value)}
                className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} ({acc.ownerEmail || 'Owner'}) — {parseFloat(acc.balance).toFixed(4)} {acc.currency} [{acc.status}]
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-mono font-medium text-slate-400 mb-1">
                Balancing System Clearing Entity
              </label>
              <div className="w-full bg-obsidian-950/60 border border-obsidian-800 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono flex items-center justify-between">
                <span>{activeTab === 'deposit' ? 'ACC-SYSTEM-FUNDING (Debit)' : 'ACC-SYSTEM-SETTLEMENT (Credit)'}</span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Automated Double-Entry</span>
              </div>
            </div>
          )}
        </div>

        {/* Amount & Description */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
              Transfer Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono tabular-nums font-bold"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
              Transaction Narrative / Description
            </label>
            <input
              type="text"
              placeholder="e.g. Invoice #7042 settlement or vendor disbursement"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        {/* Idempotency Key Panel */}
        <div className="bg-obsidian-950 p-3.5 rounded-lg border border-obsidian-800 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold">Mandatory Idempotency-Key Header:</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCopyKey}
                className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1 bg-obsidian-850 px-2 py-1 rounded border border-obsidian-750 transition"
              >
                {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
              </button>
              <button
                type="button"
                onClick={generateNewKey}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 bg-obsidian-850 px-2 py-1 rounded border border-obsidian-750 transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>New UUID</span>
              </button>
            </div>
          </div>
          <input
            type="text"
            required
            value={idempotencyKey}
            onChange={(e) => setIdempotencyKey(e.target.value)}
            className="w-full bg-obsidian-900 border border-obsidian-750 rounded px-2.5 py-1.5 text-[11px] font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 select-all"
          />
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Transaction Refused: </span>
              <span>{error}</span>
              <p className="text-[10px] text-rose-400 mt-1">
                Double-entry invariant conserved: zero balances modified. Refusal registered to immutable audit ledger.
              </p>
            </div>
          </div>
        )}

        {/* Success / Result Panel */}
        {result && (
          <div className="p-4 rounded-lg bg-obsidian-950 border border-emerald-500/30 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-obsidian-800 pb-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Transaction {result.data.status}</span>
                {result.isRetry && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/40">
                    IDEMPOTENT RETRY DETECTED
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">{result.latencyMs}ms</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400">Transaction ID: </span>
                <span className="text-white break-all">{result.data.id}</span>
              </div>
              <div>
                <span className="text-slate-400">Amount: </span>
                <span className="text-emerald-400 font-bold">{result.data.amount} INR</span>
              </div>
              <div>
                <span className="text-slate-400">Type: </span>
                <span className="text-white">{result.data.transactionType}</span>
              </div>
              <div>
                <span className="text-slate-400">Idempotency Key: </span>
                <span className="text-cyan-300 truncate inline-block max-w-[180px] align-bottom">
                  {result.key}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {lastExecutedKey ? (
            <button
              type="button"
              onClick={handleSimulateRetry}
              disabled={submitting}
              className="flex items-center space-x-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-obsidian-950 hover:bg-obsidian-900 border border-cyan-500/40 px-3.5 py-2 rounded-lg font-mono transition"
              title="Resend the exact same idempotency key and payload to verify exactly-once execution"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Simulate Duplicate Retransmission</span>
            </button>
          ) : <div />}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center space-x-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Executing ACID Mutation...' : 'Commit Mutation'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
