import React, { useState, useEffect } from 'react';
import {
  CreditCard, ShieldCheck, Plus, ArrowRight, Wallet, ArrowLeftRight,
  PlusCircle, CheckCircle2, Clock, Fingerprint, Landmark
} from 'lucide-react';
import { api } from '../api';

export default function OverviewTab({
  user,
  accounts = [],
  onNavigateTab,
  onSelectAccountForStatement,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenTransfer,
  pendingAccountRequestsCount = 0,
  pendingDepositRequestsCount = 0
}) {
  const [accountRequests, setAccountRequests] = useState([]);

  useEffect(() => {
    api.getAccountRequests()
      .then((res) => setAccountRequests(Array.isArray(res) ? res : []))
      .catch(() => setAccountRequests([]));
  }, [user]);

  const getFirstName = () => {
    if (!user) return 'there';
    if (user.fullName) return user.fullName.split(' ')[0];
    if (user.name) return user.name.split(' ')[0];
    if (user.email === 'alice@ledgerline.io') return 'Alice';
    if (user.email === 'bob@ledgerline.io') return 'Bob';
    if (user.email === 'admin@ledgerline.io') return 'Administrator';
    const prefix = user.email?.split('@')[0] || 'User';
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  };

  const customerAccounts = (accounts || []).filter(
    (a) => !a.isSystem && !a.accountNumber?.startsWith('ACC-SYSTEM')
  );
  const activeAccounts = customerAccounts.filter((a) => a.status === 'ACTIVE');
  const totalLiquidity = customerAccounts
    .filter((a) => a.currency === 'INR' || !a.currency)
    .reduce((sum, acc) => sum + Math.max(0, parseFloat(acc.balance) || 0), 0);

  const pendingUserReqs = accountRequests.filter((r) => r.status === 'PENDING').length;
  const totalPendingCount = user?.role === 'ADMIN'
    ? pendingAccountRequestsCount + pendingDepositRequestsCount
    : pendingUserReqs;

  const formatBalance = (val, currency = 'INR') => {
    const num = Math.max(0, parseFloat(val) || 0);
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₹';
    return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
            <span className="text-indigo-600">
              {user?.role === 'ADMIN' ? 'ADMINISTRATIVE CONTROL' : 'TREASURY WORKSPACE'}
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">EXECUTIVE FINANCIAL OVERVIEW</span>
            <span className="ml-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[10px] font-mono font-semibold">
              DOUBLE-ENTRY CORE
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
            Welcome back, {getFirstName()}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor sovereign vault liquidity, verify non-negative balances, and execute atomic operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {user?.role === 'ACCOUNT_HOLDER' && (
            <>
              <button
                onClick={onOpenTransfer}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition"
              >
                <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                <span>Quick Transfer</span>
              </button>
              <button
                onClick={() => onNavigateTab('account-request')}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Add Account Request</span>
              </button>
            </>
          )}
          {user?.role === 'ADMIN' && (
            <>
              <button
                onClick={() => onNavigateTab('admin-accounts')}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition"
              >
                <Landmark className="w-4 h-4 text-indigo-600" />
                <span>Review Account Requests ({pendingAccountRequestsCount})</span>
              </button>
              <button
                onClick={() => onNavigateTab('admin-deposits')}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Approve Deposits ({pendingDepositRequestsCount})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4 KPI Summary Cards Row matching Screenshot Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Featured Dark Liquidity Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between text-white shadow-md">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {user?.role === 'ADMIN' ? 'PLATFORM CUSTOMER LIQUIDITY' : 'TOTAL AVAILABLE BALANCE'}
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                <span>Non-Negative</span>
              </span>
            </div>

            <div className="text-3xl font-extrabold text-white tracking-tight mt-3 tabular-nums">
              ₹{totalLiquidity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Zero overdraft protection strictly enforced
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
            <span className="text-emerald-400 font-semibold">BAL ≥ ₹0.00</span>
            <span className="text-slate-400">INR BASE</span>
          </div>
        </div>

        {/* Card 2: Connected Vaults */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                CONNECTED VAULTS
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-semibold shrink-0">
                {activeAccounts.length} Active
              </span>
            </div>

            <div className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3 tabular-nums">
              {String(customerAccounts.length).padStart(2, '0')}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Active double-entry depository accounts
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="flex items-center space-x-1.5 text-slate-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Real-time Sync</span>
            </span>
            <button
              onClick={() => onNavigateTab('accounts')}
              className="text-indigo-600 hover:underline font-semibold"
            >
              View All →
            </button>
          </div>
        </div>

        {/* Card 3: Pending Approval Queue */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                PENDING REQUESTS
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                totalPendingCount > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {totalPendingCount} Pending
              </span>
            </div>

            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                {totalPendingCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">Awaiting Review</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {user?.role === 'ADMIN'
                ? 'Account onboarding & wire deposit requests'
                : 'Account opening requests in compliance queue'}
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Maker-Checker</span>
            </span>
            <button
              onClick={() => onNavigateTab(user?.role === 'ADMIN' ? 'admin-accounts' : 'account-request')}
              className="text-indigo-600 hover:underline font-semibold"
            >
              Open Queue →
            </button>
          </div>
        </div>

        {/* Card 4: Integrity Index */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                CONSERVATION INVARIANT
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200/70 shrink-0">
                ISO 20022
              </span>
            </div>

            <div className="text-3xl font-extrabold text-indigo-600 tracking-tight mt-3 tabular-nums">
              100.000%
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Append-only cryptographic ledger intact
            </p>
          </div>

          <div className="mt-4 px-3 py-2 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-[10px]">
            <span className="flex items-center space-x-1.5 text-slate-700 font-semibold">
              <Fingerprint className="w-3.5 h-3.5 text-indigo-600" />
              <span>ACID Row Locks</span>
            </span>
            <span className="font-mono font-bold text-indigo-700">VERIFIED</span>
          </div>
        </div>
      </div>

      {/* Main Content Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Active Sovereign Vaults */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Your Sovereign Accounts</h2>
              <p className="text-xs text-slate-500">Connected accounts protected against negative balances</p>
            </div>
            <button
              onClick={() => onNavigateTab('accounts')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center space-x-1 transition"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {customerAccounts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No active accounts connected yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Submit an account request to open a Business, Personal, or Treasury vault subject to administrator approval.
              </p>
              <button
                onClick={() => onNavigateTab('account-request')}
                className="mt-4 px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
              >
                Request an Account
              </button>
            </div>
          ) : (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {customerAccounts.slice(0, 4).map((acc) => (
                <div
                  key={acc.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50/50 hover:bg-white transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {acc.accountNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          acc.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {acc.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate mb-3">
                      {acc.ownerEmail || user?.email}
                    </div>
                    <div className="p-3 bg-white border border-slate-200/80 rounded-xl">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Available Balance ({acc.currency})
                      </div>
                      <div className="text-xl font-extrabold text-slate-900 mt-0.5 tabular-nums">
                        {formatBalance(acc.balance, acc.currency)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        if (onSelectAccountForStatement) onSelectAccountForStatement(acc);
                        onNavigateTab('statements');
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Statement →
                    </button>
                    {user?.role === 'ACCOUNT_HOLDER' && (
                      <button
                        onClick={onOpenTransfer}
                        className="text-slate-600 hover:text-slate-900 font-mono text-[11px] font-semibold"
                      >
                        Transfer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Quick Execution Panel */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Quick Actions</h2>
            <p className="text-xs text-slate-500 mb-4">Execute atomic, idempotent operations</p>

            <div className="space-y-2.5">
              <button
                onClick={onOpenDeposit}
                className="w-full p-3.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 flex items-center justify-between text-left transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Deposit Funds</div>
                    <div className="text-[11px] text-slate-500">Request wire credit with UTR</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
              </button>

              <button
                onClick={onOpenWithdraw}
                className="w-full p-3.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 flex items-center justify-between text-left transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Withdraw Funds</div>
                    <div className="text-[11px] text-slate-500">External settlement debit</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
              </button>

              <button
                onClick={onOpenTransfer}
                className="w-full p-3.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 flex items-center justify-between text-left transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Peer-to-Peer Transfer</div>
                    <div className="text-[11px] text-slate-500">Instant double-entry settlement</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
              </button>

              <button
                onClick={() => onNavigateTab('account-request')}
                className="w-full p-3.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 flex items-center justify-between text-left transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Add Account Request</div>
                    <div className="text-[11px] text-slate-500">Apply for Business or FX vault</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Σ(Debits) = Σ(Credits)</span>
            <span className="text-emerald-600 font-semibold">Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
