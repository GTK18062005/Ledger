import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck, ShieldAlert, Key, UserPlus, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage({ onLogin, loading, onOpenOnboardModal, onOpenBootstrapModal }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const demoPersonas = [
    {
      name: 'Alice Vance',
      email: 'alice@ledgerline.io',
      password: 'Password123!',
      role: 'ACCOUNT HOLDER',
      roleBadge: 'bg-[#eaf2e8] text-[#133e2b] border-[#cbdec7]',
      description: 'Primary customer with active depository vault'
    },
    {
      name: 'Bob Smith',
      email: 'bob@ledgerline.io',
      password: 'Password123!',
      role: 'ACCOUNT HOLDER',
      roleBadge: 'bg-[#eaf2e8] text-[#133e2b] border-[#cbdec7]',
      description: 'Counterparty customer for P2P transfers'
    },
    {
      name: 'Administrator',
      email: 'admin@ledgerline.io',
      password: 'Password123!',
      role: 'ADMIN',
      roleBadge: 'bg-[#f5f2ea] text-[#6d5b3d] border-[#dfd4c0]',
      description: 'Treasury liquidity, freeze vaults & user governance'
    },
    {
      name: 'Compliance Auditor',
      email: 'auditor@ledgerline.io',
      password: 'Password123!',
      role: 'AUDITOR',
      roleBadge: 'bg-[#f0f4ee] text-[#4d6d59] border-[#d2e2cf]',
      description: 'Read-only audit inspection & double-entry verification'
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
      setErrorMessage(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9f6] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#133e2b]/15 selection:text-[#133e2b]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Monogram */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#133e2b] text-[#eaf2e8] font-serif font-bold text-2xl mb-4 shadow-md">
          b
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#122a1f] lowercase">
          balancevault
        </h1>
        <p className="mt-1 text-xs text-[#52705e] font-medium">
          Swiss-Grade Financial Ledger & Zero-Sum Depository
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white border border-[#e5ede3] py-8 px-6 sm:px-10 rounded-3xl shadow-xl space-y-6">
          {/* Quick Persona Selectors */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#5c7c6a] mb-2.5 flex items-center justify-between">
              <span>Demo Persona Switcher</span>
              <span className="text-[9px] text-[#789685]">One-Click Login</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {demoPersonas.map((persona) => (
                <button
                  key={persona.email}
                  type="button"
                  onClick={() => handlePersonaClick(persona)}
                  className="p-3 text-left rounded-2xl bg-[#f8faf7] hover:bg-[#edf3ea] border border-[#e5ede3] hover:border-[#b8d2ba] transition group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[#122a1f] group-hover:text-[#133e2b]">
                        {persona.name}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-[#6c8a77] truncate">
                      {persona.email}
                    </div>
                  </div>
                  <span className={`inline-block mt-2 text-[9px] font-mono px-2 py-0.5 rounded-full border self-start ${persona.roleBadge}`}>
                    {persona.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#edf3ec]" />
            </div>
            <div className="relative flex justify-center text-xs font-mono">
              <span className="bg-white px-3 text-[#789685]">or sign in with credentials</span>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6c8a77] absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@ledgerline.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#122a1f] placeholder-[#819e8e] focus:outline-none focus:border-[#133e2b] font-mono transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1e3c2c] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6c8a77] absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#122a1f] placeholder-[#819e8e] focus:outline-none focus:border-[#133e2b] font-mono transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#133e2b] hover:bg-[#0e2e1f] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Account Actions */}
          <div className="pt-2 border-t border-[#edf3ec] flex items-center justify-between text-xs text-[#52705e]">
            <button
              type="button"
              onClick={onOpenOnboardModal}
              className="hover:text-[#133e2b] flex items-center space-x-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>

            <button
              type="button"
              onClick={onOpenBootstrapModal}
              className="hover:text-[#133e2b] flex items-center space-x-1 font-mono text-[11px]"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Bootstrap Admin</span>
            </button>
          </div>
        </div>

        {/* Security & System Info Footer */}
        <div className="mt-6 text-center text-xs text-[#6c8a77] flex items-center justify-center space-x-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>PostgreSQL Double-Entry Engine · Systems Operational</span>
        </div>
      </div>
    </div>
  );
}
