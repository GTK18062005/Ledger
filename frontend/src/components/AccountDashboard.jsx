import React, { useState } from 'react';
import { Wallet, PlusCircle, Eye, RefreshCw, Search, X, Plus } from 'lucide-react';
import { api } from '../api';

export default function AccountDashboard({
  accounts,
  user,
  onSelectAccountForStatement,
  onSelectAccountForTransfer,
  onCreateAccount,
  onNavigateTab,
  onRefresh,
  loading
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRequestAccountModal, setShowRequestAccountModal] = useState(false);

  // Search and filter state
  const [accountSearch, setAccountSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Customer Add Account Request Modal State (Maker-Checker persisted)
  const [reqType, setReqType] = useState('INTERNATIONAL_CURRENCY');
  const [reqCurrency, setReqCurrency] = useState('USD');
  const [reqReason, setReqReason] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqError, setReqError] = useState(null);
  const [reqSuccess, setReqSuccess] = useState(null);

  // Admin create state
  const [newAccOwnerId, setNewAccOwnerId] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('1000.00');
  const [newAccCurrency, setNewAccCurrency] = useState('INR');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  const formatBalance = (val, currency = 'INR', isSystemAcc = false) => {
    const raw = parseFloat(val) || 0;
    if (isSystemAcc) {
      return `₹${Math.abs(raw).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
    }
    const num = Math.max(0, raw);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const handleSubmitAccountRequest = async (e) => {
    e.preventDefault();
    setReqSubmitting(true);
    setReqError(null);
    setReqSuccess(null);
    try {
      await api.createAccountRequest({
        accountType: reqType,
        currency: reqCurrency,
        reason: reqReason.trim() || `${reqType.replace(/_/g, ' ')} multi-currency settlement vault`
      });
      setReqSuccess('Account opening request persisted and queued for Administrator approval.');
      setReqReason('');
      if (onRefresh) await onRefresh();
      setTimeout(() => {
        setShowRequestAccountModal(false);
        setReqSuccess(null);
      }, 1400);
    } catch (err) {
      setReqError(err.message || 'Failed to submit account opening request');
    } finally {
      setReqSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await onCreateAccount({
        ownerId: newAccOwnerId,
        accountNumber: newAccNumber,
        currency: newAccCurrency,
        initialBalance: parseFloat(newAccBalance) || 0
      });
      setShowCreateModal(false);
      setNewAccNumber('');
      setNewAccBalance('1000.00');
    } catch (err) {
      setCreateError(err.message || 'Failed to create account');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'FROZEN':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'SUSPENDED':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const customerAccounts = (accounts || []).filter(a => !a.isSystem && !a.accountNumber?.startsWith('ACC-SYSTEM'));

  const totalPrimaryCurrencyBalance = customerAccounts
    .filter(a => a.currency === 'INR')
    .reduce((sum, acc) => sum + Math.max(0, parseFloat(acc.balance) || 0), 0);

  const filteredAccounts = (accounts || []).filter(acc => {
    if (statusFilter !== 'ALL' && acc.status !== statusFilter) return false;
    if (!accountSearch.trim()) return true;
    const q = accountSearch.toLowerCase();
    const accNum = (acc.accountNumber || '').toLowerCase();
    const owner = (acc.ownerEmail || acc.ownerId || '').toLowerCase();
    const curr = (acc.currency || '').toLowerCase();
    const status = (acc.status || '').toLowerCase();
    const id = (acc.id || '').toLowerCase();
    return accNum.includes(q) || owner.includes(q) || curr.includes(q) || status.includes(q) || id.includes(q);
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600">
            SOVEREIGN VAULT DIRECTORY
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            Accounts & Vaults
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Active depository accounts, multi-currency sub-ledgers, and verified non-negative balances.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl border border-slate-200 transition shadow-2xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {user.role === 'ACCOUNT_HOLDER' && (
            <button
              onClick={() => {
                if (onNavigateTab) {
                  onNavigateTab('account-request');
                } else {
                  setShowRequestAccountModal(true);
                }
              }}
              className="flex items-center space-x-1.5 text-xs bg-[#0f172a] hover:bg-slate-800 text-white font-semibold px-4 py-2.5 rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Request Additional Vault</span>
            </button>
          )}

          {user.role === 'ADMIN' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-1.5 text-xs bg-[#0f172a] hover:bg-slate-800 text-white font-semibold px-4 py-2.5 rounded-xl shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Provision Vault</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Balance Dark Card */}
      <div className="bg-[#0f172a] text-white border border-slate-800 p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            {user.role === 'ACCOUNT_HOLDER' ? 'CONSOLIDATED CUSTOMER LIQUIDITY (INR CORE)' : 'SYSTEM LEDGER AGGREGATE'}
          </span>
          <div className="flex flex-wrap items-baseline gap-3 mt-1.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums tracking-tight">
              {formatBalance(totalPrimaryCurrencyBalance, 'INR')}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({accounts.length} Vault{accounts.length === 1 ? '' : 's'} Connected)
            </span>
          </div>
        </div>
        <span className="self-start sm:self-center px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          Zero-Overdraft Verified
        </span>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 p-3.5 sm:px-4 rounded-2xl shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search vaults by number, currency, status, or owner..."
            value={accountSearch}
            onChange={(e) => setAccountSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono transition"
          />
          {accountSearch && (
            <button
              type="button"
              onClick={() => setAccountSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: 'ALL', label: 'All' },
            { key: 'ACTIVE', label: 'Active' },
            { key: 'FROZEN', label: 'Frozen' },
            { key: 'SUSPENDED', label: 'Suspended' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-lg font-mono transition ${
                statusFilter === f.key
                  ? 'bg-[#0f172a] text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="text-[10px] font-mono text-slate-400 pl-2">
            ({filteredAccounts.length}/{accounts.length})
          </span>
        </div>
      </div>

      {/* Account Cards Grid */}
      {accounts.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-slate-300 rounded-2xl p-8">
          <Wallet className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-xs text-slate-500">No ledger accounts accessible under current authorization profile.</p>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-slate-300 rounded-2xl p-8 space-y-2">
          <Wallet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No accounts match "{accountSearch}".</p>
          <button
            onClick={() => { setAccountSearch(''); setStatusFilter('ALL'); }}
            className="text-xs text-indigo-600 font-semibold hover:underline"
          >
            Reset search and filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAccounts.map((acc) => {
            const isSystem = acc.isSystem || acc.accountNumber?.startsWith('ACC-SYSTEM');
            return (
              <div
                key={acc.id}
                className="bg-white border border-slate-200/80 hover:border-indigo-300 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-2xs group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-mono text-xs font-bold border border-indigo-200">
                        {acc.currency}
                      </div>
                      <div>
                        <div className="text-xs font-mono font-bold text-slate-900 tracking-wide">
                          {acc.accountNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[170px] font-mono">
                          {acc.ownerEmail || acc.ownerId}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusBadge(acc.status)}`}>
                      {acc.status}
                    </span>
                  </div>

                  <div className="my-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                      {isSystem ? 'Clearing Reserve Allocation' : 'Available Ledger Balance'}
                    </div>
                    <div className="text-2xl font-mono font-bold text-slate-900 tabular-nums tracking-tight mt-0.5">
                      {formatBalance(acc.balance, acc.currency, isSystem)}
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-200/60 truncate select-all">
                    ID: {acc.id}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onSelectAccountForStatement(acc)}
                    className="flex items-center space-x-1.5 text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Statement</span>
                  </button>

                  {!isSystem && user.role !== 'AUDITOR' && (
                    <button
                      onClick={() => onSelectAccountForTransfer(acc)}
                      className="flex items-center space-x-1 text-slate-600 hover:text-slate-900 font-semibold transition"
                    >
                      <span>Transfer &rarr;</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Request Additional Account Modal (Fallback if needed) */}
      {showRequestAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Request Additional Vault
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Submitted requests are queued cleanly for administrator approval.
            </p>

            {reqError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {reqError}
              </div>
            )}
            {reqSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                {reqSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitAccountRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Vault Classification
                </label>
                <select
                  value={reqType}
                  onChange={(e) => setReqType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                >
                  <option value="INTERNATIONAL_CURRENCY">International Multi-Currency Vault</option>
                  <option value="BUSINESS">Business Corporate Settlement Vault</option>
                  <option value="TREASURY_VAULT">Treasury Reserve Vault</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Currency
                </label>
                <select
                  value={reqCurrency}
                  onChange={(e) => setReqCurrency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                >
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="INR">INR — Indian Rupee</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Purpose / Justification
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vendor payouts and cross-border clearing"
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestAccountModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reqSubmitting}
                  className="px-5 py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                >
                  {reqSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Provision Vault Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Admin: Provision Account
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Directly provision an active customer or operational sub-ledger vault.
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Owner UUID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0d9688a1-56d8-436d-..."
                  value={newAccOwnerId}
                  onChange={(e) => setNewAccOwnerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ACC-CLIENT-9001"
                  value={newAccNumber}
                  onChange={(e) => setNewAccNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={newAccCurrency}
                    onChange={(e) => setNewAccCurrency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Initial Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                >
                  {createSubmitting ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
