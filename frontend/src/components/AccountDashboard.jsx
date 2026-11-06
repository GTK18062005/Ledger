import React, { useState } from 'react';
import { Wallet, PlusCircle, ArrowUpRight, ArrowDownLeft, Shield, Eye, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export default function AccountDashboard({
  accounts,
  user,
  onSelectAccountForStatement,
  onCreateAccount,
  onRefresh,
  loading
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAccOwnerId, setNewAccOwnerId] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('1000.00');
  const [newAccCurrency, setNewAccCurrency] = useState('INR');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  const formatCurrency = (val, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 2
    }).format(val || 0);
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

  const totalBalance = accounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {user.role === 'ACCOUNT_HOLDER' ? 'Your Personal Vaults' : 'All System Ledger Accounts'}
          </span>
          <div className="flex items-baseline space-x-3 mt-1">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {formatCurrency(totalBalance)}
            </span>
            <span className="text-xs text-slate-400">Total Across {accounts.length} Account(s)</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {user.role === 'ADMIN' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-1.5 text-xs bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold px-4 py-2 rounded-xl shadow-lg shadow-sky-500/20 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Account Cards Grid */}
      {accounts.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl">
          <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No accounts accessible for this persona.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const isOwner = user.role !== 'ACCOUNT_HOLDER' || acc.ownerId === user.userId;

            return (
              <div
                key={acc.id}
                className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-mono text-xs font-bold">
                        {acc.currency}
                      </div>
                      <div>
                        <div className="text-xs font-mono font-bold text-slate-200 tracking-wider">
                          {acc.accountNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
                          Owner: {acc.ownerEmail || acc.ownerId}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {acc.status}
                    </span>
                  </div>

                  <div className="my-4">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      Verified Ledger Balance
                    </div>
                    <div className="text-2xl font-mono font-extrabold text-white tracking-tight mt-0.5">
                      {formatCurrency(acc.balance, acc.currency)}
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 break-all select-all">
                    UUID: {acc.id}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Created {new Date(acc.createdAt).toLocaleDateString()}
                  </span>

                  <button
                    onClick={() => onSelectAccountForStatement(acc)}
                    className="flex items-center space-x-1 text-xs text-sky-400 hover:text-sky-300 font-medium transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Statements →</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <PlusCircle className="w-5 h-5 text-sky-400" />
              <span>Admin: Create New Account</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Provision a new ledger vault and assign legal ownership to a user.
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Owner User ID (UUID)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. paste Alice or Bob UUID"
                  value={newAccOwnerId}
                  onChange={(e) => setNewAccOwnerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ACC-DEMO-9999"
                  value={newAccNumber}
                  onChange={(e) => setNewAccNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 text-xs bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl flex items-center space-x-1.5 shadow-lg shadow-sky-500/20"
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
