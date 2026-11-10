import React, { useState, useEffect } from 'react';
import { Send, ArrowRightLeft, PlusCircle, MinusCircle, CheckCircle2, AlertCircle, ArrowRight, UserCheck, Sparkles, RefreshCw } from 'lucide-react';
import { generateUUID } from '../api';

export default function TransferForm({
  accounts,
  user,
  onExecuteTransfer,
  onExecuteDeposit,
  onExecuteWithdraw,
  onRefreshAccounts
}) {
  const [activeTab, setActiveTab] = useState('transfer'); // 'transfer', 'deposit', 'withdraw'

  // Form Fields - Notice: NO DROPDOWN/SCROLLDOWN for recipient!
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('100.00');
  const [description, setDescription] = useState('');

  // Selected source account (defaults to user's first active account)
  const [selectedSourceId, setSelectedSourceId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Auto-select user's first account as source
  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedSourceId) {
      setSelectedSourceId(accounts[0].id);
    }
  }, [accounts]);

  // Find active source account object
  const activeSourceAccount = accounts.find(a => a.id === selectedSourceId) || accounts[0] || null;

  // Format currency
  const formatMoney = (val, currency = 'INR') => {
    const num = parseFloat(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  // Quick preset amount adder
  const handleQuickAmount = (addVal) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + addVal).toFixed(2));
  };

  // Autofill test recipient
  const handleAutofillRecipient = (id) => {
    setRecipientId(id);
    setErrorMessage(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessResult(null);

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setErrorMessage("Please enter a valid transfer amount greater than 0.");
      setSubmitting(false);
      return;
    }

    if (!activeSourceAccount) {
      setErrorMessage("No source account found. Please ensure you are logged in.");
      setSubmitting(false);
      return;
    }

    try {
      const idempotencyKey = generateUUID();
      let res;

      if (activeTab === 'transfer') {
        const cleanRecipient = recipientId.trim();
        if (!cleanRecipient) {
          setErrorMessage("Please enter the recipient's Account ID or Account Number (e.g. ACC-BOB-2002).");
          setSubmitting(false);
          return;
        }

        // Send P2P transfer using the typed ID/Number directly
        res = await onExecuteTransfer({
          sourceAccountId: activeSourceAccount.id,
          destinationAccountId: cleanRecipient, // Backend resolves UUID or Account Number
          destinationAccount: cleanRecipient,
          amount: numericAmount,
          description: description || 'Person-to-Person Transfer'
        }, idempotencyKey);

        setSuccessResult({
          type: 'P2P_TRANSFER',
          amount: numericAmount,
          recipient: cleanRecipient,
          txId: res.id || res.transactionId,
          timestamp: new Date().toLocaleTimeString()
        });

        // Reset recipient & amount for next transfer
        setRecipientId('');
        setAmount('100.00');
        setDescription('');

      } else if (activeTab === 'deposit') {
        res = await onExecuteDeposit({
          accountId: activeSourceAccount.id,
          amount: numericAmount,
          description: description || 'Bank Funding Deposit'
        }, idempotencyKey);

        setSuccessResult({
          type: 'DEPOSIT',
          amount: numericAmount,
          recipient: activeSourceAccount.accountNumber,
          txId: res.id || res.transactionId,
          timestamp: new Date().toLocaleTimeString()
        });

      } else if (activeTab === 'withdraw') {
        res = await onExecuteWithdraw({
          accountId: activeSourceAccount.id,
          amount: numericAmount,
          description: description || 'Bank Settlement Withdrawal'
        }, idempotencyKey);

        setSuccessResult({
          type: 'WITHDRAWAL',
          amount: numericAmount,
          recipient: 'External Bank Account',
          txId: res.id || res.transactionId,
          timestamp: new Date().toLocaleTimeString()
        });
      }

      if (onRefreshAccounts) {
        await onRefreshAccounts();
      }
    } catch (err) {
      setErrorMessage(err.message || "Transfer failed. Please check the recipient ID and your balance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* 3 Simple Action Buttons at the Top */}
      <div className="grid grid-cols-3 gap-2 bg-obsidian-900 p-1.5 rounded-xl border border-obsidian-750">
        <button
          type="button"
          onClick={() => { setActiveTab('transfer'); setErrorMessage(null); setSuccessResult(null); }}
          className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'transfer'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-850'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send Money (P2P)</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('deposit'); setErrorMessage(null); setSuccessResult(null); }}
          className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'deposit'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-850'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Add Money</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('withdraw'); setErrorMessage(null); setSuccessResult(null); }}
          className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'withdraw'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-850'
          }`}
        >
          <MinusCircle className="w-3.5 h-3.5" />
          <span>Withdraw</span>
        </button>
      </div>

      {/* Main Simple Card */}
      <div className="bg-obsidian-850 border border-obsidian-750 rounded-2xl p-6 sm:p-7 shadow-xl space-y-5">
        
        {/* Source Account Banner (NO DROPDOWN - Clearly Shows Active Account & Balance) */}
        {activeSourceAccount ? (
          <div className="bg-obsidian-950 p-4 rounded-xl border border-obsidian-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                {activeTab === 'deposit' ? 'Depositing Money Into:' : 'Sending Money From:'}
              </div>
              <div className="text-sm font-bold text-white font-mono mt-0.5 flex items-center space-x-2">
                <span>{activeSourceAccount.accountNumber}</span>
                <span className="text-[11px] px-2 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  {activeSourceAccount.status}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                Available Balance
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400 tabular-nums">
                {formatMoney(activeSourceAccount.balance, activeSourceAccount.currency)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-rose-400 bg-rose-950/40 p-3 rounded-lg border border-rose-500/30">
            No active account available for transfer.
          </div>
        )}

        {/* Success Alert Banner */}
        {successResult && (
          <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs space-y-1.5 animate-fadeIn">
            <div className="flex items-center space-x-2 font-bold text-sm text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                {successResult.type === 'P2P_TRANSFER' && `Successfully Sent ₹${successResult.amount.toFixed(2)} to ${successResult.recipient}!`}
                {successResult.type === 'DEPOSIT' && `Successfully Deposited ₹${successResult.amount.toFixed(2)} into your account!`}
                {successResult.type === 'WITHDRAWAL' && `Successfully Withdrawn ₹${successResult.amount.toFixed(2)} to bank!`}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-1">
              <span>Transaction ID: {successResult.txId}</span>
              <span>{successResult.timestamp}</span>
            </div>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Transaction Refused: </span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* The Simple Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          {/* P2P Recipient Field: SIMPLE TEXT INPUT (NO SCROLLDOWN BAR!) */}
          {activeTab === 'transfer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Recipient Account ID or Account Number <span className="text-emerald-400">*</span>
              </label>
              
              <input
                type="text"
                required
                placeholder="Type recipient ID (e.g. ACC-BOB-2002 or UUID)"
                value={recipientId}
                onChange={(e) => {
                  setRecipientId(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full bg-obsidian-950 border border-obsidian-700 hover:border-obsidian-600 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none font-mono transition"
              />

              {/* 1-Click Quick Autofill Chips for Easy Testing */}
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                <span className="text-slate-400 text-[11px]">Quick Send Test:</span>
                <button
                  type="button"
                  onClick={() => handleAutofillRecipient('ACC-BOB-2002')}
                  className="px-2.5 py-1 rounded-lg bg-obsidian-900 hover:bg-obsidian-800 text-cyan-300 border border-obsidian-750 hover:border-cyan-500/40 font-mono text-[11px] transition flex items-center space-x-1"
                >
                  <UserCheck className="w-3 h-3 text-cyan-400" />
                  <span>Bob (ACC-BOB-2002)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAutofillRecipient('ACC-ALICE-1001')}
                  className="px-2.5 py-1 rounded-lg bg-obsidian-900 hover:bg-obsidian-800 text-emerald-300 border border-obsidian-750 hover:border-emerald-500/40 font-mono text-[11px] transition flex items-center space-x-1"
                >
                  <UserCheck className="w-3 h-3 text-emerald-400" />
                  <span>Alice (ACC-ALICE-1001)</span>
                </button>
              </div>
            </div>
          )}

          {/* Amount Input with Quick-Pick Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Amount to {activeTab === 'transfer' ? 'Send' : activeTab === 'deposit' ? 'Add' : 'Withdraw'} (₹) <span className="text-emerald-400">*</span>
              </label>
              <div className="flex items-center space-x-1.5">
                {[50, 100, 500, 1000].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setAmount(quick.toFixed(2))}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-obsidian-900 hover:bg-obsidian-800 text-slate-300 hover:text-white border border-obsidian-750 transition"
                  >
                    +₹{quick}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-3 text-lg font-bold text-slate-400 font-mono">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-obsidian-950 border border-obsidian-700 hover:border-obsidian-600 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-3 text-lg font-bold text-white focus:outline-none font-mono tabular-nums transition"
              />
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Lunch, Split bill, Monthly rent"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-obsidian-950 border border-obsidian-700 hover:border-obsidian-600 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition"
            />
          </div>

          {/* Big Action Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99]"
            >
              <Send className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Processing Transfer...'
                  : activeTab === 'transfer'
                  ? `Send ₹${parseFloat(amount || 0).toFixed(2)} Now`
                  : activeTab === 'deposit'
                  ? `Add ₹${parseFloat(amount || 0).toFixed(2)} to Balance`
                  : `Withdraw ₹${parseFloat(amount || 0).toFixed(2)} to Bank`}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
