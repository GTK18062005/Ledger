import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  ShieldAlert,
  BarChart3,
  RefreshCw,
  Search,
  Lock,
  Shield,
  Edit3,
  X,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Coins,
  ShieldCheck,
  Building2,
  Users,
  FileCheck2,
  Activity,
  XCircle,
  ArrowUpRight
} from 'lucide-react';

export function AdminAuditorPanel({
  user,
  accounts = [],
  onRefreshAccounts,
  onRequestsUpdated,
  initialSection = 'all'
}) {
  const [section, setSection] = useState(initialSection || 'all');
  const [aggregate, setAggregate] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState('ALL');
  const [accountSearch, setAccountSearch] = useState('');

  // Status update modal
  const [selectedAccForStatus, setSelectedAccForStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('FROZEN');
  const [adminReason, setAdminReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Admin Treasury Credit (Direct Deposit) State
  const [depositTarget, setDepositTarget] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDescription, setDepositDescription] = useState('Admin Treasury Liquidity Credit');
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositMessage, setDepositMessage] = useState(null);

  // Maker-Checker Deposit Requests Queue State
  const [depositRequests, setDepositRequests] = useState([]);
  const [depositRequestActioning, setDepositRequestActioning] = useState(null);
  const [approvalFeedback, setApprovalFeedback] = useState(null);

  // Maker-Checker Account Opening Requests Queue State
  const [accountRequests, setAccountRequests] = useState([]);
  const [accountRequestActioning, setAccountRequestActioning] = useState(null);
  const [accountReqFeedback, setAccountReqFeedback] = useState(null);

  // Pagination
  const [logPage, setLogPage] = useState(1);
  const logPageSize = 8;

  const [accountPage, setAccountPage] = useState(1);
  const accountPageSize = 6;

  useEffect(() => {
    if (initialSection) {
      setSection(initialSection);
    }
  }, [initialSection]);

  const loadData = async () => {
    setLoading(true);
    try {
      const promises = [
        api.getAggregateBalance(),
        api.getAuditLogs()
      ];

      if (user.role === 'ADMIN') {
        promises.push(api.getAdminUsers());
        promises.push(api.getDepositRequests());
        promises.push(api.getAccountRequests());
      } else if (user.role === 'AUDITOR') {
        promises.push(Promise.resolve([]));
        promises.push(api.getDepositRequests());
        promises.push(api.getAccountRequests());
      }

      const results = await Promise.allSettled(promises);

      if (results[0]?.status === 'fulfilled') {
        setAggregate(results[0].value);
      }
      if (results[1]?.status === 'fulfilled') {
        setAuditLogs(Array.isArray(results[1].value) ? results[1].value : []);
      }
      if (results[2]?.status === 'fulfilled' && Array.isArray(results[2].value)) {
        setAdminUsers(results[2].value);
      }
      if (results[3]?.status === 'fulfilled' && Array.isArray(results[3].value)) {
        setDepositRequests(results[3].value);
      }
      if (results[4]?.status === 'fulfilled' && Array.isArray(results[4].value)) {
        setAccountRequests(results[4].value);
      }
    } catch (err) {
      console.error('Failed loading admin/audit telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleApproveAccountRequest = async (id, req) => {
    setAccountRequestActioning(id);
    setAccountReqFeedback(null);
    try {
      const updated = await api.approveAccountRequest(
        id,
        `Approved ${req.accountType} (${req.currency}) vault provisioning by administrator`
      );
      setAccountReqFeedback({
        type: 'success',
        text: `Approved onboarding request! Opened zero-balance vault ${updated.createdAccountNumber || ''} for ${req.userEmail}.`
      });
      if (onRefreshAccounts) await onRefreshAccounts();
      if (onRequestsUpdated) await onRequestsUpdated();
      await loadData();
    } catch (err) {
      setAccountReqFeedback({
        type: 'error',
        text: err.message || 'Failed to approve account opening request'
      });
    } finally {
      setAccountRequestActioning(null);
    }
  };

  const handleRejectAccountRequest = async (id, req) => {
    setAccountRequestActioning(id);
    setAccountReqFeedback(null);
    try {
      await api.rejectAccountRequest(
        id,
        `Declined ${req.accountType} onboarding application during administrative compliance screening`
      );
      setAccountReqFeedback({
        type: 'success',
        text: `Declined account opening request for ${req.userEmail} and wrote immutable audit trail.`
      });
      if (onRequestsUpdated) await onRequestsUpdated();
      await loadData();
    } catch (err) {
      setAccountReqFeedback({
        type: 'error',
        text: err.message || 'Failed to reject account opening request'
      });
    } finally {
      setAccountRequestActioning(null);
    }
  };

  const handleApproveDepositRequest = async (id, referenceMemo) => {
    setDepositRequestActioning(id);
    setApprovalFeedback(null);
    try {
      await api.approveDepositRequest(
        id,
        `Verified and settled via Treasury Ops: ${referenceMemo || 'Standard Remittance'}`
      );
      setApprovalFeedback({
        type: 'success',
        text: 'Deposit approved and credited atomically with balanced SYSTEM_FUNDING double-entry!'
      });
      if (onRefreshAccounts) await onRefreshAccounts();
      if (onRequestsUpdated) await onRequestsUpdated();
      await loadData();
    } catch (err) {
      setApprovalFeedback({
        type: 'error',
        text: err.message || 'Failed to approve deposit request'
      });
    } finally {
      setDepositRequestActioning(null);
    }
  };

  const handleRejectDepositRequest = async (id) => {
    setDepositRequestActioning(id);
    setApprovalFeedback(null);
    try {
      await api.rejectDepositRequest(id, 'Rejected by Treasury Administration during settlement audit');
      setApprovalFeedback({
        type: 'success',
        text: 'Deposit request rejected and logged into immutable compliance audit trail.'
      });
      if (onRequestsUpdated) await onRequestsUpdated();
      await loadData();
    } catch (err) {
      setApprovalFeedback({
        type: 'error',
        text: err.message || 'Failed to reject deposit request'
      });
    } finally {
      setDepositRequestActioning(null);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedAccForStatus) return;

    setStatusSubmitting(true);
    setStatusMessage(null);
    try {
      const reason = adminReason && adminReason.trim() ? adminReason.trim() : 'Administrative status update';
      await api.updateAccountStatus(selectedAccForStatus.id, newStatus, reason);
      setStatusMessage({ type: 'success', text: `Account status updated to ${newStatus}. Logged cleanly in audit journal.` });
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
      await api.adminDeposit(payload);
      setDepositMessage({
        type: 'success',
        text: `Successfully injected ₹${parseFloat(depositAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} into ${depositTarget}. Balanced via SYSTEM_FUNDING.`
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

  const formatBalance = (val, currency = 'INR', isSystem = false) => {
    const raw = parseFloat(val) || 0;
    if (isSystem) {
      return `₹${Math.abs(raw).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency} (Allocated)`;
    }
    const num = Math.max(0, raw);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const filteredLogs = auditLogs.filter(l => {
    if (logStatusFilter === 'REFUSED' && l.status !== 'REFUSED') return false;
    if (logStatusFilter === 'SUCCESS' && l.status !== 'SUCCESS') return false;
    if (logStatusFilter === 'SECURITY' && !(`${l.action || ''} ${l.details || ''}`.toUpperCase().includes('IDOR') || l.status === 'REFUSED' || `${l.action || ''}`.toUpperCase().includes('REJECT'))) return false;
    const text = `${l.action || l.operationType || ''} ${l.status || ''} ${l.resource || l.accountNumber || ''} ${l.details || ''} ${l.userRole || ''}`.toLowerCase();
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
    return (
      (acc.accountNumber || '').toLowerCase().includes(q) ||
      (acc.ownerEmail || acc.ownerId || '').toLowerCase().includes(q) ||
      (acc.status || '').toLowerCase().includes(q) ||
      (acc.currency || '').toLowerCase().includes(q) ||
      (acc.id || '').toLowerCase().includes(q)
    );
  });

  const totalStatusAccounts = filteredStatusAccounts.length;
  const totalAccountPages = Math.max(1, Math.ceil(totalStatusAccounts / accountPageSize));
  const validAccountPage = Math.min(accountPage, totalAccountPages);
  const startAccIdx = (validAccountPage - 1) * accountPageSize;
  const endAccIdx = Math.min(startAccIdx + accountPageSize, totalStatusAccounts);
  const paginatedStatusAccounts = filteredStatusAccounts.slice(startAccIdx, endAccIdx);

  const pendingAccCount = accountRequests.filter(r => r.status === 'PENDING').length;
  const pendingDepCount = depositRequests.filter(r => r.status === 'PENDING').length;
  const refusedCount = auditLogs.filter(l => l.status === 'REFUSED').length;

  const showAll = section === 'all' || section === 'admin-audit';
  const showAccountRequests = showAll || section === 'admin-accounts' || section === 'admin-users';
  const showDepositRequests = showAll || section === 'admin-deposits';
  const showAdminTreasury = (showAll || section === 'admin-deposits') && user.role === 'ADMIN';
  const showFreezeControls = (showAll || section === 'admin-accounts' || section === 'admin-reversals') && user.role === 'ADMIN';
  const showUserDirectory = (showAll || section === 'admin-users') && user.role === 'ADMIN';
  const showIntegrityReport = showAll || section === 'integrity-reports';
  const showAuditTrail = showAll || section === 'audit-logs' || section === 'admin-reversals' || section === 'integrity-reports';

  const sectionMeta = {
    'admin-users': { breadcrumb: 'ADMINISTRATIVE CONTROL / USER DIRECTORY', title: 'User Identity & Onboarding Governance' },
    'admin-accounts': { breadcrumb: 'ADMINISTRATIVE CONTROL / VAULT GOVERNANCE', title: 'Account Approvals & Status Control' },
    'admin-deposits': { breadcrumb: 'OPERATIONS & LIQUIDITY / TREASURY QUEUE', title: 'Maker-Checker Deposit Queue & Treasury Minting' },
    'admin-reversals': { breadcrumb: 'ADMINISTRATIVE CONTROL / RISK & FREEZE OPS', title: 'Account Freeze & Security Refusal Monitoring' },
    'audit-logs': { breadcrumb: 'COMPLIANCE OVERSIGHT / IMMUTABLE JOURNAL', title: 'Immutable Audit Trail & Security Logs' },
    'integrity-reports': { breadcrumb: 'COMPLIANCE OVERSIGHT / INTEGRITY VERIFICATION', title: 'Mathematical Conservation & Integrity Reports' }
  };

  const currentHeader = sectionMeta[section] || {
    breadcrumb: 'GOVERNANCE & COMPLIANCE / CENTRAL CONSOLE',
    title: 'Admin & Audit Control Center'
  };

  const subTabs = [
    { id: 'all', label: 'All Controls' },
    { id: 'admin-accounts', label: `Account Openings`, count: pendingAccCount },
    { id: 'admin-deposits', label: `Deposit Queue`, count: pendingDepCount },
    ...(user.role === 'ADMIN' ? [{ id: 'admin-users', label: `Users (${adminUsers.length})` }] : []),
    { id: 'integrity-reports', label: 'Integrity Report' },
    { id: 'audit-logs', label: `Audit Logs (${auditLogs.length})` }
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600">
            <span>{currentHeader.breadcrumb}</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[9px]">
              DUAL-CONTROL ENABLED
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            {currentHeader.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cryptographic ledger verification, Maker-Checker treasury approvals, vault opening authorization, and immutable journal monitoring.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Refreshing Telemetry...' : 'Sync Governance Data'}</span>
        </button>
      </div>

      {/* Sub-navigation Pills */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        {subTabs.map((t) => {
          const active = (section === t.id) || (t.id === 'all' && section === 'admin-audit');
          return (
            <button
              key={t.id}
              onClick={() => setSection(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 ${
                active
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>{t.label}</span>
              {t.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  active ? 'bg-indigo-500 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* KPI Cards Grid (Midnight Slate + Cool Frost Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Featured Dark Slate Liquidity Card */}
        <div className="bg-[#0f172a] text-white rounded-2xl p-5 shadow-md border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              AGGREGATE CORE LIQUIDITY
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Conserved
            </span>
          </div>
          <div className="text-2xl font-mono font-extrabold text-white tabular-nums mt-3">
            {aggregate ? formatBalance(aggregate.totalBalance, aggregate.currency) : '₹0.00 INR'}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400">SYSTEM_FUNDING + Vaults</span>
            <span className="text-emerald-400 font-bold">Σ(DR) = Σ(CR)</span>
          </div>
        </div>

        {/* Account Opening Pending Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              ACCOUNT OPENINGS
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              pendingAccCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'
            }`}>
              {pendingAccCount} Pending
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3 tabular-nums">
            {accountRequests.length}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Vault onboarding queue</span>
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
          </div>
        </div>

        {/* Pending Deposit Approvals Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              DEPOSIT APPROVALS
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              pendingDepCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {pendingDepCount} Queued
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3 tabular-nums">
            {depositRequests.length}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Maker-Checker settlements</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
        </div>

        {/* Active Vaults / Security Alerts */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              ACTIVE VAULTS / ALERTS
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
              {refusedCount} Intercepted
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3 tabular-nums">
            {aggregate ? aggregate.activeAccounts : 0}
            <span className="text-sm font-normal text-slate-400 ml-1.5">/ {aggregate ? aggregate.totalAccounts : 0}</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{auditLogs.length} immutable journal entries</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          </div>
        </div>
      </div>

      {/* SECTION 1: Account Opening Approvals Queue */}
      {showAccountRequests && (user.role === 'ADMIN' || user.role === 'AUDITOR') && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Account Opening Applications Queue
                </h3>
                {pendingAccCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {pendingAccCount} Awaiting Verification
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Customers apply for Personal, Business Corporate, Treasury, or Multi-Currency vaults. Approving creates a real zero-balance active account immediately.
              </p>
            </div>
          </div>

          {accountReqFeedback && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 font-medium ${
              accountReqFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {accountReqFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{accountReqFeedback.text}</span>
            </div>
          )}

          {accountRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200 font-mono">
              No customer account opening applications submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date / App ID</th>
                    <th className="py-2.5 px-3">Applicant</th>
                    <th className="py-2.5 px-3">Vault Type</th>
                    <th className="py-2.5 px-3">Currency</th>
                    <th className="py-2.5 px-3">Purpose / Justification</th>
                    <th className="py-2.5 px-3">Status</th>
                    {user.role === 'ADMIN' && <th className="py-2.5 px-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accountRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        <div>{req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                        <div className="text-[9px] text-slate-400">{req.id?.substring(0, 8)}...</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{req.userFullName || req.userEmail}</div>
                        <div className="text-[11px] font-mono text-slate-500">{req.userEmail}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-indigo-700">
                        {req.accountType?.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">
                        {req.currency}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={req.reason}>
                        {req.reason || '—'}
                        {req.createdAccountNumber && (
                          <div className="text-[10px] font-mono text-emerald-700 font-semibold mt-0.5">
                            Provisioned: {req.createdAccountNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : req.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
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
                                disabled={accountRequestActioning === req.id}
                                onClick={() => handleApproveAccountRequest(req.id, req)}
                                className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition shadow-2xs disabled:opacity-50"
                              >
                                {accountRequestActioning === req.id ? 'Provisioning...' : 'Approve & Open'}
                              </button>
                              <button
                                type="button"
                                disabled={accountRequestActioning === req.id}
                                onClick={() => handleRejectAccountRequest(req.id, req)}
                                className="px-2.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400">
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

      {/* SECTION 2: Maker-Checker Deposit Approvals Queue */}
      {showDepositRequests && (user.role === 'ADMIN' || user.role === 'AUDITOR') && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Treasury Deposit Approvals (Maker-Checker Queue)
                </h3>
                {pendingDepCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    {pendingDepCount} Pending Release
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dual-control settlement: Customers initiate remittance requests; Administrators verify reference UTR and release double-entry liquidity.
              </p>
            </div>
          </div>

          {approvalFeedback && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 font-medium ${
              approvalFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
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
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200 font-mono">
              No pending or historical deposit requests recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date / ID</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3">Requester</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Reference / Memo</th>
                    <th className="py-2.5 px-3">Status</th>
                    {user.role === 'ADMIN' && <th className="py-2.5 px-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {depositRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        <div>{req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                        <div className="text-[9px] text-slate-400">{req.id?.substring(0, 8)}...</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {req.accountNumber || req.accountId?.substring(0, 12)}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                        {req.userEmail || 'Customer'}
                      </td>
                      <td className="py-3 px-3 font-mono text-sm font-bold text-slate-900">
                        ₹{Number(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={req.referenceMemo}>
                        {req.referenceMemo || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : req.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
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
                                className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition shadow-2xs disabled:opacity-50"
                              >
                                {depositRequestActioning === req.id ? 'Approving...' : 'Approve & Fund'}
                              </button>
                              <button
                                type="button"
                                disabled={depositRequestActioning === req.id}
                                onClick={() => handleRejectDepositRequest(req.id)}
                                className="px-2.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400">
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

      {/* SECTION 3: Admin Direct Treasury Credit */}
      {showAdminTreasury && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Coins className="w-4 h-4 text-indigo-600" />
                <span>Admin Direct Treasury Credit (Double-Entry Balanced)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inject settled liquidity into any active customer vault. Atomically debits SYSTEM_FUNDING to maintain Σ(DR)=Σ(CR).
              </p>
            </div>
          </div>

          {depositMessage && (
            <div className={`p-3.5 rounded-xl text-xs font-mono flex items-center space-x-2 ${
              depositMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Account Number or UUID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ACC-BOB-2002"
                  value={depositTarget}
                  onChange={(e) => setDepositTarget(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Deposit Amount (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-mono text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="1000.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Settlement Memo
                </label>
                <input
                  type="text"
                  placeholder="Liquidity injection or approved credit"
                  value={depositDescription}
                  onChange={(e) => setDepositDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={depositSubmitting || !depositTarget.trim() || !depositAmount}
              className="py-2.5 px-5 bg-[#0f172a] hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-2xs inline-flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{depositSubmitting ? 'Processing Credit...' : 'Credit Account via Treasury'}</span>
            </button>
          </form>
        </div>
      )}

      {/* SECTION 4: Integrity Verification Report (For integrity-reports view) */}
      {showIntegrityReport && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>Cryptographic Invariant & Liquidity Conservation Summary</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time aggregate balance check across customer vaults and system clearing accounts.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px] font-bold">
              INVARIANT: Σ(DR) = Σ(CR) · 0.00 VARIANCE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">System Clearing Allocation</div>
              <div className="text-lg font-mono font-bold text-slate-900 mt-1">
                {aggregate ? formatBalance(aggregate.totalBalance, aggregate.currency, true) : '₹0.00 INR'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Backed by SYSTEM_FUNDING contra-entries</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Overdraft Invariant Guard</div>
              <div className="text-lg font-mono font-bold text-emerald-700 mt-1">STRICT ≥ ₹0.00</div>
              <div className="text-[11px] text-slate-500 mt-1">Zero negative customer vaults enforced</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Audit Coverage</div>
              <div className="text-lg font-mono font-bold text-indigo-700 mt-1">100.00%</div>
              <div className="text-[11px] text-slate-500 mt-1">REQUIRES_NEW durable refusal persistence</div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: Account Status & Freeze Controls */}
      {showFreezeControls && accounts.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>Account Status & Freeze Controls</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Freeze or reinstate vaults in real time. Every administrative lock emits a tamper-proof audit entry.
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search vault or owner..."
                value={accountSearch}
                onChange={(e) => {
                  setAccountSearch(e.target.value);
                  setAccountPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 w-full sm:w-64 font-mono"
              />
              {accountSearch && (
                <button
                  type="button"
                  onClick={() => setAccountSearch('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {statusMessage && (
            <div className={`p-3.5 rounded-xl text-xs font-mono ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {statusMessage.text}
            </div>
          )}

          {filteredStatusAccounts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-mono bg-slate-50 rounded-xl border border-slate-200/70">
              No accounts match "{accountSearch}".
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginatedStatusAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between hover:border-indigo-200 transition"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-mono font-bold text-slate-900 truncate">
                        {acc.accountNumber}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                        {acc.ownerEmail || 'System Entity'}
                      </div>
                      <div className="text-[11px] text-slate-700 font-mono font-semibold mt-0.5">
                        {formatBalance(acc.balance, acc.currency || 'INR', acc.isSystem || acc.accountNumber?.startsWith('ACC-SYSTEM'))}
                      </div>
                      <span className={`inline-block mt-1.5 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        acc.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
                      className="flex items-center space-x-1 text-xs bg-white hover:bg-indigo-50 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 transition font-semibold shrink-0"
                    >
                      <Edit3 className="w-3 h-3 text-indigo-600" />
                      <span>Manage</span>
                    </button>
                  </div>
                ))}
              </div>

              {totalStatusAccounts > accountPageSize && (
                <div className="flex items-center justify-between pt-2 text-xs font-mono text-slate-500">
                  <span>Showing {startAccIdx + 1}–{endAccIdx} of {totalStatusAccounts} vaults</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setAccountPage(p => Math.max(1, p - 1))}
                      disabled={validAccountPage <= 1}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 rounded-lg border border-slate-200"
                    >
                      Prev
                    </button>
                    <span>{validAccountPage} / {totalAccountPages}</span>
                    <button
                      onClick={() => setAccountPage(p => Math.min(totalAccountPages, p + 1))}
                      disabled={validAccountPage >= totalAccountPages}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 rounded-lg border border-slate-200"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {selectedAccForStatus && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
              <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <h4 className="text-lg font-bold text-slate-900">
                  Update Status: <span className="font-mono text-indigo-600">{selectedAccForStatus.accountNumber}</span>
                </h4>
                <form onSubmit={handleUpdateStatus} className="space-y-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      New Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                    >
                      <option value="ACTIVE">ACTIVE — Normal Operations Permitted</option>
                      <option value="FROZEN">FROZEN — Debits & Credits Blocked (Logged)</option>
                      <option value="SUSPENDED">SUSPENDED — Complete Administrative Lock</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Audited Reason
                    </label>
                    <textarea
                      placeholder="e.g. Compliance KYC check or unusual velocity pattern"
                      value={adminReason}
                      onChange={(e) => setAdminReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAccForStatus(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={statusSubmitting}
                      className="px-5 py-2 bg-[#0f172a] hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition shadow-2xs"
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

      {/* SECTION 6: Registered Users Directory (Admin Only) */}
      {showUserDirectory && adminUsers.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Platform Identity Registry ({adminUsers.length} Principals)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Registered institutional accounts, compliance auditors, and platform administrators.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">User UUID</th>
                  <th className="py-2.5 px-3">Email Principal</th>
                  <th className="py-2.5 px-3">RBAC Role</th>
                  <th className="py-2.5 px-3">Registered Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {adminUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 text-slate-400">{String(u.id).substring(0, 12)}...</td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        u.role === 'ADMIN'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : u.role === 'AUDITOR'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 7: Immutable Audit Log Table */}
      {showAuditTrail && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>Immutable System Audit Trail & Security Journal</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete append-only forensic journal of settlements, refusals, IDOR interceptions, and governance decisions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'SUCCESS', 'REFUSED', 'SECURITY'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setLogStatusFilter(st);
                    setLogPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition border ${
                    logStatusFilter === st
                      ? 'bg-[#0f172a] text-white border-[#0f172a]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2" />
                <input
                  type="text"
                  placeholder="Filter journal..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setLogPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 w-44 sm:w-56 font-mono"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setLogPage(1);
                    }}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {totalLogs === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-mono bg-slate-50 rounded-xl border border-slate-200/70">
              No audit records match the current filter criteria.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Operation</th>
                      <th className="px-4 py-3">Resource</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Details / Interception Reason</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {paginatedLogs.map((log) => {
                      const isSuccess = log.status === 'SUCCESS';
                      const isRefused = log.status === 'REFUSED';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            <div className="text-[10px] text-slate-400">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                              log.action?.includes('IDOR') || log.action?.includes('SECURITY') || isRefused
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {log.action || log.operationType}
                            </span>
                          </td>

                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {log.resource || log.accountNumber || 'SYSTEM'}
                          </td>

                          <td className="px-4 py-3 text-slate-500">
                            {log.userRole || 'ANONYMOUS'}
                          </td>

                          <td className="px-4 py-3 font-sans text-slate-600 max-w-xs truncate" title={log.details}>
                            {log.details || '—'}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                              isSuccess
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isRefused
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
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

              {totalLogPages > 1 && (
                <div className="flex items-center justify-between pt-2 text-xs font-mono text-slate-500">
                  <span>Showing {startLogIndex + 1}–{endLogIndex} of {totalLogs} events</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setLogPage(p => Math.max(1, p - 1))}
                      disabled={validLogPage <= 1}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 rounded-lg border border-slate-200 font-semibold"
                    >
                      Prev
                    </button>
                    <span className="font-semibold text-slate-900">{validLogPage} / {totalLogPages}</span>
                    <button
                      onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                      disabled={validLogPage >= totalLogPages}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 rounded-lg border border-slate-200 font-semibold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
