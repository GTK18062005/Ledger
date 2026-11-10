import React, { useState } from 'react';
import { Wallet, PlusCircle, Eye, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownLeft, Shield, CheckCircle, Plus } from 'lucide-react';
import { api } from '../api';

export default function AccountDashboard({
  accounts,
  user,
  onSelectAccountForStatement,
  onSelectAccountForTransfer,
  onCreateAccount,
  onRefresh,
  loading
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOpenSecondaryModal, setShowOpenSecondaryModal] = useState(false);
  
  // Secondary account state
  const [secondaryCurrency, setSecondaryCurrency] = useState('USD');
  const [secondarySubmitting, setSecondarySubmitting] = useState(false);
  const [secondaryError, setSecondaryError] = useState(null);

  // Admin create state
  const [newAccOwnerId, setNewAccOwnerId] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('1000.00');
  const [newAccCurrency, setNewAccCurrency] = useState('INR');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  const formatBalance = (val, currency = 'INR') => {
    const num = parseFloat(val) || 0;
    return `${num.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${currency}`;
  };

  const handleOpenSecondary = async (e) => {
    e.preventDefault();
    setSecondarySubmitting(true);
    setSecondaryError(null);
    try {
      await api.openSecondaryAccount(secondaryCurrency);
      setShowOpenSecondaryModal(false);
      onRefresh();
    } catch (err) {
      setSecondaryError(err.message || 'Failed to open secondary account');
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
        return 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30';
      case 'FROZEN':
        return 'bg-amber-950/50 text-amber-300 border-amber-500/30';
      case 'SUSPENDED':
        return 'bg-rose-950/50 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const totalPrimaryCurrencyBalance = accounts
    .filter(a => a.currency === 'INR')
    .reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-obsidian-850 border border-obsidian-750 p-5 rounded-xl shadow-sm">
        <div>
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
            {user.role === 'ACCOUNT_HOLDER' ? 'Consolidated Vault Liquidity (INR Core)' : 'System Ledger Summary'}
          </span>
          <div className="flex items-baseline space-x-3 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
              {formatBalance(totalPrimaryCurrencyBalance, 'INR')}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({accounts.length} Account{accounts.length === 1 ? '' : 's'} Active)
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-1.5 text-xs bg-obsidian-900 hover:bg-obsidian-800 text-slate-300 px-3 py-2 rounded-lg border border-obsidian-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </button>

          {user.role === 'ACCOUNT_HOLDER' && (
            <button
              onClick={() => setShowOpenSecondaryModal(true)}
              className="flex items-center space-x-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3.5 py-2 rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Currency Account</span>
            </button>
          )}

          {user.role === 'ADMIN' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold px-3.5 py-2 rounded-lg shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Admin: Provision Vault</span>
            </button>
          )}
        </div>
      </div>

      {/* Account Cards Grid */}
      {accounts.length === 0 ? (
        <div className="text-center py-12 bg-obsidian-850/50 border border-dashed border-obsidian-750 rounded-xl">
          <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-xs text-slate-400">No ledger accounts accessible under current authorization profile.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            return (
              <div
                key={acc.id}
                className="bg-obsidian-850 border border-obsidian-750 hover:border-obsidian-700 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded bg-obsidian-950 border border-obsidian-700 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold">
                        {acc.currency}
                      </div>
                      <div>
                        <div className="text-xs font-mono font-bold text-slate-100 tracking-wider">
                          {acc.accountNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[170px] font-mono">
                          {acc.ownerEmail || acc.ownerId}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getStatusBadge(acc.status)}`}>
                      {acc.status}
                    </span>
                  </div>

                  <div className="my-3.5 p-3 rounded-lg bg-obsidian-950 border border-obsidian-800">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      Available Ledger Balance
                    </div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-white tabular-nums tracking-tight mt-0.5">
                      {formatBalance(acc.balance, acc.currency)}
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 bg-obsidian-900/60 p-2 rounded border border-obsidian-800 truncate select-all">
                    ID: {acc.id}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-obsidian-750 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onSelectAccountForStatement(acc)}
                    className="flex items-center space-x-1 text-slate-300 hover:text-emerald-400 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Statements</span>
                  </button>

                  {user.role === 'ACCOUNT_HOLDER' && acc.status === 'ACTIVE' && (
                    <button
                      onClick={() => onSelectAccountForTransfer(acc)}
                      className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-medium transition"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Transact →</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Account Holder: Open Secondary Currency Account Modal */}
      {showOpenSecondaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-obsidian-850 border border-obsidian-750 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Open Secondary Currency Account</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Create an additional vault under your KYC identity in a foreign currency.
            </p>

            {secondaryError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{secondaryError}</span>
              </div>
            )}

            <form onSubmit={handleOpenSecondary} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Select Currency Vault
                </label>
                <select
                  value={secondaryCurrency}
                  onChange={(e) => setSecondaryCurrency(e.target.value)}
                  className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="INR">INR — Additional Indian Rupee Vault</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-obsidian-750">
                <button
                  type="button"
                  onClick={() => setShowOpenSecondaryModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={secondarySubmitting}
                  className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm transition"
                >
                  {secondarySubmitting ? 'Opening...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Provision Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-obsidian-850 border border-obsidian-750 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <PlusCircle className="w-4 h-4 text-purple-400" />
              <span>Admin: Provision Ledger Vault</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Manually provision a new account and bind ownership to a user UUID.
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Owner User ID (UUID)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paste User UUID"
                  value={newAccOwnerId}
                  onChange={(e) => setNewAccOwnerId(e.target.value)}
                  className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ACC-USR-9999"
                  value={newAccNumber}
                  onChange={(e) => setNewAccNumber(e.target.value)}
                  className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Initial Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    required
                    value={newAccCurrency}
                    onChange={(e) => setNewAccCurrency(e.target.value.toUpperCase())}
                    className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-obsidian-750">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-sm transition"
                >
                  {createSubmitting ? 'Provisioning...' : 'Provision Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
