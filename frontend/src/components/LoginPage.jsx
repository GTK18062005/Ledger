import React, { useState } from 'react';
import { 
  ShieldCheck, Lock, Mail, ArrowRight, UserCheck, ShieldAlert, Key, 
  UserPlus, CheckCircle2, AlertCircle, Sparkles, Eye, EyeOff, 
  Building2, Fingerprint, Activity, Shield, Coins, Award
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
      role: 'Account Holder',
      roleBadge: 'bg-[#eaf2e8] text-[#133e2b] border-[#cbdec7]',
      description: 'Primary customer vault with active deposits',
      initials: 'AV',
      accountNumber: 'ACC-ALICE-1001'
    },
    {
      name: 'Bob Smith',
      email: 'bob@ledgerline.io',
      password: 'Password123!',
      role: 'Account Holder',
      roleBadge: 'bg-[#eaf2e8] text-[#133e2b] border-[#cbdec7]',
      description: 'Counterparty client for real-time transfers',
      initials: 'BS',
      accountNumber: 'ACC-BOB-2002'
    },
    {
      name: 'Administrator',
      email: 'admin@ledgerline.io',
      password: 'Password123!',
      role: 'Treasury Admin',
      roleBadge: 'bg-[#fef9ee] text-[#854d0e] border-[#fde68a]',
      description: 'Treasury operations & Maker-Checker approvals',
      initials: 'SA',
      accountNumber: 'TREASURY-CH-01'
    },
    {
      name: 'Compliance Auditor',
      email: 'auditor@ledgerline.io',
      password: 'Password123!',
      role: 'Auditor',
      roleBadge: 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
      description: 'Read-only audit inspection & double-entry verification',
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
    <div className="min-h-screen bg-[#f7f9f6] flex flex-col lg:flex-row selection:bg-[#133e2b]/15 selection:text-[#133e2b]">
      {/* =========================================================================
          LEFT COLUMN: Luxury Swiss Depository Showcase (Desktop & Tablet)
          ========================================================================= */}
      <div className="lg:w-5/12 xl:w-1/2 bg-gradient-to-br from-[#06180f] via-[#0c2a1c] to-[#04130b] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden select-none border-b lg:border-b-0 lg:border-r border-[#164430]">
        {/* Ambient background rings & lighting */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#349b6f]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Brand header */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#184834] border border-[#276449] flex items-center justify-center text-[#e2ede4] font-serif font-bold text-2xl shadow-inner">
              b
            </div>
            <div>
              <div className="font-bold text-xl text-white tracking-tight lowercase">
                balancevault
              </div>
              <div className="text-[10px] font-mono tracking-widest uppercase text-[#72a188]">
                Swiss Depository & Transfer Engine
              </div>
            </div>
          </div>

          {/* Hero Typography & Value Prop */}
          <div className="mt-14 lg:mt-20 max-w-lg">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#143e2c] border border-[#235840] text-[#9ec5b2] text-[11px] font-mono mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Double-Entry ACID Invariant Enforced</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-white tracking-tight">
              Absolute financial integrity, <span className="italic text-[#a8d3bc]">guaranteed by mathematics.</span>
            </h1>

            <p className="mt-4 text-xs sm:text-sm text-[#8eb8a2] leading-relaxed font-sans">
              BalanceVault operates under strict double-entry conservation laws. Account balances are protected by deterministic row-level locks, eliminating overdrafts and non-negative violations by design.
            </p>
          </div>

          {/* Architectural Pillars / Assurances */}
          <div className="mt-10 sm:mt-12 space-y-3.5 max-w-md">
            <div className="p-3.5 rounded-2xl bg-[#0f3423]/70 border border-[#1b4e36] flex items-start space-x-3 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-[#164932] text-[#4ade80] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Strict Zero-Overdraft Guarantee</div>
                <div className="text-[11px] text-[#86ab96] mt-0.5">
                  Database check constraints and deterministic locking ensure balances never fall below zero.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0f3423]/70 border border-[#1b4e36] flex items-start space-x-3 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-[#164932] text-[#4ade80] flex items-center justify-center shrink-0 mt-0.5">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Conserved Zero-Sum Postings</div>
                <div className="text-[11px] text-[#86ab96] mt-0.5">
                  Every transaction balances debits and credits: &Sigma; Debits = &Sigma; Credits across all vaults.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0f3423]/70 border border-[#1b4e36] flex items-start space-x-3 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-[#164932] text-[#4ade80] flex items-center justify-center shrink-0 mt-0.5">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Maker-Checker Dual Control</div>
                <div className="text-[11px] text-[#86ab96] mt-0.5">
                  Treasury deposits require verified wire reference confirmation before ledger clearance.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer telemetry status */}
        <div className="relative z-10 pt-10 flex items-center justify-between text-[11px] font-mono text-[#6c9880]">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>PostgreSQL 17 Cloud Depository</span>
          </div>
          <span>ISO 20022 Ready</span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT COLUMN: Interactive Access Portal
          ========================================================================= */}
      <div className="lg:w-7/12 xl:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md space-y-7">
          {/* Header */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#5c7c6a] font-semibold">
              SECURE DEPOSITORY ACCESS
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#122a1f] mt-1">
              Sign In to Workspace
            </h2>
            <p className="text-xs sm:text-sm text-[#52705e] mt-1 font-sans">
              Access your protected financial ledger, statement records, and treasury tools.
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="p-1 bg-[#edf3ea] rounded-2xl flex items-center space-x-1 border border-[#d6e4d3]">
            <button
              type="button"
              onClick={() => { setActiveTab('credentials'); setErrorMessage(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                activeTab === 'credentials'
                  ? 'bg-white text-[#122a1f] shadow-xs'
                  : 'text-[#5b7a68] hover:text-[#122a1f]'
              }`}
            >
              Credentials Access
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('personas'); setErrorMessage(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'personas'
                  ? 'bg-white text-[#122a1f] shadow-xs'
                  : 'text-[#5b7a68] hover:text-[#122a1f]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#133e2b]" />
              <span>Demo Personas</span>
            </button>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2.5 transition">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: Credentials Form */}
          {activeTab === 'credentials' && (
            <div className="bg-white border border-[#e3ece0] rounded-3xl p-6 sm:p-8 shadow-xs">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
                    Depository Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#6c8a77] absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. alice@ledgerline.io"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#122a1f] placeholder-[#819e8e] focus:outline-none focus:border-[#133e2b] focus:bg-white font-sans transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
                    Security Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#6c8a77] absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-2xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-[#122a1f] placeholder-[#819e8e] focus:outline-none focus:border-[#133e2b] focus:bg-white font-sans transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-[#6c8a77] hover:text-[#122a1f]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#133e2b] hover:bg-[#0e2e1f] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-2xl transition shadow-sm flex items-center justify-center space-x-2"
                  >
                    <span>{loading ? 'Authenticating Credentials...' : 'Unlock Financial Vault'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: Quick Demo Personas */}
          {activeTab === 'personas' && (
            <div className="space-y-3">
              <div className="text-[11px] font-mono text-[#5c7c6a] px-1 flex items-center justify-between">
                <span>Select a calibrated test persona:</span>
                <span>Pre-funded Accounts</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {demoPersonas.map((persona) => (
                  <button
                    key={persona.email}
                    type="button"
                    onClick={() => handlePersonaClick(persona)}
                    className="p-4 text-left rounded-2xl bg-white hover:bg-[#f2f7f0] border border-[#e1ebde] hover:border-[#226645] transition-all group flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-7 h-7 rounded-full bg-[#eaf2e8] text-[#133e2b] font-bold text-xs flex items-center justify-center font-mono border border-[#cbdec7]">
                          {persona.initials}
                        </div>
                        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${persona.roleBadge}`}>
                          {persona.role}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-[#122a1f] group-hover:text-[#133e2b]">
                        {persona.name}
                      </div>
                      <div className="text-[10px] font-mono text-[#628170] truncate mt-0.5">
                        {persona.email}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#edf3ec] flex items-center justify-between text-[10px] font-mono text-[#52705e]">
                      <span className="truncate">{persona.accountNumber}</span>
                      <span className="text-[#133e2b] font-bold group-hover:translate-x-0.5 transition-transform">
                        &rarr;
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Secondary Account Actions */}
          <div className="pt-2 flex items-center justify-between text-xs text-[#52705e] px-1 font-sans">
            <button
              type="button"
              onClick={onOpenOnboardModal}
              className="hover:text-[#133e2b] font-semibold flex items-center space-x-1.5 transition"
            >
              <UserPlus className="w-4 h-4 text-[#133e2b]" />
              <span>Create Account</span>
            </button>

            <span className="text-[#cbd8c7]">•</span>

            <button
              type="button"
              onClick={onOpenBootstrapModal}
              className="hover:text-[#133e2b] font-mono text-[11px] flex items-center space-x-1.5 transition text-[#4d6d59]"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Bootstrap Root Admin</span>
            </button>
          </div>

          {/* Bottom Security Seal */}
          <div className="pt-4 border-t border-[#e5ede3] text-center">
            <div className="inline-flex items-center space-x-2 text-[10px] font-mono text-[#6c8a77]">
              <Fingerprint className="w-3.5 h-3.5 text-[#133e2b]" />
              <span>BalanceVault Cryptographic Architecture · Non-Negative Ledger Guaranteed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
