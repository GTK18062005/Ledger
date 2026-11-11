import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  Search,
  Bell,
  Landmark,
  ArrowLeftRight,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Coins
} from 'lucide-react';

export default function Header({
  user,
  activeTab,
  onLogout,
  onNavigateTab,
  accounts = [],
  transactions = [],
  auditLogs = [],
  pendingAccountRequestsCount = 0,
  pendingDepositRequestsCount = 0,
  securityAlertsCount = 0,
  onSelectSearchAccount
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
        setDropdownOpen(false);
        searchInputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getTabBreadcrumb = () => {
    switch (activeTab) {
      case 'overview': return 'Overview';
      case 'accounts': return user?.role === 'ACCOUNT_HOLDER' ? 'Accounts' : 'Platform Accounts';
      case 'operations': return 'Deposit & Withdraw';
      case 'statements': return user?.role === 'ACCOUNT_HOLDER' ? 'Statements' : 'Platform Transactions';
      case 'account-request': return 'Account Request';
      case 'admin-audit': return 'Admin Dashboard';
      case 'admin-users': return 'User Management';
      case 'admin-accounts': return 'Account Management';
      case 'admin-transactions': return 'Transaction Management';
      case 'admin-reversals': return 'Reversal Management';
      case 'auditor-overview': return 'Auditor Overview';
      case 'audit-logs': return 'Audit Logs';
      case 'integrity-reports': return 'Integrity Reports';
      case 'profile': return 'Profile';
      case 'security': return 'Security';
      case 'settings': return 'Settings';
      default: return 'Overview';
    }
  };

  const getDisplayName = () => {
    if (!user) return 'Guest';
    if (user.fullName) return user.fullName;
    if (user.name) return user.name;
    if (user.email === 'alice@ledgerline.io') return 'Alice Vance';
    if (user.email === 'bob@ledgerline.io') return 'Bob Smith';
    if (user.email === 'admin@ledgerline.io') return 'System Administrator';
    if (user.email === 'auditor@ledgerline.io') return 'Compliance Auditor';
    if (user.email?.toLowerCase().includes('tharun')) return 'Tharun Kumar Gangavarapu';
    const prefix = user.email.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  };

  const getRoleLabel = () => {
    if (!user) return '';
    if (user.role === 'ADMIN') return 'Administrator';
    if (user.role === 'AUDITOR') return 'Auditor';
    return 'Account holder';
  };

  const displayName = getDisplayName();
  const initial = displayName.charAt(0).toUpperCase();
  const isAdmin = user?.role === 'ADMIN';
  const isAuditor = user?.role === 'AUDITOR';
  const isGovernance = isAdmin || isAuditor;

  const handleNav = (tab) => {
    setDropdownOpen(false);
    setNotifOpen(false);
    setSearchOpen(false);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  const totalAlerts = isAdmin
    ? pendingAccountRequestsCount + pendingDepositRequestsCount + securityAlertsCount
    : isAuditor
      ? securityAlertsCount
      : pendingDepositRequestsCount + pendingAccountRequestsCount;

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matchedAccounts = (accounts || [])
      .filter((acc) => !q || (
        acc.accountNumber?.toLowerCase().includes(q) ||
        acc.ownerEmail?.toLowerCase().includes(q) ||
        acc.accountType?.toLowerCase().includes(q) ||
        acc.status?.toLowerCase().includes(q)
      ))
      .slice(0, 4);

    const matchedTx = (transactions || [])
      .filter((tx) => !q || (
        tx.transactionId?.toLowerCase().includes(q) ||
        tx.referenceMemo?.toLowerCase().includes(q) ||
        tx.transactionType?.toLowerCase().includes(q) ||
        tx.sourceAccountNumber?.toLowerCase().includes(q) ||
        tx.destinationAccountNumber?.toLowerCase().includes(q) ||
        tx.initiatedByEmail?.toLowerCase().includes(q)
      ))
      .slice(0, 4);

    const matchedAudit = isGovernance
      ? (auditLogs || [])
          .filter((log) => q && (
            log.action?.toLowerCase().includes(q) ||
            log.actorEmail?.toLowerCase().includes(q) ||
            log.details?.toLowerCase().includes(q) ||
            log.status?.toLowerCase().includes(q)
          ))
          .slice(0, 3)
      : [];

    const quickRoutes = [
      { id: 'operations', label: 'Deposit & Withdraw Desk', roles: ['ADMIN', 'ACCOUNT_HOLDER'], keywords: 'deposit withdraw fund liquidity transfer' },
      { id: 'admin-transactions', label: 'Transaction Management & Reversals', roles: ['ADMIN'], keywords: 'transaction management reversal compensate' },
      { id: 'admin-reversals', label: 'Reversal Management', roles: ['ADMIN'], keywords: 'reversal reverse double entry' },
      { id: 'auditor-overview', label: 'Auditor Overview & Continuous Assurance', roles: ['ADMIN', 'AUDITOR'], keywords: 'auditor assurance reconciliation continuous merkle' },
      { id: 'integrity-reports', label: 'Integrity Verification Reports', roles: ['ADMIN', 'AUDITOR'], keywords: 'integrity sha256 merkle report zero sum' },
      { id: 'audit-logs', label: 'Immutable Audit Logs', roles: ['ADMIN', 'AUDITOR'], keywords: 'audit logs security alerts triage' },
      { id: 'admin-users', label: 'User Management', roles: ['ADMIN'], keywords: 'users identities directory roles' },
      { id: 'admin-accounts', label: 'Account Management & Freeze', roles: ['ADMIN'], keywords: 'accounts freeze close status vault' },
      { id: 'statements', label: isGovernance ? 'Platform Transactions' : 'Ledger Statements', roles: ['ADMIN', 'AUDITOR', 'ACCOUNT_HOLDER'], keywords: 'statements journal transactions history' },
      { id: 'account-request', label: 'Account Opening Request', roles: ['ACCOUNT_HOLDER'], keywords: 'open new savings checking account request' },
    ].filter((r) => r.roles.includes(user?.role) && (!q || r.label.toLowerCase().includes(q) || r.keywords.includes(q)))
     .slice(0, 4);

    return { matchedAccounts, matchedTx, matchedAudit, quickRoutes };
  }, [searchQuery, accounts, transactions, auditLogs, isGovernance, user?.role]);

  return (
    <header className="h-16 bg-[#f7f9f6] border-b border-[#e6ede3] px-4 sm:px-8 flex items-center justify-between gap-4 select-none shrink-0 relative z-30">
      {/* Left: Breadcrumb & Quick Command Search */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="hidden lg:flex items-center space-x-2 text-xs font-mono text-[#5b7566] shrink-0">
          <span>Workspace</span>
          <span>/</span>
          <span className="font-semibold text-[#122a1f]">{getTabBreadcrumb()}</span>
        </div>

        {/* Global Command Search (Cmd+K / Ctrl+K) */}
        <div className="relative w-full max-w-md" ref={searchRef}>
          <div className={`flex items-center gap-2 bg-white border rounded-xl px-3 py-1.5 transition ${
            searchOpen ? 'border-[#133e2b] ring-2 ring-[#133e2b]/15' : 'border-[#dce6d8] hover:border-[#bfd2ba]'
          }`}>
            <Search className="w-3.5 h-3.5 text-[#5b7566] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              placeholder="Search transactions, accounts, or jump to module..."
              className="w-full bg-transparent text-xs text-[#122a1f] placeholder-[#799384] outline-none font-sans"
            />
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[#5b7566] bg-[#f2f6f0] border border-[#dce6d8] rounded-md shrink-0">
              ⌘K
            </kbd>
          </div>

          {searchOpen && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-[#dce6d8] rounded-2xl shadow-xl p-2 z-50 max-h-96 overflow-y-auto">
              {searchResults.quickRoutes.length > 0 && (
                <div className="mb-2">
                  <p className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#698675]">
                    Modules & Shortcuts
                  </p>
                  {searchResults.quickRoutes.map((route) => (
                    <button
                      key={route.id}
                      onClick={() => { setSearchQuery(''); handleNav(route.id); }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-[#122a1f] hover:bg-[#eaf2e8] transition text-left"
                    >
                      <span className="font-medium">{route.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#5b7566]" />
                    </button>
                  ))}
                </div>
              )}

              {searchResults.matchedAccounts.length > 0 && (
                <div className="mb-2 border-t border-[#eef3ec] pt-1.5">
                  <p className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#698675]">
                    Accounts
                  </p>
                  {searchResults.matchedAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => {
                        setSearchQuery('');
                        if (onSelectSearchAccount) onSelectSearchAccount(acc);
                        handleNav(isAdmin ? 'admin-accounts' : 'accounts');
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs hover:bg-[#eaf2e8] transition text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Landmark className="w-3.5 h-3.5 text-[#133e2b] shrink-0" />
                        <span className="font-mono font-semibold text-[#122a1f] truncate">{acc.accountNumber}</span>
                        {acc.ownerEmail && (
                          <span className="text-[11px] text-[#5b7566] truncate">{acc.ownerEmail}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f2f6f0] text-[#133e2b] shrink-0">
                        {acc.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.matchedTx.length > 0 && (
                <div className="mb-2 border-t border-[#eef3ec] pt-1.5">
                  <p className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#698675]">
                    Transactions
                  </p>
                  {searchResults.matchedTx.map((tx) => (
                    <button
                      key={tx.transactionId}
                      onClick={() => {
                        setSearchQuery('');
                        handleNav(isAdmin ? 'admin-transactions' : 'statements');
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs hover:bg-[#eaf2e8] transition text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ArrowLeftRight className="w-3.5 h-3.5 text-[#133e2b] shrink-0" />
                        <span className="font-medium text-[#122a1f] truncate">
                          {tx.referenceMemo || tx.transactionType}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-[#133e2b] shrink-0">
                        ₹{Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.matchedAudit.length > 0 && (
                <div className="border-t border-[#eef3ec] pt-1.5">
                  <p className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#698675]">
                    Audit Trail Events
                  </p>
                  {searchResults.matchedAudit.map((log, i) => (
                    <button
                      key={log.id || i}
                      onClick={() => { setSearchQuery(''); handleNav('audit-logs'); }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs hover:bg-[#eaf2e8] transition text-left"
                    >
                      <span className="font-mono text-[11px] text-[#122a1f] truncate">{log.action} · {log.actorEmail}</span>
                      <span className="text-[10px] font-mono text-[#5b7566]">{log.status}</span>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.quickRoutes.length === 0 &&
                searchResults.matchedAccounts.length === 0 &&
                searchResults.matchedTx.length === 0 &&
                searchResults.matchedAudit.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-[#698675]">
                    No matching accounts, transactions, or modules found.
                  </p>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Operational Status, Notifications & Profile */}
      <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
        {/* Systems Operational Indicator */}
        <div className="hidden xl:flex items-center space-x-2 text-xs text-[#456150] font-mono bg-white border border-[#e2ece0] px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>AES-256 · Systems operational</span>
        </div>

        {/* Notification Bell & Actionable Alerts Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="Notifications"
            className="relative p-2 hover:bg-[#edf2ea] rounded-xl transition text-[#2a4536]"
          >
            <Bell className="w-4.5 h-4.5" />
            {totalAlerts > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-bold flex items-center justify-center text-white ${
                securityAlertsCount > 0 && isGovernance ? 'bg-rose-600' : 'bg-[#133e2b]'
              }`}>
                {totalAlerts > 99 ? '99+' : totalAlerts}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#dce6d8] rounded-2xl shadow-xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#eef3ec]">
                <span className="text-xs font-serif font-semibold text-[#122a1f]">
                  Operational Alerts
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#eaf2e8] text-[#133e2b]">
                  {totalAlerts} Active
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                {pendingAccountRequestsCount > 0 && (
                  <button
                    onClick={() => handleNav(isAdmin ? 'admin-audit' : 'account-request')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#f7faf6] hover:bg-[#eaf2e8] border border-[#e5ede3] transition text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileCheck2 className="w-4 h-4 text-[#133e2b] shrink-0" />
                      <div>
                        <p className="font-semibold text-[#122a1f]">Account Applications</p>
                        <p className="text-[11px] text-[#5b7566]">
                          {pendingAccountRequestsCount} pending review
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#5b7566]" />
                  </button>
                )}

                {pendingDepositRequestsCount > 0 && (
                  <button
                    onClick={() => handleNav(isAdmin ? 'admin-audit' : 'operations')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#f7faf6] hover:bg-[#eaf2e8] border border-[#e5ede3] transition text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Coins className="w-4 h-4 text-[#133e2b] shrink-0" />
                      <div>
                        <p className="font-semibold text-[#122a1f]">Treasury Deposit Requests</p>
                        <p className="text-[11px] text-[#5b7566]">
                          {pendingDepositRequestsCount} awaiting authorization
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#5b7566]" />
                  </button>
                )}

                {isGovernance && securityAlertsCount > 0 && (
                  <button
                    onClick={() => handleNav('audit-logs')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 hover:bg-rose-50 border border-rose-200 transition text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" />
                      <div>
                        <p className="font-semibold text-rose-900">Security & Refusal Events</p>
                        <p className="text-[11px] text-rose-700">
                          {securityAlertsCount} flagged audit entries
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-rose-600" />
                  </button>
                )}

                {totalAlerts === 0 && (
                  <div className="py-5 px-3 text-center">
                    <CheckCircle2 className="w-6 h-6 text-[#133e2b] mx-auto mb-1.5 opacity-80" />
                    <p className="font-medium text-[#122a1f]">All systems nominal</p>
                    <p className="text-[11px] text-[#698675] mt-0.5">
                      Zero pending queues or unreviewed security events.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2.5 p-1.5 hover:bg-[#edf2ea] rounded-xl transition"
          >
            <div className="w-8 h-8 rounded-full bg-[#dbe8d8] text-[#133e2b] font-semibold text-xs flex items-center justify-center border border-[#cbdec7] shadow-xs">
              {initial}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-semibold text-[#122a1f] leading-snug">
                {displayName}
              </div>
              <div className="text-[10px] text-[#698675] leading-snug">
                {getRoleLabel()}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#698675]" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-[#e2ece0] rounded-2xl shadow-lg p-1.5 z-50 text-xs">
              <button
                onClick={() => handleNav('profile')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                  activeTab === 'profile'
                    ? 'bg-[#eaf2e8] text-[#133e2b] font-semibold'
                    : 'text-[#2a4536] hover:bg-[#edf4ec] hover:text-[#122a1f]'
                }`}
              >
                Profile
              </button>

              <button
                onClick={() => handleNav('settings')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                  activeTab === 'settings'
                    ? 'bg-[#eaf2e8] text-[#133e2b] font-semibold'
                    : 'text-[#2a4536] hover:bg-[#edf4ec] hover:text-[#122a1f]'
                }`}
              >
                Settings
              </button>

              <button
                onClick={() => handleNav('security')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                  activeTab === 'security'
                    ? 'bg-[#eaf2e8] text-[#133e2b] font-semibold'
                    : 'text-[#2a4536] hover:bg-[#edf4ec] hover:text-[#122a1f]'
                }`}
              >
                Security
              </button>

              <div className="my-1 border-t border-[#edf3ec]" />

              <button
                onClick={() => { setDropdownOpen(false); onLogout(); }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#2a4536] hover:bg-rose-50 hover:text-rose-700 transition"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
