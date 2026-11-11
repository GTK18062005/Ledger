import React from 'react';
import { LayoutGrid, CreditCard, FileText, Plus, ShieldCheck, Check, ChevronRight, ShieldAlert, LogOut } from 'lucide-react';

export default function Sidebar({
  activeTab,
  onSelectTab,
  user,
  onLogout,
  pendingAccountRequestsCount = 0,
  pendingDepositRequestsCount = 0
}) {
  const isAdminOrAuditor = user && (user.role === 'ADMIN' || user.role === 'AUDITOR');
  const totalAdminPending = (pendingAccountRequestsCount || 0) + (pendingDepositRequestsCount || 0);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'accounts', label: 'Accounts', icon: CreditCard, hasArrow: true },
    { id: 'statements', label: 'Statements', icon: FileText },
    {
      id: 'account-request',
      label: 'Account request',
      icon: Plus,
      badge: !isAdminOrAuditor && pendingAccountRequestsCount > 0 ? pendingAccountRequestsCount : 0
    },
  ];

  if (isAdminOrAuditor) {
    navItems.push({
      id: 'admin-audit',
      label: 'Admin & Audit',
      icon: ShieldAlert,
      badge: totalAdminPending > 0 ? totalAdminPending : 0
    });
  }

  return (
    <aside className="w-64 bg-[#0e3020] text-white flex flex-col justify-between shrink-0 min-h-screen border-r border-[#164430] select-none">
      <div>
        {/* Brand Header */}
        <div className="flex items-center space-x-2.5 px-6 py-6 border-b border-[#15412d]">
          <div className="w-8 h-8 rounded-full bg-[#1b4b35] flex items-center justify-center text-[#e2ede4] font-serif font-bold text-xl shadow-inner">
            b
          </div>
          <span className="font-bold text-lg text-white tracking-tight lowercase">
            balancevault
          </span>
        </div>

        {/* Workspace Nav Header */}
        <div className="px-6 pt-6 pb-2 text-[10px] font-mono font-semibold uppercase tracking-widest text-[#729c85]">
          Workspace
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#184834] text-white border border-[#245f44] shadow-sm'
                    : 'text-[#9ec5b2] hover:text-white hover:bg-[#143e2d] border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#7ca591]'}`} />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  {item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#215941] text-[#a7e0b8] border border-[#2f7556]">
                      {item.badge}
                    </span>
                  )}
                  {item.hasArrow && (
                    <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#618a75]'}`} />
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Security Badge & Footer */}
      <div className="p-3">
        <div className="p-3.5 rounded-xl bg-[#143c2c]/90 border border-[#1e523d] flex items-center justify-between mb-3 shadow-sm">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1a4b36] flex items-center justify-center text-[#4ade80]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white leading-tight">Protected ledger</div>
              <div className="text-[10px] text-[#86ab96] leading-tight">Secure by design</div>
            </div>
          </div>
          <Check className="w-4 h-4 text-[#4ade80]" />
        </div>

        <div className="px-3 pb-2 flex items-center justify-between text-[10px] font-mono tracking-wider text-[#658b76]">
          <span>BALANCEVAULT · PRIVATE</span>
          <button 
            onClick={onLogout}
            title="Log out" 
            className="text-[#86ab96] hover:text-rose-400 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

