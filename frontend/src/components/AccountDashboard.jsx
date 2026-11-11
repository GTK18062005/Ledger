import React, { useState } from 'react';
import { Wallet, PlusCircle, Eye, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownLeft, Shield, CheckCircle, Plus, Search, X, ChevronRight } from 'lucide-react';
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
  const [showOpenSecondaryModal, setShowOpenSecondaryModal] = useState(false);
  
  // Search and filter state
  const [accountSearch, setAccountSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Secondary account request (Maker-Checker) state
  const [secondaryType, setSecondaryType] = useState('International Currency');
  const [secondaryCurrency, setSecondaryCurrency] = useState('USD');
  const [secondaryReason, setSecondaryReason] = useState('');
  const [secondarySubmitting, setSecondarySubmitting] = useState(false);
  const [secondaryError, setSecondaryError] = useState(null);
  const [secondaryNotice, setSecondaryNotice] = useState(null);

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

  const handleOpenSecondary = async (e) => {
    e.preventDefault();
    setSecondarySubmitting(true);
    setSecondaryError(null);
    setSecondaryNotice(null);
    try {
      await api.createAccountRequest({
        accountType: secondaryType,
        currency: secondaryCurrency,
        reason: secondaryReason.trim() || `Secondary ${secondaryCurrency} vault application`
      });
      setShowOpenSecondaryModal(false);
      setSecondaryReason('');
      setSecondaryNotice(`Account opening request (${secondaryType} · ${secondaryCurrency}) submitted for administrator approval.`);
      if (onRefresh) await onRefresh();
    } catch (err) {
      setSecondaryError(err.message || 'Failed to submit account opening request');
    } finally {
      setSecondarySubmitting(false);
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
        return 'bg-[#eaf2e8] text-[#133e2b] border-[#cbdec7]';
      case 'FROZEN':
        return 'bg-[#fffbeb] text-amber-800 border-amber-200';
      case 'SUSPENDED':
        return 'bg-[#fef2f2] text-rose-800 border-rose-200';
      default:
        return 'bg-[#f3f4f6] text-slate-700 border-slate-200';
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
    <div className="space-y-8 pb-16">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#5c7c6a]">
            VAULT MANAGEMENT
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#122a1f] mt-1">
            Accounts
          </h1>
          <p className="text-xs text-[#52705e] mt-1">
            Active depository accounts, multi-currency vaults, and available balances.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-1.5 text-xs bg-white hover:bg-[#f2f6f1] text-[#1a4a35] px-3.5 py-2.5 rounded-xl border border-[#d6e2d4] transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#133e2b]' : ''}`} />
            <span>Refresh</span>
          </button>

          {user.role === 'ACCOUNT_HOLDER' && (
            <button
              onClick={() => setShowOpenSecondaryModal(true)}
              className="flex items-center space-x-1.5 text-xs bg-[#133e2b] hover:bg-[#0e2e1f] text-white font-semibold px-4 py-2.5 rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Currency Account</span>
            </button>
          )}

          {user.role === 'ADMIN' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-1.5 text-xs bg-[#133e2b] hover:bg-[#0e2e1f] text-white font-semibold px-4 py-2.5 rounded-xl shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Admin: Provision Vault</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Balance Card */}
      {secondaryNotice && (
        <div className="p-4 rounded-2xl bg-[#eaf2e8] border border-[#cbdec7] text-[#133e2b] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>{secondaryNotice}</span>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('account-request')}
              className="text-xs font-semibold text-[#133e2b] underline shrink-0"
            >
              Track requests →
            </button>
          )}
        </div>
      )}

      <div className="bg-[#eaf2e8] border border-[#d8e7d5] p-6 sm:p-7 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#40624c]">
            {user.role === 'ACCOUNT_HOLDER' ? 'Consolidated Vault Liquidity (INR Core)' : 'System Ledger Balance Summary'}
          </span>
          <div className="flex items-baseline space-x-3 mt-1.5">
            <span className="text-3xl sm:text-4xl font-bold text-[#122a1f] font-mono tabular-nums tracking-tight">
              {formatBalance(totalPrimaryCurrencyBalance, 'INR')}
            </span>
            <span className="text-xs text-[#52745e] font-mono">
              ({accounts.length} Account{accounts.length === 1 ? '' : 's'} connected)
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#e5ede3] p-3.5 sm:px-4 rounded-2xl shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#6c8a77] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search accounts by number, currency, status, or owner..."
            value={accountSearch}
            onChange={(e) => setAccountSearch(e.target.value)}
            className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl pl-9 pr-8 py-2 text-xs text-[#122a1f] placeholder-[#819e8e] focus:outline-none focus:border-[#133e2b] font-mono transition"
          />
          {accountSearch && (
            <button
              type="button"
              onClick={() => setAccountSearch('')}
              className="absolute right-2.5 top-2.5 text-[#6c8a77] hover:text-[#122a1f] transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filters */}
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
                  ? 'bg-[#133e2b] text-white font-semibold shadow-xs'
                  : 'text-[#597866] hover:text-[#122a1f] hover:bg-[#f0f4ee]'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="text-[10px] font-mono text-[#789685] pl-2">
            ({filteredAccounts.length}/{accounts.length})
          </span>
        </div>
      </div>

      {/* Account Cards Grid */}
      {accounts.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-[#ccd8ca] rounded-3xl p-8">
          <Wallet className="w-10 h-10 text-[#789685] mx-auto mb-3" />
          <p className="text-xs text-[#52705e]">No ledger accounts accessible under current authorization profile.</p>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-[#ccd8ca] rounded-3xl p-8 space-y-2">
          <Wallet className="w-10 h-10 text-[#789685] mx-auto mb-2" />
          <p className="text-xs text-[#52705e]">No accounts match the search criteria "{accountSearch}".</p>
          <button
            onClick={() => { setAccountSearch(''); setStatusFilter('ALL'); }}
            className="text-xs text-[#133e2b] font-semibold hover:underline"
          >
            Reset search and filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAccounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-white border border-[#e5ede3] hover:border-[#b8d2ba] rounded-2xl p-5 flex flex-col justify-between transition-all shadow-xs group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-[#eaf2e8] text-[#133e2b] flex items-center justify-center font-mono text-xs font-bold border border-[#cbdec7]">
                      {acc.currency}
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-[#122a1f] tracking-wide">
                        {acc.accountNumber}
                      </div>
                      <div className="text-[10px] text-[#698675] truncate max-w-[170px] font-mono">
                        {acc.ownerEmail || acc.ownerId}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusBadge(acc.status)}`}>
                    {acc.status}
                  </span>
                </div>

                <div className="my-3.5 p-3 rounded-xl bg-[#f8faf7] border border-[#eaf0e8]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#698875]">
                    Available Ledger Balance
                  </div>
                  <div className="text-2xl font-mono font-bold text-[#122a1f] tabular-nums tracking-tight mt-0.5">
                    {formatBalance(acc.balance, acc.currency)}
                  </div>
                </div>

                <div className="text-[10px] font-mono text-[#6c8a77] bg-[#f8faf7] p-2 rounded-lg border border-[#eaf0e8] truncate select-all">
                  ID: {acc.id}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#edf3ec] flex items-center justify-between text-xs">
                <button
                  onClick={() => onSelectAccountForStatement(acc)}
                  className="flex items-center space-x-1 text-[#133e2b] hover:underline font-medium"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Statement</span>
                </button>

                <button
                  onClick={() => onSelectAccountForTransfer(acc)}
                  className="flex items-center space-x-1 text-[#597866] hover:text-[#122a1f] transition"
                >
                  <span>Transfer →</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Secondary Account Request Modal (Maker-Checker) */}
      {showOpenSecondaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#e5ede3] rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative">
            <h3 className="font-serif text-2xl font-normal text-[#122a1f] mb-1">
              Request New Account
            </h3>
            <p className="text-xs text-[#52705e] mb-4">
              Submit a multi-currency or specialized depository application for administrator approval.
            </p>

            {secondaryError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {secondaryError}
              </div>
            )}

            <form onSubmit={handleOpenSecondary} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
                  Account Category
                </label>
                <select
                  value={secondaryType}
                  onChange={(e) => setSecondaryType(e.target.value)}
                  className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2.5 text-xs text-[#122a1f] focus:outline-none focus:border-[#133e2b]"
                >
                  <option value="International Currency">International Currency Vault</option>
                  <option value="Business">Business Operating Vault</option>
                  <option value="Treasury Vault">Treasury Vault</option>
                  <option value="Personal">Personal Secondary Vault</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
                  Select Vault Currency
                </label>
                <select
                  value={secondaryCurrency}
                  onChange={(e) => setSecondaryCurrency(e.target.value)}
                  className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2.5 text-xs text-[#122a1f] font-mono focus:outline-none focus:border-[#133e2b]"
                >
                  <option value="USD">USD — United States Dollar</option>
                  <option value="EUR">EUR — Eurozone Euro</option>
                  <option value="GBP">GBP — British Pound Sterling</option>
                  <option value="INR">INR — Indian Rupee (Secondary)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
                  Compliance Purpose (Optional)
                </label>
                <input
                  type="text"
                  maxLength={350}
                  placeholder="e.g. Vendor USD settlement or tax reserve"
                  value={secondaryReason}
                  onChange={(e) => setSecondaryReason(e.target.value)}
                  className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2.5 text-xs text-[#122a1f] focus:outline-none focus:border-[#133e2b]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpenSecondaryModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-[#52705e]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={secondarySubmitting}
                  className="px-5 py-2.5 bg-[#133e2b] hover:bg-[#0e2e1f] text-white rounded-xl text-xs font-semibold transition shadow-xs"
                >
                  {secondarySubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Provision Vault Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#e5ede3] rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative">
            <h3 className="font-serif text-2xl font-normal text-[#122a1f] mb-1">
              Admin: Provision Account
            </h3>
            <p className="text-xs text-[#52705e] mb-4">
              Provision a new customer or operational ledger account.
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
                  Owner UUID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0d9688a1-56d8-436d-..."
                  value={newAccOwnerId}
                  onChange={(e) => setNewAccOwnerId(e.target.value)}
                  className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2.5 text-xs text-[#122a1f] font-mono focus:outline-none focus:border-[#133e2b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
                  Account Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ACC-CLIENT-9001"
                  value={newAccNumber}
                  onChange={(e) => setNewAccNumber(e.target.value)}
                  className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2.5 text-xs text-[#122a1f] font-mono focus:outline-none focus:border-[#133e2b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
                    Currency
                  </label>
                  <select
                    value={newAccCurrency}
                    onChange={(e) => setNewAccCurrency(e.target.value)}
                    className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2.5 text-xs text-[#122a1f] font-mono focus:outline-none focus:border-[#133e2b]"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
                    Initial Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2.5 text-xs text-[#122a1f] font-mono focus:outline-none focus:border-[#133e2b]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-[#52705e]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2.5 bg-[#133e2b] hover:bg-[#0e2e1f] text-white rounded-xl text-xs font-semibold transition shadow-xs"
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
