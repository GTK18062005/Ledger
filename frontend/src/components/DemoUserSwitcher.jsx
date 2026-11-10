import React, { useState } from 'react';
import { Shield, User, FileText, KeyRound, Loader2, Check } from 'lucide-react';

const DEMO_USERS = [
  {
    role: 'ADMIN',
    email: 'admin@ledgerline.io',
    name: 'Admin System',
    description: 'System clearing inspection, account status control & full audit logs',
    icon: Shield,
    badgeColor: 'text-purple-400 bg-purple-950/40 border-purple-500/30'
  },
  {
    role: 'ACCOUNT_HOLDER',
    email: 'alice@ledgerline.io',
    name: 'Alice (Account Holder)',
    description: 'Owns ACC-ALICE-1001. Initiates P2P transfers, deposits & withdrawals',
    icon: User,
    badgeColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
  },
  {
    role: 'ACCOUNT_HOLDER',
    email: 'bob@ledgerline.io',
    name: 'Bob (Account Holder)',
    description: 'Owns ACC-BOB-2002. Counterparty for concurrent money transfers',
    icon: User,
    badgeColor: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30'
  },
  {
    role: 'AUDITOR',
    email: 'auditor@ledgerline.io',
    name: 'Auditor Compliance',
    description: 'Strictly read-only inspection of immutable statements & IDOR logs',
    icon: FileText,
    badgeColor: 'text-amber-400 bg-amber-950/40 border-amber-500/30'
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
    <div className="bg-obsidian-850/80 border border-obsidian-750 rounded-xl p-4 sm:p-5 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
            <span>Interactive Multi-Tenant Personas</span>
          </h2>
          <p className="text-[11px] text-slate-400">
            Switch between authenticated security contexts to test RBAC, IDOR enforcement, and audit logging.
          </p>
        </div>
        <div className="text-[11px] font-mono text-slate-400 bg-obsidian-950 px-2.5 py-1 rounded border border-obsidian-750">
          Demo Pass: <span className="text-emerald-400">Password123!</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {DEMO_USERS.map((demo) => {
          const Icon = demo.icon;
          const isActive = currentUser && currentUser.email === demo.email;
          const isThisLoading = switchingEmail === demo.email && loading;

          return (
            <button
              key={demo.email}
              onClick={() => handleSwitch(demo.email)}
              disabled={loading}
              className={`text-left p-3 rounded-lg border transition-all duration-150 relative ${
                isActive
                  ? 'bg-obsidian-800 border-emerald-500/80 ring-1 ring-emerald-500/30'
                  : 'bg-obsidian-900 border-obsidian-750 hover:border-obsidian-700 hover:bg-obsidian-850'
              }`}
            >
              {isActive && (
                <div className="absolute top-2.5 right-2.5 bg-emerald-500 text-obsidian-950 rounded p-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}

              <div className="flex items-center space-x-2 mb-1.5">
                <div className="w-6 h-6 rounded bg-obsidian-950 border border-obsidian-750 flex items-center justify-center text-slate-300">
                  {isThisLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white tracking-tight">{demo.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">{demo.email}</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 my-2">
                {demo.description}
              </p>

              <div className="pt-2 border-t border-obsidian-750 flex items-center justify-between text-[10px] font-mono">
                <span className={`px-1.5 py-0.5 rounded border ${demo.badgeColor}`}>
                  {demo.role}
                </span>
                <span className={isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {isActive ? 'Active Context' : 'Switch →'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
