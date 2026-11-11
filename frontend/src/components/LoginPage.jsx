import React, { useState } from 'react';
import {
  ShieldCheck, Lock, Mail, ArrowRight, Key,
  UserPlus, AlertCircle, Sparkles, Eye, EyeOff,
  Fingerprint, Coins, Award, Cpu
} from 'lucide-react';

export default function LoginPage({ onLogin, loading, onOpenOnboardModal, onOpenBootstrapModal }) {
  const [activeTab, setActiveTab] = useState('credentials'); // 'credentials' | 'personas'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const demoPersonas = [
    {
      name: 'Alice Vance',
      email: 'alice@ledgerline.io',
      password: 'Password123!',
      role: 'Customer',
      roleBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Primary customer vault with active deposits',
      initials: 'AV',
      accountNumber: 'ACC-ALICE-1001'
    },
    {
      name: 'Bob Smith',
      email: 'bob@ledgerline.io',
      password: 'Password123!',
      role: 'Customer',
      roleBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Counterparty client for real-time transfers',
      initials: 'BS',
      accountNumber: 'ACC-BOB-2002'
    },
    {
      name: 'System Admin',
      email: 'admin@ledgerline.io',
      password: 'Password123!',
      role: 'SYS_ADMIN',
      roleBadge: 'bg-amber-50 text-amber-800 border-amber-200',
      description: 'Treasury operations & Maker-Checker approvals',
      initials: 'SA',
      accountNumber: 'TREASURY-CH-01'
    },
    {
      name: 'Compliance Auditor',
      email: 'auditor@ledgerline.io',
      password: 'Password123!',
      role: 'AUDITOR',
      roleBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Continuous assurance & double-entry inspection',
      initials: 'CA',
      accountNumber: 'AUDIT-SEC-09'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email.trim() || !password) {
      setErrorMessage('Please provide both your registered email and password.');
      return;
    }
    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid credentials or depository connection error.');
    }
  };

  const handlePersonaClick = async (persona) => {
    setEmail(persona.email);
    setPassword(persona.password);
    setErrorMessage('');
    try {
      await onLogin(persona.email, persona.password);
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* LEFT COLUMN: Midnight Slate Institutional Brand Showcase */}
      <div className="lg:w-5/12 xl:w-1/2 bg-[#0f172a] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden select-none border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Ambient indigo & emerald radial glow */}
        <div className="absolute -top-28 -left-28 w-96 h-96 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -right-28 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Brand header */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-500/25">
              L
            </div>
            <div>
              <div className="font-extrabold text-lg text-white tracking-tight">
                LedgerLine <span className="text-indigo-400 font-mono text-xs ml-1">CORE</span>
              </div>
              <div className="text-[10px] font-mono tracking-widest uppercase text-slate-400">
                Institutional Double-Entry Clearinghouse
              </div>
            </div>
          </div>

          {/* Hero Typography & Value Prop */}
          <div className="mt-14 lg:mt-20 max-w-lg">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-300 text-[11px] font-mono mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Double-Entry ACID Invariant · Σ(DR)=Σ(CR)</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.12] text-white tracking-tight">
              Financial integrity, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">verified in real time.</span>
            </h1>

            <p className="mt-4 text-xs sm:text-sm text-slate-400 leading-relaxed">
              LedgerLine operates under deterministic row-level locking, Maker-Checker dual authorization, and strict zero-overdraft mathematical guards.
            </p>
          </div>

          {/* Architectural Pillars */}
          <div className="mt-10 sm:mt-12 space-y-3 max-w-md">
            <div className="p-3.5 rounded-xl bg-slate-800/45 border border-slate-700/70 flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/25">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Strict Zero-Overdraft Guarantee</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Database CHECK constraints and pessimistic locks enforce non-negative customer balances.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/45 border border-slate-700/70 flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-500/25">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Conserved Zero-Sum Postings</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Every deposit, transfer, and withdrawal balances debits and credits across sovereign vaults.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/45 border border-slate-700/70 flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/25">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Maker-Checker Dual Control</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  New account requests and inward deposits require independent administrator approval.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer telemetry status */}
        <div className="relative z-10 pt-10 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>PostgreSQL Cloud Depository · AES-256</span>
          </div>
          <span className="flex items-center space-x-1.5 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>ISO 20022 Ready</span>
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Access Portal */}
      <div className="lg:w-7/12 xl:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 font-bold">
              SECURE WORKSPACE AUTHENTICATION
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              Sign In to LedgerLine
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Access customer vaults, administrative controls, or autonomous audit assurance.
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="p-1 bg-slate-200/70 rounded-xl flex items-center space-x-1 border border-slate-200">
            <button
              type="button"
              onClick={() => { setActiveTab('credentials'); setErrorMessage(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                activeTab === 'credentials'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Credentials Sign-In
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('personas'); setErrorMessage(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'personas'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Instant Personas</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {activeTab === 'credentials' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-xs">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Principal Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. alice@ledgerline.io"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Security Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#0f172a] hover:bg-slate-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm flex items-center justify-center space-x-2"
                  >
                    <span>{loading ? 'Authenticating Credentials...' : 'Unlock Sovereign Workspace'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'personas' && (
            <div className="space-y-3">
              <div className="text-[11px] font-mono text-slate-500 px-1 flex items-center justify-between">
                <span>1-Click Pre-seeded Role Demo:</span>
                <span className="text-indigo-600 font-semibold">Instant JWT Auth</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {demoPersonas.map((persona) => (
                  <button
                    key={persona.email}
                    type="button"
                    onClick={() => handlePersonaClick(persona)}
                    className="p-4 text-left rounded-xl bg-white hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-300 transition-all group flex flex-col justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-7 h-7 rounded-lg bg-[#0f172a] text-white font-bold text-xs flex items-center justify-center font-mono">
                          {persona.initials}
                        </div>
                        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${persona.roleBadge}`}>
                          {persona.role}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">
                        {persona.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                        {persona.email}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span className="truncate">{persona.accountNumber}</span>
                      <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
                        &rarr;
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Secondary Account Actions */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 px-1">
            <button
              type="button"
              onClick={onOpenOnboardModal}
              className="hover:text-indigo-700 font-semibold flex items-center space-x-1.5 transition"
            >
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <span>Create Account</span>
            </button>

            <span className="text-slate-300">•</span>

            <button
              type="button"
              onClick={onOpenBootstrapModal}
              className="hover:text-indigo-700 font-mono text-[11px] flex items-center space-x-1.5 transition"
            >
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>Bootstrap Root Admin</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200/80 text-center">
            <div className="inline-flex items-center space-x-2 text-[10px] font-mono text-slate-500">
              <Fingerprint className="w-3.5 h-3.5 text-indigo-600" />
              <span>LedgerLine Cryptographic Core · Zero-Overdraft Enforced</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
