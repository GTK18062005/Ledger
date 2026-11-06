import React from 'react';
import { ShieldCheck, LogOut, Wallet, UserCircle, Activity } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'AUDITOR':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'ACCOUNT_HOLDER':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 border border-sky-400/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xl tracking-tight text-white font-mono">LedgerLine</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Double-Entry Core
              </span>
            </div>
            <p className="text-xs text-slate-400">Strict Append-Only Financial Engine</p>
          </div>
        </div>

        {/* User Info & Actions */}
        {user ? (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5 bg-slate-800/60 border border-slate-700/60 px-3.5 py-1.5 rounded-xl">
              <UserCircle className="w-5 h-5 text-slate-400" />
              <div className="text-left">
                <div className="text-xs font-medium text-slate-200">{user.email}</div>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getRoleBadge(user.role)}`}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 px-3 py-2 rounded-xl transition duration-150"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>ACID Concurrency Enforced</span>
          </div>
        )}
      </div>
    </header>
  );
}
