import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck, ShieldAlert, Key, UserPlus, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage({ onLogin, loading, onOpenOnboardModal, onOpenBootstrapModal }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const demoPersonas = [
    {
      name: 'Alice (Account Holder)',
      email: 'alice@ledgerline.io',
      password: 'Password123!',
      role: 'ACCOUNT_HOLDER',
      roleBadge: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
      description: 'Primary customer with ₹1,000 balance & P2P transfers'
    },
    {
      name: 'Bob (Account Holder)',
      email: 'bob@ledgerline.io',
      password: 'Password123!',
      role: 'ACCOUNT_HOLDER',
      roleBadge: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
      description: 'Counterparty customer with ₹200 balance'
    },
    {
      name: 'System Administrator',
      email: 'admin@ledgerline.io',
      password: 'AdminSecret123!',
      role: 'ADMIN',
      roleBadge: 'bg-purple-950/60 text-purple-300 border-purple-500/40',
      description: 'Add money to accounts, freeze vaults & manage users'
    },
    {
      name: 'Compliance Auditor',
      email: 'auditor@ledgerline.io',
      password: 'AuditorSecret123!',
      role: 'AUDITOR',
      roleBadge: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
      description: 'Read-only access, aggregate liquidity & zero-sum checks'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid credentials or connection error.');
    }
  };

  const handlePersonaClick = async (persona) => {
    setEmail(persona.email);
    setPassword(persona.password);
    setErrorMessage('');
    try {
      await onLogin(persona.email, persona.password);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to authenticate demo user.');
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-emerald-500/20 selection:text-emerald-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-obsidian-850 border border-emerald-500/40 shadow-lg shadow-emerald-500/5 mb-2">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold font-mono tracking-tight text-white">
          BalanceVault
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          Double-Entry Accounting & High-Concurreny Financial Ledger
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 space-y-6">
        {/* Main Login Card */}
        <div className="bg-obsidian-850 border border-obsidian-750 py-8 px-6 sm:px-8 rounded-2xl shadow-xl">
          <h2 className="text-base font-bold text-white mb-1 flex items-center justify-between">
            <span>Sign In to Your Vault</span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-obsidian-800 text-slate-300 border border-obsidian-750">
              v1.0 Core
            </span>
          </h2>
          <p className="text-xs text-slate-400 mb-6 font-mono">
            Enter your credentials or choose a 1-click persona below.
          </p>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg text-xs font-mono bg-rose-950/40 text-rose-300 border border-rose-500/30 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="e.g. alice@ledgerline.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white text-xs font-mono font-bold rounded-lg shadow-sm transition flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Personas */}
          <div className="mt-8 pt-6 border-t border-obsidian-750">
            <div className="flex items-center space-x-1.5 mb-3 text-xs font-mono font-semibold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>1-Click Demo Login</span>
            </div>
            <div className="space-y-2">
              {demoPersonas.map((persona) => (
                <button
                  key={persona.email}
                  type="button"
                  onClick={() => handlePersonaClick(persona)}
                  disabled={loading}
                  className="w-full text-left p-2.5 bg-obsidian-950 hover:bg-obsidian-900 border border-obsidian-750 hover:border-obsidian-700 rounded-lg transition group flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition">
                        {persona.name}
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${persona.roleBadge}`}>
                        {persona.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                      {persona.description}
                    </div>
                  </div>
                  <UserCheck className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 flex-shrink-0 transition" />
                </button>
              ))}
            </div>
          </div>

          {/* Onboarding & Admin Bootstrap Actions */}
          <div className="mt-6 pt-4 border-t border-obsidian-800 flex items-center justify-between text-xs font-mono">
            <button
              type="button"
              onClick={onOpenOnboardModal}
              className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create New User</span>
            </button>

            <button
              type="button"
              onClick={onOpenBootstrapModal}
              className="text-purple-400 hover:text-purple-300 flex items-center space-x-1"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Bootstrap Admin</span>
            </button>
          </div>
        </div>

        {/* Security badges */}
        <div className="text-center space-y-1">
          <p className="text-[11px] text-slate-500 font-mono flex items-center justify-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>ACID Enforced • Zero-Sum Mathematical Invariant • Redis Rate Limited</span>
          </p>
        </div>
      </div>
    </div>
  );
}

