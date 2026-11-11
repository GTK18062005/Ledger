import React from 'react';
import {
  Shield, ShieldCheck, Users, Landmark, ArrowLeftRight, Undo2,
  FileSearch, BarChart3, ReceiptText, Wallet, LayoutDashboard,
  CreditCard, PlusCircle, FileText, User, Lock, Settings, LogOut, Building2
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  onSelectTab,
  user,
  onLogout,
  pendingAccountRequestsCount = 0,
  pendingDepositRequestsCount = 0
}) {
  const role = user?.role || 'ACCOUNT_HOLDER';
  const isAdmin = role === 'ADMIN';
  const isAuditor = role === 'AUDITOR';

  const getRoleHeader = () => {
    if (isAdmin) {
      return {
        badge: 'SYS_ADMIN',
        title: 'System Administrator',
        subtitle: 'Full Platform Authority'
      };
    }
    if (isAuditor) {
      return {
        badge: 'AUDITOR',
        title: 'Compliance Auditor',
        subtitle: 'Read-Only Oversight'
      };
    }
    return {
      badge: 'CUSTOMER',
      title: user?.fullName || 'Account Holder',
      subtitle: 'Private Sovereign Vault'
    };
  };

  const roleHeader = getRoleHeader();

  const adminSections = [
    {
      label: 'ADMINISTRATIVE CONTROL',
      items: [
        { id: 'overview', label: 'Admin Dashboard', icon: Shield },
        { id: 'admin-users', label: 'User Management', icon: Users },
        {
          id: 'admin-accounts',
          label: 'Account Management',
          icon: Building2,
          badge: pendingAccountRequestsCount > 0 ? pendingAccountRequestsCount : null
        },
        {
          id: 'admin-deposits',
          label: 'Transaction Management',
          icon: ArrowLeftRight,
          badge: pendingDepositRequestsCount > 0 ? pendingDepositRequestsCount : null
        },
        { id: 'admin-reversals', label: 'Reversal Management', icon: Undo2 }
      ]
    },
    {
      label: 'OPERATIONS & LIQUIDITY',
      items: [
        { id: 'operations', label: 'Deposit & Withdraw', icon: Wallet },
        { id: 'accounts', label: 'Platform Accounts', icon: Landmark },
        { id: 'statements', label: 'Platform Transactions', icon: ReceiptText }
      ]
    },
    {
      label: 'COMPLIANCE OVERSIGHT',
      items: [
        { id: 'auditor-overview', label: 'Auditor Overview', icon: ShieldCheck },
        { id: 'audit-logs', label: 'Audit Logs', icon: FileSearch },
        { id: 'integrity-reports', label: 'Integrity Reports', icon: BarChart3 }
      ]
    }
  ];

  const auditorSections = [
    {
      label: 'COMPLIANCE OVERSIGHT',
      items: [
        { id: 'auditor-overview', label: 'Auditor Overview', icon: ShieldCheck },
        { id: 'audit-logs', label: 'Audit Logs', icon: FileSearch },
        { id: 'integrity-reports', label: 'Integrity Reports', icon: BarChart3 }
      ]
    },
    {
      label: 'PLATFORM VISIBILITY',
      items: [
        { id: 'accounts', label: 'Platform Accounts', icon: Landmark },
        { id: 'statements', label: 'Platform Transactions', icon: ReceiptText }
      ]
    }
  ];

  const customerSections = [
    {
      label: 'TREASURY WORKSPACE',
      items: [
        { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
        { id: 'accounts', label: 'My Accounts', icon: CreditCard },
        { id: 'account-request', label: 'Add Account Request', icon: PlusCircle }
      ]
    },
    {
      label: 'OPERATIONS & TRANSFERS',
      items: [
        { id: 'operations', label: 'Deposit & Withdraw', icon: Wallet },
        { id: 'transfers', label: 'Peer Transfers', icon: ArrowLeftRight },
        { id: 'statements', label: 'Statements & History', icon: FileText }
      ]
    },
    {
      label: 'ACCOUNT & SECURITY',
      items: [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'security', label: 'Security & Password', icon: Lock },
        { id: 'settings', label: 'Preferences', icon: Settings }
      ]
    }
  ];

  const sections = isAdmin
    ? adminSections
    : isAuditor
      ? auditorSections
      : customerSections;

  return (
    <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col justify-between shrink-0 min-h-screen border-r border-slate-800 select-none">
      <div className="flex-1 overflow-y-auto">
        {/* Operating Role Banner Card */}
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-400">
              OPERATING ROLE
            </span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{roleHeader.badge}</span>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/75 border border-slate-700/70 flex items-center space-x-3 shadow-inner">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate leading-tight">
                {roleHeader.title}
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5 leading-tight">
                {roleHeader.subtitle}
              </div>
            </div>
          </div>
        </div>

        {/* Grouped Navigation Menus */}
        <nav className="p-3 space-y-5">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="px-3 mb-2 text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-500">
                {section.label}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                        isActive
                          ? 'bg-slate-800 text-white border border-slate-700/80 shadow-sm font-semibold'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 border border-transparent font-medium'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Footer Session Control */}
      <div className="p-4 border-t border-slate-800/80 bg-[#0b1120]">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-300 font-semibold">BalanceVault</span>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="flex items-center space-x-1 text-slate-400 hover:text-rose-400 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
