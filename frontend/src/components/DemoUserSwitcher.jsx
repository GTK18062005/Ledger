import React, { useState } from 'react';
import { Shield, User, FileText, KeyRound, Loader2, Check } from 'lucide-react';

const DEMO_USERS = [
  {
    role: 'ADMIN',
    email: 'admin@ledgerline.io',
    name: 'Admin System',
    description: 'Create accounts, assign users, view system aggregates & audit logs',
    icon: Shield,
    color: 'from-purple-600 to-indigo-600',
    borderColor: 'border-purple-500/50 hover:border-purple-400'
  },
  {
    role: 'ACCOUNT_HOLDER',
    email: 'alice@ledgerline.io',
    name: 'Alice (Holder 1)',
    description: 'Owns ACC-ALICE-1001 (₹10,000.00). Transfer, deposit, withdraw',
    icon: User,
    color: 'from-emerald-600 to-teal-600',
    borderColor: 'border-emerald-500/50 hover:border-emerald-400'
  },
  {
    role: 'ACCOUNT_HOLDER',
    email: 'bob@ledgerline.io',
    name: 'Bob (Holder 2)',
    description: 'Owns ACC-BOB-2002 (₹5,000.00). Transfer, deposit, withdraw',
    icon: User,
    color: 'from-sky-600 to-cyan-600',
    borderColor: 'border-sky-500/50 hover:border-sky-400'
  },
  {
    role: 'AUDITOR',
    email: 'auditor@ledgerline.io',
    name: 'Auditor Read-Only',
    description: 'Strict read-only across all accounts, ledger statements & refusals',
    icon: FileText,
    color: 'from-amber-600 to-orange-600',
    borderColor: 'border-amber-500/50 hover:border-amber-400'
  }
];

export default function DemoUserSwitcher({ currentUser, onSelectUser, loading }) {
  const [switchingEmail, setSwitchingEmail] = useState(null);

  const handleSwitch = async (email) => {
    setSwitchingEmail(email);
    try {
      await onSelectUser(email, 'Password123!');
    } finally {
      setSwitchingEmail(null);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-8 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-sky-400" />
            <span>Interactive Demo Credential Switcher</span>
          </h2>
          <p className="text-xs text-slate-400">
            Switch between authenticated personas to verify Role-Based Access Control and Tenant Isolation.
          </p>
        </div>
        <div className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
          Default Password: <span className="text-sky-300">Password123!</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {DEMO_USERS.map((demo) => {
          const Icon = demo.icon;
          const isActive = currentUser && currentUser.email === demo.email;
          const isThisLoading = switchingEmail === demo.email && loading;

          return (
            <button
              key={demo.email}
              onClick={() => handleSwitch(demo.email)}
              disabled={loading}
              className={`text-left p-3.5 rounded-xl border transition-all duration-200 relative group ${
                isActive
                  ? 'bg-slate-800/90 border-sky-500 shadow-md shadow-sky-500/10 ring-1 ring-sky-500/50'
                  : `bg-slate-950/40 ${demo.borderColor} hover:bg-slate-800/40`
              }`}
            >
              {isActive && (
                <div className="absolute top-2.5 right-2.5 bg-sky-500 text-white rounded-full p-0.5">
                  <Check className="w-3 h-3" />
                </div>
              )}

              <div className="flex items-center space-x-2.5 mb-2">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${demo.color} flex items-center justify-center text-white shadow-sm`}>
                  {isThisLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white tracking-wide">{demo.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">{demo.email}</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                {demo.description}
              </p>

              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-medium">Role: <span className="text-slate-200">{demo.role}</span></span>
                <span className={`font-semibold ${isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-300'}`}>
                  {isActive ? 'Active' : 'Switch →'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
