import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckCircle2, User, LogOut, ShieldAlert, Sparkles } from 'lucide-react';

export default function Header({ user, activeTab, onLogout, onSelectUser }) {
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
      default: return 'Overview';
    }
  };

  const getDisplayName = () => {
    if (!user) return 'Guest';
    if (user.email === 'alice@ledgerline.io') return 'Alice Vance';
    if (user.email === 'bob@ledgerline.io') return 'Bob Smith';
    if (user.email === 'admin@ledgerline.io') return 'Administrator';
    if (user.email === 'auditor@ledgerline.io') return 'Compliance Auditor';
    
    // If Tharun or custom user
    if (user.name) return user.name;
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
            <div className="w-8 h-8 rounded-full bg-[#dbe8d8] text-[#133e2b] font-semibold text-xs flex items-center justify-center border border-[#cbdec7] shadow-sm">
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

          {/* Profile Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#e2ece0] rounded-2xl shadow-xl py-2 z-50 text-xs">
              <div className="px-4 py-3 border-b border-[#edf3ec]">
                <div className="font-semibold text-[#122a1f]">{displayName}</div>
                <div className="text-[11px] font-mono text-[#627f6e] truncate">{user?.email}</div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#eaf2e8] text-[#133e2b] border border-[#d2e4cf]">
                  ROLE: {user?.role}
                </span>
              </div>

              {/* Persona Switch Options */}
              {onSelectUser && (
                <div className="px-3 py-2 border-b border-[#edf3ec]">
                  <div className="text-[10px] font-mono uppercase text-[#739481] px-1 mb-1">
                    Quick Persona Switch:
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => { onSelectUser('alice@ledgerline.io', 'Password123!'); setDropdownOpen(false); }}
                      className="px-2 py-1 text-left rounded hover:bg-[#f2f6f1] text-[#1a4230] font-mono text-[11px]"
                    >
                      Alice (Holder)
                    </button>
                    <button
                      onClick={() => { onSelectUser('bob@ledgerline.io', 'Password123!'); setDropdownOpen(false); }}
                      className="px-2 py-1 text-left rounded hover:bg-[#f2f6f1] text-[#1a4230] font-mono text-[11px]"
                    >
                      Bob (Holder)
                    </button>
                    <button
                      onClick={() => { onSelectUser('admin@ledgerline.io', 'Password123!'); setDropdownOpen(false); }}
                      className="px-2 py-1 text-left rounded hover:bg-[#f2f6f1] text-[#1a4230] font-mono text-[11px]"
                    >
                      Admin
                    </button>
                    <button
                      onClick={() => { onSelectUser('auditor@ledgerline.io', 'Password123!'); setDropdownOpen(false); }}
                      className="px-2 py-1 text-left rounded hover:bg-[#f2f6f1] text-[#1a4230] font-mono text-[11px]"
                    >
                      Auditor
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => { setDropdownOpen(false); onLogout(); }}
                className="w-full flex items-center space-x-2 px-4 py-2.5 text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out session</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

