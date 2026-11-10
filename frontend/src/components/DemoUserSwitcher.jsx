import React from 'react';
import { User, Shield, FileText, Check, ArrowRightLeft } from 'lucide-react';

export default function DemoUserSwitcher({ currentUser, onSelectUser, loading }) {
  const isAlice = currentUser && currentUser.email === 'alice@ledgerline.io';
  const isBob = currentUser && currentUser.email === 'bob@ledgerline.io';
  const isAdmin = currentUser && currentUser.role === 'ADMIN';
  const isAuditor = currentUser && currentUser.role === 'AUDITOR';

  return (
    <div className="bg-obsidian-900 border border-obsidian-750 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400 flex items-center space-x-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>Switch Person to Test Transfers</span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Currently logged in as: <strong className="text-emerald-400">{currentUser?.email}</strong> ({currentUser?.role})
          </p>
        </div>

        {/* Big 1-Click Persona Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Alice */}
          <button
            onClick={() => onSelectUser('alice@ledgerline.io', 'Password123!')}
            disabled={loading}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
              isAlice
                ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/40'
                : 'bg-obsidian-850 hover:bg-obsidian-800 text-slate-300 border border-obsidian-750'
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-300" />
            <span>Alice (ACC-ALICE-1001)</span>
            {isAlice && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          {/* Bob */}
          <button
            onClick={() => onSelectUser('bob@ledgerline.io', 'Password123!')}
            disabled={loading}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
              isBob
                ? 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-400/40'
                : 'bg-obsidian-850 hover:bg-obsidian-800 text-slate-300 border border-obsidian-750'
            }`}
          >
            <User className="w-3.5 h-3.5 text-cyan-300" />
            <span>Bob (ACC-BOB-2002)</span>
            {isBob && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          {/* Admin */}
          <button
            onClick={() => onSelectUser('admin@ledgerline.io', 'Password123!')}
            disabled={loading}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
              isAdmin
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-obsidian-850 hover:bg-obsidian-800 text-slate-400 border border-obsidian-750'
            }`}
            title="System Administrator (Audit logs, liquidity totals, account freezing)"
          >
            <Shield className="w-3 h-3 text-purple-400" />
            <span>Admin</span>
          </button>

          {/* Auditor */}
          <button
            onClick={() => onSelectUser('auditor@ledgerline.io', 'Password123!')}
            disabled={loading}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
              isAuditor
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-obsidian-850 hover:bg-obsidian-800 text-slate-400 border border-obsidian-750'
            }`}
            title="Compliance Auditor (Read-only statements & refusal logs)"
          >
            <FileText className="w-3 h-3 text-amber-400" />
            <span>Auditor</span>
          </button>
        </div>
      </div>
    </div>
  );
}
