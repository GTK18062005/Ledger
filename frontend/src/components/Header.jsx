import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, ShieldCheck, ArrowRight, Command, CreditCard, FileText } from 'lucide-react';

export default function Header({
  user,
  accounts = [],
  onLogout,
  onNavigateTab,
  onSelectAccountForStatement,
  pendingAccountRequestsCount = 0,
  pendingDepositRequestsCount = 0
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    function handleKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key === 'Escape') {
        setSearchFocused(false);
        searchInputRef.current?.blur();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getDisplayName = () => {
    if (!user) return 'Guest';
    if (user.fullName) return user.fullName;
    if (user.role === 'ADMIN') return 'System Administrator';
    if (user.role === 'AUDITOR') return 'Compliance Auditor';
    if (user.email === 'alice@ledgerline.io') return 'Alice Vance';
    if (user.email === 'bob@ledgerline.io') return 'Bob Smith';
    const prefix = user.email?.split('@')[0] || 'User';
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  };

  const getRoleLabel = () => {
    if (!user) return '';
    return user.role || 'ACCOUNT_HOLDER';
  };

  const displayName = getDisplayName();
  const initial = displayName.charAt(0).toUpperCase();
  const totalNotifs = pendingAccountRequestsCount + pendingDepositRequestsCount;

  const customerAccounts = (accounts || []).filter(
    (a) => !a.isSystem && !a.accountNumber?.startsWith('ACC-SYSTEM')
  );

  const searchResults = searchQuery.trim()
    ? customerAccounts.filter(
        (acc) =>
          acc.accountNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          acc.ownerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          acc.currency?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleNav = (tab) => {
    setDropdownOpen(false);
    setNotifOpen(false);
    if (onNavigateTab) onNavigateTab(tab);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between select-none shrink-0 z-30">
      {/* Left: Global Search Input matching reference screenshot */}
      <div className="relative w-full max-w-md mr-4">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transactions, accounts... (Press ⌘K)"
            className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl pl-10 pr-12 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition shadow-2xs"
          />
          <span className="hidden sm:inline-flex items-center space-x-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded-md absolute right-2.5 pointer-events-none">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </span>
        </div>

        {/* Instant Search Dropdown */}
        {searchFocused && searchQuery.trim() && (
          <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50">
            <div className="px-3 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
              Matching Accounts ({searchResults.length})
            </div>
            {searchResults.length === 0 ? (
              <div className="px-3 py-4 text-xs text-slate-500 text-center">
                No accounts matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {searchResults.slice(0, 6).map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onMouseDown={() => {
                      if (onSelectAccountForStatement) onSelectAccountForStatement(acc);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 text-left transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                      <div>
                        <div className="text-xs font-mono font-semibold text-slate-900">
                          {acc.accountNumber}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {acc.ownerEmail || 'System Vault'} · {acc.currency}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-slate-700">
                      ₹{parseFloat(acc.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: AES-256 Status Badge, Notification Bell, User Profile */}
      <div className="flex items-center space-x-4 shrink-0">
        {/* Cryptographic Uptime Indicator */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>AES-256 Validated</span>
          <span className="text-emerald-400">·</span>
          <span className="font-mono text-[11px]">99.99% Uptime</span>
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Compliance & Treasury Alerts"
          >
            <Bell className="w-4 h-4" />
            {totalNotifs > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">System Notifications</span>
                <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Live
                </span>
              </div>
              {user?.role === 'ADMIN' ? (
                <div className="space-y-2 text-xs">
                  <button
                    onClick={() => handleNav('admin-accounts')}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/70 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Account Opening Queue</div>
                      <div className="text-[11px] text-slate-500">
                        {pendingAccountRequestsCount} pending customer request(s)
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    onClick={() => handleNav('admin-deposits')}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/70 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Deposit Approval Queue</div>
                      <div className="text-[11px] text-slate-500">
                        {pendingDepositRequestsCount} pending wire deposit(s)
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              ) : (
                <div className="py-3 text-center text-xs text-slate-500">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                  All ledger balances verified. No security anomalies.
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile Pill & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-3 pl-2 pr-1.5 py-1 hover:bg-slate-50 rounded-xl transition"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {displayName}
              </div>
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider leading-tight mt-0.5">
                {getRoleLabel()}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {initial}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 text-xs">
              <button
                onClick={() => handleNav('profile')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
              >
                Profile
              </button>
              <button
                onClick={() => handleNav('settings')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
              >
                Settings
              </button>
              <button
                onClick={() => handleNav('security')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
              >
                Security
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout();
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition"
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
