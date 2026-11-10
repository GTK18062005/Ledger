import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, BarChart3, Search, RefreshCw, AlertTriangle, CheckCircle, 
  Lock, Eye, Users, Shield, ShieldCheck, AlertOctagon, Edit3, PlusCircle, Coins, 
  ArrowRight, ChevronLeft, ChevronRight, CheckCircle2, X 
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

  // Maker-Checker Deposit Approvals state
  const [depositRequests, setDepositRequests] = useState([]);
  const [depositRequestActioning, setDepositRequestActioning] = useState(null);
  const [approvalFeedback, setApprovalFeedback] = useState(null);

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
      if (user.role === 'ADMIN' || user.role === 'AUDITOR') {
        promises.push(api.getDepositRequests().catch(() => []));
      }
      const results = await Promise.all(promises);
      setAggregate(results[0]);
      setAuditLogs(results[1] || []);
      if (user.role === 'ADMIN') {
        setAdminUsers(results[2] || []);
        setDepositRequests(results[3] || []);
      } else {
        setDepositRequests(results[2] || []);
      }
    } catch (e) {
      console.error("Failed to load admin/auditor telemetry:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDepositRequest = async (id, memo) => {
    setDepositRequestActioning(id);
    setApprovalFeedback(null);
    try {
      await api.approveDepositRequest(id, `Approved by ${user.email} (${memo || 'Wire verified'})`);
      setApprovalFeedback({ type: 'success', text: 'Deposit request approved. Funds credited via double-entry against SYSTEM_FUNDING.' });
      if (onRefreshAccounts) await onRefreshAccounts();
      await loadData();
    } catch (err) {
      setApprovalFeedback({ type: 'error', text: err.message || 'Failed to approve deposit request' });
    } finally {
      setDepositRequestActioning(null);
    }
  };

  const handleRejectDepositRequest = async (id) => {
    setDepositRequestActioning(id);
    setApprovalFeedback(null);
    try {
      await api.rejectDepositRequest(id, `Declined by administrator: Unverified settlement`);
      setApprovalFeedback({ type: 'success', text: 'Deposit request rejected.' });
      await loadData();
    } catch (err) {
      setApprovalFeedback({ type: 'error', text: err.message || 'Failed to reject deposit request' });
    } finally {
      setDepositRequestActioning(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

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
    <div className="space-y-8 pb-16">
      {/* Title Header */}
      <div>
        <div className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#5c7c6a]">
          GOVERNANCE & COMPLIANCE
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#122a1f] mt-1">
          Admin & Audit Panel
        </h1>
        <p className="text-xs text-[#52705e] mt-1">
          Independent compliance telemetry, system liquidity verification, and audited controls.
        </p>
      </div>

      {/* Telemetry Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-[#e5ede3] p-6 rounded-3xl shadow-xs">
          <div className="text-[10px] font-mono font-semibold text-[#5c7c6a] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
            <BarChart3 className="w-4 h-4 text-[#133e2b]" />
            <span>Aggregate Core Liquidity</span>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-[#122a1f] tabular-nums mt-2">
            {aggregate ? formatBalance(aggregate.totalBalance, aggregate.currency) : '₹0.00 INR'}
          </div>
          <div className="text-[11px] text-[#6c8a77] font-mono mt-1">
            System Zero-Sum Conserved
          </div>
        </div>

        <div className="bg-white border border-[#e5ede3] p-6 rounded-3xl shadow-xs">
          <div className="text-[10px] font-mono font-semibold text-[#5c7c6a] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
            <Lock className="w-4 h-4 text-[#133e2b]" />
            <span>Vault Status</span>
          </div>
          <div className="text-2xl font-bold text-[#122a1f] mt-2">
            {aggregate ? `${aggregate.activeAccounts} Active` : '0 Active'}
          </div>
          <div className="text-[11px] text-[#6c8a77] font-mono mt-1">
            Total Vaults: {aggregate ? aggregate.totalAccounts : 0}
          </div>
        </div>

        <div className="bg-white border border-[#e5ede3] p-6 rounded-3xl shadow-xs">
          <div className="text-[10px] font-mono font-semibold text-[#5c7c6a] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4 text-[#133e2b]" />
            <span>Audited Records</span>
          </div>
          <div className="text-2xl font-mono font-bold text-[#122a1f] mt-2">
            {auditLogs.length} Events
          </div>
          <div className="text-[11px] text-[#6c8a77] font-mono mt-1">
            Tamper-Proof Audit Journal
          </div>
        </div>
      </div>

      {/* Maker-Checker Deposit Approvals (Admin & Auditor) */}
      {(user.role === 'ADMIN' || user.role === 'AUDITOR') && (
        <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#edf3ec] pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#133e2b]" />
                <h3 className="text-base font-semibold text-[#122a1f]">
                  Treasury Deposit Approvals (Maker-Checker Queue)
                </h3>
                {depositRequests.filter(r => r.status === 'PENDING').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                    {depositRequests.filter(r => r.status === 'PENDING').length} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-[#52705e] mt-0.5">
                Dual-control authorization: Customers propose deposits; Administrators verify settlement and release funds.
              </p>
            </div>
          </div>

          {approvalFeedback && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 ${
              approvalFeedback.type === 'success'
                ? 'bg-[#eaf2e8] text-[#133e2b] border border-[#cbdec7]'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {approvalFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{approvalFeedback.text}</span>
            </div>
          )}

          {depositRequests.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#6c8a77] bg-[#f8faf7] rounded-2xl border border-dashed border-[#d6e2d4]">
              No deposit requests submitted yet. Customer requests will appear here for review.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#edf3ec] text-[#6c8a77] font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date / ID</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3">Requester</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Reference / Memo</th>
                    <th className="py-2.5 px-3">Status</th>
                    {user.role === 'ADMIN' && <th className="py-2.5 px-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f6f1]">
                  {depositRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-[#f8faf7] transition">
                      <td className="py-3 px-3 font-mono text-[11px] text-[#52705e]">
                        <div>{req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                        <div className="text-[9px] text-[#8ea899]">{req.id.substring(0, 8)}...</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-[#122a1f]">
                        {req.accountNumber || req.accountId?.substring(0, 12)}
                      </td>
                      <td className="py-3 px-3 text-[#52705e]">
                        {req.userEmail || 'Customer'}
                      </td>
                      <td className="py-3 px-3 font-serif text-sm font-semibold text-[#122a1f]">
                        ₹{Number(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-[#52705e] max-w-xs truncate" title={req.referenceMemo}>
                        {req.referenceMemo || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                          req.status === 'APPROVED'
                            ? 'bg-[#eaf2e8] text-[#133e2b] border border-[#cbdec7]'
                            : req.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      {user.role === 'ADMIN' && (
                        <td className="py-3 px-3 text-right">
                          {req.status === 'PENDING' ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                type="button"
                                disabled={depositRequestActioning === req.id}
                                onClick={() => handleApproveDepositRequest(req.id, req.referenceMemo)}
                                className="px-3 py-1.5 bg-[#133e2b] hover:bg-[#0e2e1f] text-white rounded-lg text-xs font-medium transition shadow-2xs disabled:opacity-50"
                              >
                                {depositRequestActioning === req.id ? 'Approving...' : 'Approve & Fund'}
                              </button>
                              <button
                                type="button"
                                disabled={depositRequestActioning === req.id}
                                onClick={() => handleRejectDepositRequest(req.id)}
                                className="px-2.5 py-1.5 border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-medium transition disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-[#8ea899]">
                              {req.reviewedByEmail ? `by ${req.reviewedByEmail}` : 'Reviewed'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admin Add Money / Treasury Credit */}
      {user.role === 'ADMIN' && (
        <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#edf3ec] pb-3">
            <div>
              <h3 className="text-base font-semibold text-[#122a1f] flex items-center space-x-2">
                <Coins className="w-4 h-4 text-[#133e2b]" />
                <span>Admin Treasury Credit (Double-Entry Balanced)</span>
              </h3>
              <p className="text-xs text-[#52705e] mt-0.5">
                Inject liquidity directly into any account. Debits SYSTEM_FUNDING to guarantee system-wide conservation.
              </p>
            </div>
          </div>

          {depositMessage && (
            <div className={`p-3.5 rounded-xl text-xs font-mono flex items-center space-x-2 ${
              depositMessage.type === 'success'
                ? 'bg-[#eaf2e8] text-[#133e2b] border border-[#cbdec7]'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {depositMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{depositMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleAdminDeposit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
                Target Account Number or ID
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ACC-BOB-2002 or Account UUID"
                value={depositTarget}
                onChange={(e) => setDepositTarget(e.target.value)}
                className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2.5 text-xs text-[#122a1f] font-mono focus:outline-none focus:border-[#133e2b]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
                  Deposit Amount (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-mono text-[#6c8a77]">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="1000.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl pl-8 pr-3 py-2.5 text-xs text-[#122a1f] font-mono focus:outline-none focus:border-[#133e2b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
                  Reason / Audit Memo
                </label>
                <input
                  type="text"
                  placeholder="e.g. Liquidity seeding or approved credit"
                  value={depositDescription}
                  onChange={(e) => setDepositDescription(e.target.value)}
                  className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2.5 text-xs text-[#122a1f] focus:outline-none focus:border-[#133e2b]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={depositSubmitting || !depositTarget.trim() || !depositAmount}
              className="py-2.5 px-5 bg-[#133e2b] hover:bg-[#0e2e1f] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{depositSubmitting ? 'Processing Credit...' : 'Credit Account via Treasury'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Account Status Control (Admin Only) */}
      {user.role === 'ADMIN' && accounts.length > 0 && (
        <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#edf3ec] pb-3">
            <div>
              <h3 className="text-base font-semibold text-[#122a1f] flex items-center space-x-2">
                <Shield className="w-4 h-4 text-[#133e2b]" />
                <span>Account Status & Freeze Controls</span>
              </h3>
              <p className="text-xs text-[#52705e] mt-0.5">
                Block or restore debit/credit execution. Every status change generates an audit record.
              </p>
            </div>

            {/* Account Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6c8a77] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search accounts to manage..."
                value={accountSearch}
                onChange={(e) => {
                  setAccountSearch(e.target.value);
                  setAccountPage(1);
                }}
                className="bg-[#f8faf7] border border-[#d6e2d4] rounded-xl pl-8 pr-8 py-1.5 text-xs text-[#122a1f] focus:outline-none focus:border-[#133e2b] w-full sm:w-64 font-mono transition"
              />
              {accountSearch && (
                <button
                  type="button"
                  onClick={() => setAccountSearch('')}
                  className="absolute right-2.5 top-2 text-[#6c8a77] hover:text-[#122a1f]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {statusMessage && (
            <div className={`p-3.5 rounded-xl text-xs font-mono ${
              statusMessage.type === 'success'
                ? 'bg-[#eaf2e8] text-[#133e2b] border border-[#cbdec7]'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {statusMessage.text}
            </div>
          )}

          {filteredStatusAccounts.length === 0 ? (
            <div className="text-center py-8 text-[#6c8a77] text-xs font-mono bg-[#f8faf7] rounded-2xl border border-[#eaf0e8]">
              No accounts match "{accountSearch}".
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginatedStatusAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="bg-[#f8faf7] border border-[#eaf0e8] rounded-2xl p-4 flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <div className="text-xs font-mono font-bold text-[#122a1f]">
                        {acc.accountNumber}
                      </div>
                      <div className="text-[10px] text-[#698675] font-mono">
                        {acc.ownerEmail || 'System Entity'} • {formatBalance(acc.balance)}
                      </div>
                      <span className={`inline-block mt-1 text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                        acc.status === 'ACTIVE'
                          ? 'bg-[#eaf2e8] text-[#133e2b] border-[#cbdec7]'
                          : acc.status === 'FROZEN'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {acc.status}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedAccForStatus(acc);
                        setNewStatus(acc.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE');
                      }}
                      className="flex items-center space-x-1 text-xs bg-white hover:bg-[#edf3ec] text-[#133e2b] px-3 py-1.5 rounded-xl border border-[#d6e2d4] transition font-medium"
                    >
                      <Edit3 className="w-3 h-3 text-[#133e2b]" />
                      <span>Update</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Account Pagination */}
              {totalStatusAccounts > accountPageSize && (
                <div className="flex items-center justify-between pt-2 text-xs font-mono text-[#52705e]">
                  <span>Showing {startAccIdx + 1}–{endAccIdx} of {totalStatusAccounts} accounts</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setAccountPage(p => Math.max(1, p - 1))}
                      disabled={validAccountPage <= 1}
                      className="px-2.5 py-1 bg-white hover:bg-[#f2f6f1] disabled:opacity-40 rounded-lg border border-[#d6e2d4]"
                    >
                      Prev
                    </button>
                    <span>{validAccountPage} / {totalAccountPages}</span>
                    <button
                      onClick={() => setAccountPage(p => Math.min(totalAccountPages, p + 1))}
                      disabled={validAccountPage >= totalAccountPages}
                      className="px-2.5 py-1 bg-white hover:bg-[#f2f6f1] disabled:opacity-40 rounded-lg border border-[#d6e2d4]"
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <div className="bg-white border border-[#e5ede3] rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl">
                <h4 className="font-serif text-2xl font-normal text-[#122a1f] mb-1">
                  Update Status for {selectedAccForStatus.accountNumber}
                </h4>
                <form onSubmit={handleUpdateStatus} className="space-y-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1e3c2c] mb-1">
                      New Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2 text-xs text-[#122a1f] focus:outline-none focus:border-[#133e2b] font-mono"
                    >
                      <option value="ACTIVE">ACTIVE — Normal Operations Permitted</option>
                      <option value="FROZEN">FROZEN — All Transactions Blocked (Refusals Logged)</option>
                      <option value="SUSPENDED">SUSPENDED — Complete Administrative Lock</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1e3c2c] mb-1">
                      Audited Reason (Optional)
                    </label>
                    <textarea
                      placeholder="e.g. Compliance AML verification or suspected unauthorized access"
                      value={adminReason}
                      onChange={(e) => setAdminReason(e.target.value)}
                      className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2 text-xs text-[#122a1f] focus:outline-none focus:border-[#133e2b] font-mono"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAccForStatus(null)}
                      className="px-4 py-2 text-xs font-semibold text-[#52705e]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={statusSubmitting}
                      className="px-5 py-2 bg-[#133e2b] hover:bg-[#0e2e1f] text-white font-semibold rounded-xl text-xs transition shadow-xs"
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
      <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#edf3ec]">
          <div>
            <h3 className="text-base font-semibold text-[#122a1f] flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-[#133e2b]" />
              <span>Immutable System Audit Trail & Security Logs</span>
            </h3>
            <p className="text-xs text-[#52705e] mt-0.5">
              Complete provable journal of registrations, transfers, overdraw attempts, and security verifications.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6c8a77] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setLogPage(1);
                }}
                className="bg-[#f8faf7] border border-[#d6e2d4] rounded-xl pl-8 pr-8 py-1.5 text-xs text-[#122a1f] focus:outline-none focus:border-[#133e2b] w-48 sm:w-64 font-mono transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setLogPage(1);
                  }}
                  className="absolute right-2.5 top-2 text-[#6c8a77] hover:text-[#122a1f]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 bg-white hover:bg-[#f2f6f1] text-[#133e2b] rounded-xl border border-[#d6e2d4] transition shadow-xs"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#133e2b]' : ''}`} />
            </button>
          </div>
        </div>

        {totalLogs === 0 ? (
          <div className="text-center py-12 text-[#6c8a77] text-xs font-mono bg-[#f8faf7] rounded-2xl border border-[#eaf0e8]">
            No audit records match the current filter.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-2xl border border-[#e5ede3] bg-white">
              <table className="w-full text-left text-xs text-[#122a1f]">
                <thead className="bg-[#f8faf7] text-[#597866] uppercase font-mono text-[10px] tracking-wider border-b border-[#e5ede3]">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Operation</th>
                    <th className="px-4 py-3">Target Account / Resource</th>
                    <th className="px-4 py-3">Security Role</th>
                    <th className="px-4 py-3">Details / Interception Reason</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf3ec] font-mono text-[11px]">
                  {paginatedLogs.map((log) => {
                    const isSuccess = log.status === 'SUCCESS';
                    const isRefused = log.status === 'REFUSED';

                    return (
                      <tr key={log.id} className="hover:bg-[#f6f9f5] transition">
                        <td className="px-4 py-3 text-[#52705e]">
                          {new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          <div className="text-[10px] text-[#789685]">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action?.includes('IDOR') || log.action?.includes('SECURITY')
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-[#eaf2e8] text-[#133e2b] border border-[#cbdec7]'
                          }`}>
                            {log.action || log.operationType}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-semibold text-[#122a1f]">
                          {log.resource || log.accountNumber || 'SYSTEM'}
                        </td>

                        <td className="px-4 py-3 text-[#52705e]">
                          {log.userRole || 'ANONYMOUS'}
                        </td>

                        <td className="px-4 py-3 font-sans text-[#52705e] max-w-xs truncate" title={log.details}>
                          {log.details || '—'}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                            isSuccess
                              ? 'bg-[#eaf2e8] text-[#133e2b] border-[#cbdec7]'
                              : isRefused
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Audit Pagination */}
            {totalLogPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs font-mono text-[#52705e]">
                <span>Showing {startLogIndex + 1}–{endLogIndex} of {totalLogs} events</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setLogPage(p => Math.max(1, p - 1))}
                    disabled={validLogPage <= 1}
                    className="px-2.5 py-1 bg-white hover:bg-[#f2f6f1] disabled:opacity-40 rounded-lg border border-[#d6e2d4] font-semibold"
                  >
                    Prev
                  </button>
                  <span className="font-semibold text-[#122a1f]">{validLogPage} / {totalLogPages}</span>
                  <button
                    onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                    disabled={validLogPage >= totalLogPages}
                    className="px-2.5 py-1 bg-white hover:bg-[#f2f6f1] disabled:opacity-40 rounded-lg border border-[#d6e2d4] font-semibold"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
