import React from 'react';
import {
  LayoutGrid,
  Landmark,
  FileSpreadsheet,
  FilePlus2,
  ShieldCheck,
  Users,
  Settings2,
  ArrowLeftRight,
  RotateCcw,
  Coins,
  ClipboardList,
  BarChart3,
  Eye,
  LogOut,
  Shield
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  onSelectTab,
  user,
  onLogout,
  pendingAccountRequestsCount = 0,
  pendingDepositRequestsCount = 0,
  securityAlertsCount = 0
}) {
  const isAdmin = user?.role === 'ADMIN';
  const isAuditor = user?.role === 'AUDITOR';
  const isAccountHolder = !isAdmin && !isAuditor;

  const getRoleMeta = () => {
    if (isAdmin) {
      return {
        tag: 'SYS_ADMIN',
        title: user?.fullName || 'System Administrator',
        subtitle: 'Full Platform Authority'
      };
    }
    if (isAuditor) {
      return {
        tag: 'AUDITOR',
        title: user?.fullName || 'Compliance Auditor',
        subtitle: 'Continuous Assurance'
      };
    }
    return {
      tag: 'ACCOUNT_HOLDER',
      title: user?.fullName || user?.email?.split('@')[0] || 'Client Account',
      subtitle: 'Custodial Treasury Vault'
    };
  };

  const roleMeta = getRoleMeta();

  const sections = [];

  if (isAdmin) {
    sections.push({
      label: 'Administrative Control',
      items: [
        {
          id: 'admin-audit',
          label: 'Admin Dashboard',
          icon: ShieldCheck,
          badge: pendingAccountRequestsCount + pendingDepositRequestsCount
        },
        { id: 'admin-users', label: 'User Management', icon: Users },
        { id: 'admin-accounts', label: 'Account Management', icon: Settings2 },
        { id: 'admin-transactions', label: 'Transaction Management', icon: ArrowLeftRight },
        { id: 'admin-reversals', label: 'Reversal Management', icon: RotateCcw },
      ]
    });
    sections.push({
      label: 'Operations & Liquidity',
      items: [
        {
          id: 'operations',
          label: 'Deposit & Withdraw',
          icon: Coins,
          badge: pendingDepositRequestsCount
        },
        { id: 'accounts', label: 'Platform Accounts', icon: Landmark },
        { id: 'statements', label: 'Platform Transactions', icon: FileSpreadsheet },
      ]
    });
    sections.push({
      label: 'Compliance Oversight',
      items: [
        { id: 'auditor-overview', label: 'Auditor Overview', icon: Eye },
        {
          id: 'audit-logs',
          label: 'Audit Logs',
          icon: ClipboardList,
          badge: securityAlertsCount,
          badgeTone: 'rose'
        },
        { id: 'integrity-reports', label: 'Integrity Reports', icon: BarChart3 },
      ]
    });
  } else if (isAuditor) {
    sections.push({
      label: 'Oversight & Operations',
      items: [
        { id: 'auditor-overview', label: 'Auditor Overview', icon: Eye },
        { id: 'accounts', label: 'Platform Accounts', icon: Landmark },
        { id: 'statements', label: 'Platform Transactions', icon: FileSpreadsheet },
        {
          id: 'audit-logs',
          label: 'Audit Logs',
          icon: ClipboardList,
          badge: securityAlertsCount,
          badgeTone: 'rose'
        },
        { id: 'integrity-reports', label: 'Integrity Reports', icon: BarChart3 },
      ]
    });
  } else if (isAccountHolder) {
    sections.push({
      label: 'Custody & Treasury',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutGrid },
        { id: 'accounts', label: 'Accounts', icon: Landmark },
        {
          id: 'operations',
          label: 'Deposit & Withdraw',
          icon: Coins,
          badge: pendingDepositRequestsCount
        },
        { id: 'statements', label: 'Statements', icon: FileSpreadsheet },
        {
          id: 'account-request',
          label: 'Account request',
          icon: FilePlus2,
          badge: pendingAccountRequestsCount
        },
      ]
    });
  }

  return (
    <aside className="w-64 bg-[#0e3020] text-white flex flex-col justify-between shrink-0 min-h-screen border-r border-[#164430] select-none">
      <div className="p-4 overflow-y-auto">
        {/* Swiss Editorial Forest Green Wordmark */}
        <div className="flex items-center space-x-2.5 px-2 pt-1 pb-4">
          <div className="w-8 h-8 rounded-xl bg-[#184834] border border-[#245f44] flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-[#cbe4d5]" />
          </div>
          <div>
            <span className="font-serif font-bold tracking-tight text-white text-lg leading-none block">
              LedgerLine
            </span>
            <span className="text-[10px] font-mono text-[#7fa993] tracking-wider uppercase">
              Double-Entry Core
            </span>
          </div>
        </div>

        {/* Operating Role Identity Card */}
        <div className="mb-5 bg-[#123825] border border-[#20543b] rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#7ea992]">
              Operating Role
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-[#184834] text-emerald-300 border border-[#2b6b4d]">
              {roleMeta.tag}
            </span>
          </div>
          <p className="text-xs font-semibold text-white truncate">{roleMeta.title}</p>
          <p className="text-[11px] text-[#8db5a0] truncate">{roleMeta.subtitle}</p>
        </div>

        {/* Grouped Navigation Sections */}
        <nav className="space-y-5">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="px-3 mb-2 text-[10px] font-mono font-semibold uppercase tracking-widest text-[#729c85]">
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
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                        isActive
                          ? 'bg-[#184834] text-white border border-[#245f44] shadow-sm font-semibold'
                          : 'text-[#9ec5b2] hover:text-white hover:bg-[#143e2d] border border-transparent'
                      }`}
                    >
                      <span className="flex items-center space-x-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badge > 0 && (
                        <span
                          className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                            item.badgeTone === 'rose'
                              ? 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                              : 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
                          }`}
                        >
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

      {/* Bottom Sign-out Footer */}
      <div className="p-4 border-t border-[#164430]">
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-[#9ec5b2] hover:text-white hover:bg-[#143e2d] transition"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign out of workspace</span>
        </button>
      </div>
    </aside>
  );
}
