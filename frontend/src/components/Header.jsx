import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckCircle2, User, LogOut, ShieldAlert, Sparkles, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';

export default function Header({ user, activeTab, onLogout, onSelectUser, onNavigateTab }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTabBreadcrumb = () => {
    switch (activeTab) {
      case 'overview': return 'Overview';
      case 'accounts': return 'Accounts';
      case 'statements': return 'Statements';
      case 'account-request': return 'Account request';
      case 'admin-audit': return 'Admin & Audit';
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
    if (user.email === 'admin@ledgerline.io') return 'Administrator';
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

  const handleNav = (tab) => {
    setDropdownOpen(false);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  return (
    <header className="h-16 bg-[#f7f9f6] border-b border-[#e6ede3] px-6 sm:px-8 flex items-center justify-between select-none shrink-0">
      {/* Breadcrumb navigation */}
      <div className="flex items-center space-x-2 text-xs font-mono text-[#5b7566]">
        <span>Workspace</span>
        <span>/</span>
        <span className="font-semibold text-[#122a1f]">{getTabBreadcrumb()}</span>
      </div>

      {/* Systems Operational & User Profile */}
      <div className="flex items-center space-x-5">
        {/* Systems Operational Indicator */}
        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-[#456150] font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Systems operational</span>
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

          {/* Profile Dropdown matching reference screenshot */}
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

