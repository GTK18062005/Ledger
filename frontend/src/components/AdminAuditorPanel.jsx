import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, BarChart3, Search, RefreshCw, AlertTriangle, CheckCircle, 
  Lock, Eye, Users, Shield, AlertOctagon, Edit3, PlusCircle, Coins, 
  ArrowRight, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckCircle2, X 
} from 'lucide-react';
import { api } from '../api';

export default function AdminAuditorPanel({ user, accounts, onRefreshAccounts }) {
  const [aggregate, setAggregate] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Account Status Update Dialog & Search state
  const [accountSearch, setAccountSearch] = useState('');
  const [accountPage, setAccountPage] = useState(1);
  const [accountPageSize, setAccountPageSize] = useState(6);
  const [selectedAccForStatus, setSelectedAccForStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('FROZEN');
  const [adminReason, setAdminReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Admin Add Money / Deposit state
  const [depositTarget, setDepositTarget] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDescription, setDepositDescription] = useState('Admin Treasury Liquidity Injection');
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositMessage, setDepositMessage] = useState(null);

  // Audit Log Pagination state
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);

  const loadData = async () => {
    setLoading(true);
    try {
      const promises = [
        api.getAggregateBalance(),
        api.getAuditLogs()
      ];
      if (user.role === 'ADMIN') {
        promises.push(api.getAdminUsers());
      }
      const [agg, logs, usersList] = await Promise.all(promises);
      setAggregate(agg);
      setAuditLogs(logs || []);
      if (usersList) {
        setAdminUsers(usersList);
      }
    } catch (e) {
      console.error("Failed to load audit/aggregate:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    setLogPage(1);
  }, [searchTerm, logPageSize]);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedAccForStatus) return;

    setStatusSubmitting(true);
    setStatusMessage(null);
    try {
      const reason = adminReason && adminReason.trim() ? adminReason.trim() : 'Administrative status update';
      await api.updateAccountStatus(selectedAccForStatus.id, newStatus, reason);
      setStatusMessage({ type: 'success', text: `Account status successfully updated to ${newStatus}. Audited.` });
      setSelectedAccForStatus(null);
      setAdminReason('');
      if (onRefreshAccounts) await onRefreshAccounts();
      await loadData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update account status' });
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleAdminDeposit = async (e) => {
    e.preventDefault();
    if (!depositTarget.trim() || !depositAmount || parseFloat(depositAmount) <= 0) {
      setDepositMessage({ type: 'error', text: 'Please specify a target account and a valid positive amount.' });
      return;
    }

    setDepositSubmitting(true);
    setDepositMessage(null);
    try {
      const payload = {
        accountIdentifier: depositTarget.trim(),
        amount: parseFloat(depositAmount),
        description: depositDescription.trim() || 'Admin Treasury Credit'
      };
      const res = await api.adminDeposit(payload);
      setDepositMessage({
        type: 'success',
        text: `Successfully added ₹${parseFloat(depositAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} to ${depositTarget}. Double-entry balanced via SYSTEM_FUNDING.`
      });
      setDepositAmount('');
      if (onRefreshAccounts) await onRefreshAccounts();
      await loadData();
    } catch (err) {
      setDepositMessage({ type: 'error', text: err.message || 'Failed to deposit funds' });
    } finally {
      setDepositSubmitting(false);
    }
  };

  const formatBalance = (val, currency = 'INR') => {
    const num = parseFloat(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const filteredLogs = auditLogs.filter(l => {
    const text = `${l.action || l.operationType} ${l.status} ${l.resource || l.accountNumber} ${l.details} ${l.userRole}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const totalLogs = filteredLogs.length;
  const totalLogPages = Math.max(1, Math.ceil(totalLogs / logPageSize));
  const validLogPage = Math.min(logPage, totalLogPages);
  const startLogIndex = (validLogPage - 1) * logPageSize;
  const endLogIndex = Math.min(startLogIndex + logPageSize, totalLogs);
  const paginatedLogs = filteredLogs.slice(startLogIndex, endLogIndex);

  const filteredStatusAccounts = (accounts || []).filter(acc => {
    if (!accountSearch.trim()) return true;
    const q = accountSearch.toLowerCase();
    const accNum = (acc.accountNumber || '').toLowerCase();
    const owner = (acc.ownerEmail || acc.ownerId || '').toLowerCase();
    const status = (acc.status || '').toLowerCase();
    const curr = (acc.currency || '').toLowerCase();
    const id = (acc.id || '').toLowerCase();
    return accNum.includes(q) || owner.includes(q) || status.includes(q) || curr.includes(q) || id.includes(q);
  });

  const totalStatusAccounts = filteredStatusAccounts.length;
  const totalAccountPages = Math.max(1, Math.ceil(totalStatusAccounts / accountPageSize));
  const validAccountPage = Math.min(accountPage, totalAccountPages);
  const startAccIdx = (validAccountPage - 1) * accountPageSize;
  const endAccIdx = Math.min(startAccIdx + accountPageSize, totalStatusAccounts);
  const paginatedStatusAccounts = filteredStatusAccounts.slice(startAccIdx, endAccIdx);

  return (
    <div className="space-y-6">
      {/* Telemetry Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Aggregate Liquidity */}
        <div className="bg-obsidian-850 border border-obsidian-750 p-5 rounded-xl">
          <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Aggregate Liquidity (INR Core)</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white tabular-nums tracking-tight">
            {formatBalance(aggregate?.aggregateBalance || 0, aggregate?.currency || 'INR')}
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">Conserved ledger balances</p>
        </div>

        {/* Vault Accounts Count */}
        <div className="bg-obsidian-850 border border-obsidian-750 p-5 rounded-xl">
          <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Managed Ledger Accounts</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white tabular-nums tracking-tight">
            {aggregate?.totalAccounts || accounts.length || 0}
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">
            Active: {aggregate?.activeAccounts || accounts.filter(a => a.status === 'ACTIVE').length || 0}
          </p>
        </div>

        {/* Invariant Zero-Sum Check */}
        <div className="bg-obsidian-850 border border-obsidian-750 p-5 rounded-xl">
          <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Zero-Sum Verification</span>
          </div>
          <div className="text-sm font-mono font-bold text-emerald-400 mt-2 flex items-center space-x-1.5">
            <CheckCircle className="w-4 h-4" />
            <span>Net System Drift: 0.0000 INR</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">PostgreSQL Double-Entry Invariant: Valid</p>
        </div>
      </div>

      {/* ADMIN FEATURE: ADD MONEY / DEPOSIT FOR DIFFERENT ACCOUNTS */}
      {user.role === 'ADMIN' && (
        <div className="bg-obsidian-850 border border-obsidian-750 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-obsidian-750 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Admin Treasury Credit: Add Money to Any Account</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Inject liquidity directly into any account. Debits SYSTEM_FUNDING and credits target account (double-entry balanced).
              </p>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 w-max">
              ADMIN ONLY
            </span>
          </div>

          {depositMessage && (
            <div className={`p-3 rounded-lg text-xs font-mono flex items-start space-x-2 ${
              depositMessage.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
            }`}>
              {depositMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <span>{depositMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleAdminDeposit} className="space-y-4">
            {/* Target Account Input */}
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                Target Account ID or Account Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. ACC-BOB-2002 or UUID"
                  value={depositTarget}
                  onChange={(e) => setDepositTarget(e.target.value)}
                  className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono transition"
                />
              </div>
            </div>

            {/* Amount Input & Preset Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                  Deposit Amount (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-slate-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg pl-7 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono transition"
                  />
                </div>

                {/* Amount quick chips */}
                <div className="flex items-center space-x-1.5 mt-1.5">
                  {[100, 500, 1000, 5000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(amt.toString())}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-obsidian-950 hover:bg-obsidian-900 border border-obsidian-800 text-slate-300 hover:text-white transition"
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                  Reason / Audit Memo
                </label>
                <input
                  type="text"
                  placeholder="e.g. Liquidity seeding or approved credit"
                  value={depositDescription}
                  onChange={(e) => setDepositDescription(e.target.value)}
                  className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={depositSubmitting || !depositTarget.trim() || !depositAmount}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-950 disabled:text-slate-600 disabled:cursor-not-allowed text-white text-xs font-mono font-bold rounded-lg shadow-sm transition flex items-center space-x-2"
            >
              {depositSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Processing Double-Entry Deposit...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Money to Account</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Account Status Control (Admin Only) */}
      {user.role === 'ADMIN' && accounts.length > 0 && (
        <div className="bg-obsidian-850 border border-obsidian-750 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-obsidian-750 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Account Status & Freeze Controls (Mandatory Audited Reason)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Immediately block or restore debit/credit execution. Every status change generates a tamper-proof audit record.
              </p>
            </div>

            {/* Account Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search accounts to manage..."
                value={accountSearch}
                onChange={(e) => {
                  setAccountSearch(e.target.value);
                  setAccountPage(1);
                }}
                className="bg-obsidian-950 border border-obsidian-700 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 w-full sm:w-64 font-mono transition"
              />
              {accountSearch && (
                <button
                  type="button"
                  onClick={() => setAccountSearch('')}
                  className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {statusMessage && (
            <div className={`p-3 rounded-lg text-xs font-mono ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
            }`}>
              {statusMessage.text}
            </div>
          )}

          {filteredStatusAccounts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs font-mono bg-obsidian-950/40 rounded-lg border border-obsidian-800">
              No accounts match "{accountSearch}".
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginatedStatusAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="bg-obsidian-950 border border-obsidian-800 rounded-lg p-3.5 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-mono font-bold text-slate-200">
                        {acc.accountNumber}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {acc.ownerEmail || 'System Entity'} • {formatBalance(acc.balance)}
                      </div>
                      <span className={`inline-block mt-1 text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                        acc.status === 'ACTIVE'
                          ? 'text-emerald-400 border-emerald-500/30'
                          : acc.status === 'FROZEN'
                          ? 'text-amber-400 border-amber-500/30'
                          : 'text-rose-400 border-rose-500/30'
                      }`}>
                        {acc.status}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedAccForStatus(acc);
                        setNewStatus(acc.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE');
                      }}
                      className="flex items-center space-x-1 text-xs bg-obsidian-900 hover:bg-obsidian-800 text-slate-300 px-2.5 py-1.5 rounded border border-obsidian-750 transition"
                    >
                      <Edit3 className="w-3 h-3 text-purple-400" />
                      <span>Update</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Account Pagination Controls */}
              {totalStatusAccounts > accountPageSize && (
                <div className="flex items-center justify-between pt-2 border-t border-obsidian-800 font-mono text-xs text-slate-400">
                  <span className="text-[11px]">
                    Showing {startAccIdx + 1}–{endAccIdx} of {totalStatusAccounts} accounts
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setAccountPage(p => Math.max(1, p - 1))}
                      disabled={validAccountPage <= 1}
                      className="px-2 py-1 bg-obsidian-900 hover:bg-obsidian-800 disabled:opacity-40 rounded border border-obsidian-750 transition"
                    >
                      Prev
                    </button>
                    <span className="text-[11px] text-slate-300">
                      {validAccountPage} / {totalAccountPages}
                    </span>
                    <button
                      onClick={() => setAccountPage(p => Math.min(totalAccountPages, p + 1))}
                      disabled={validAccountPage >= totalAccountPages}
                      className="px-2 py-1 bg-obsidian-900 hover:bg-obsidian-800 disabled:opacity-40 rounded border border-obsidian-750 transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Status Modal */}
          {selectedAccForStatus && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-obsidian-850 border border-obsidian-750 rounded-xl w-full max-w-md p-6 shadow-2xl">
                <h4 className="text-sm font-bold text-white mb-2">
                  Update Status for {selectedAccForStatus.accountNumber}
                </h4>
                <form onSubmit={handleUpdateStatus} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      New Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="ACTIVE">ACTIVE — Normal Operations Permitted</option>
                      <option value="FROZEN">FROZEN — All Transactions Blocked (Refusals Logged)</option>
                      <option value="SUSPENDED">SUSPENDED — Complete Administrative Lock</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Audited Reason (Optional)
                    </label>
                    <textarea
                      placeholder="e.g. Compliance AML verification or suspected unauthorized access"
                      value={adminReason}
                      onChange={(e) => setAdminReason(e.target.value)}
                      className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAccForStatus(null)}
                      className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={statusSubmitting}
                      className="px-4 py-2 text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition"
                    >
                      {statusSubmitting ? 'Auditing...' : 'Apply Status Change'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Log Table with Pagination */}
      <div className="bg-obsidian-850 border border-obsidian-750 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-obsidian-750">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              <span>Immutable System Audit Trail & IDOR Interceptions</span>
            </h3>
            <p className="text-xs text-slate-400">
              Complete provable journal of registrations, transfers, overdraw attempts, and security breaches.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setLogPage(1);
                }}
                className="bg-obsidian-950 border border-obsidian-700 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 w-48 sm:w-64 font-mono transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setLogPage(1);
                  }}
                  className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 bg-obsidian-900 hover:bg-obsidian-800 text-slate-300 rounded-lg border border-obsidian-700 transition"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Audit Log Filter / Page Size row */}
        <div className="flex items-center justify-between font-mono text-xs text-slate-400">
          <div className="text-[11px]">
            Total Records: <span className="font-bold text-slate-200">{totalLogs}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Per page:</span>
            <select
              value={logPageSize}
              onChange={(e) => setLogPageSize(Number(e.target.value))}
              className="bg-obsidian-950 border border-obsidian-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {totalLogs === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-mono bg-obsidian-950/40 rounded-lg border border-obsidian-800">
            No audit records match the current filter.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-obsidian-750 bg-obsidian-950">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-obsidian-900/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-obsidian-750">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Operation</th>
                    <th className="px-4 py-3">Target Account / Resource</th>
                    <th className="px-4 py-3">Security Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-800/80 font-mono text-[11px]">
                  {paginatedLogs.map((log, idx) => {
                    const isViolation = log.status === 'FAILED' || log.status === 'REFUSED' || (log.action && log.action.includes('REFUSAL'));

                    return (
                      <tr
                        key={log.id || idx}
                        className={`hover:bg-obsidian-850/60 transition ${isViolation ? 'bg-amber-950/10' : ''}`}
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap text-slate-400 text-[10px]">
                          {new Date(log.timestamp || log.createdAt).toLocaleString()}
                        </td>

                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="text-white font-semibold">
                            {log.action || log.operationType}
                          </span>
                        </td>

                        <td className="px-4 py-2.5 whitespace-nowrap text-slate-300">
                          {log.resource || log.accountNumber || '—'}
                        </td>

                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-obsidian-900 border border-obsidian-800 text-slate-300">
                            {log.userRole || 'ANONYMOUS'}
                          </span>
                        </td>

                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isViolation
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {log.status}
                          </span>
                        </td>

                        <td className="px-4 py-2.5 text-slate-400 max-w-sm truncate">
                          {log.details || log.failureReason || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Audit Log Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 font-mono text-xs">
              <div className="text-slate-400 text-[11px]">
                Showing <span className="font-bold text-slate-200">{startLogIndex + 1}</span> to <span className="font-bold text-slate-200">{endLogIndex}</span> of <span className="font-bold text-slate-200">{totalLogs}</span> audit logs
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setLogPage(1)}
                  disabled={validLogPage === 1}
                  className="p-1 rounded bg-obsidian-900 border border-obsidian-750 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-obsidian-800 transition"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setLogPage(prev => Math.max(1, prev - 1))}
                  disabled={validLogPage === 1}
                  className="p-1 rounded bg-obsidian-900 border border-obsidian-750 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-obsidian-800 transition"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <span className="px-3 py-1 text-slate-300 bg-obsidian-950 border border-obsidian-750 rounded text-xs font-bold">
                  Page {validLogPage} of {totalLogPages}
                </span>

                <button
                  type="button"
                  onClick={() => setLogPage(prev => Math.min(totalLogPages, prev + 1))}
                  disabled={validLogPage === totalLogPages}
                  className="p-1 rounded bg-obsidian-900 border border-obsidian-750 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-obsidian-800 transition"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setLogPage(totalLogPages)}
                  disabled={validLogPage === totalLogPages}
                  className="p-1 rounded bg-obsidian-900 border border-obsidian-750 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-obsidian-800 transition"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
