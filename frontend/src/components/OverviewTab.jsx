import React from 'react';
import { CreditCard, Shield, Plus, ArrowRight, Wallet, Lock, CheckCircle2 } from 'lucide-react';

export default function OverviewTab({
  user,
  accounts,
  onNavigateTab,
  onSelectAccountForStatement,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenTransfer,
}) {
  const getFirstName = () => {
    if (!user) return 'there';
    if (user.fullName) return user.fullName.split(' ')[0];
    if (user.name) return user.name.split(' ')[0];
    if (user.email === 'alice@ledgerline.io') return 'Alice';
    if (user.email === 'bob@ledgerline.io') return 'Bob';
    if (user.email === 'admin@ledgerline.io') return 'Administrator';
    if (user.email === 'auditor@ledgerline.io') return 'Auditor';
    if (user.email?.toLowerCase().includes('tharun')) return 'Tharun';
    const prefix = user.email.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  };

  const getRoleLabel = () => {
    if (!user) return '';
    if (user.role === 'ADMIN') return 'Administrator';
    if (user.role === 'AUDITOR') return 'Auditor';
    return 'Account holder';
  };

  const customerAccounts = accounts.filter(a => !a.isSystem && !a.accountNumber?.startsWith('ACC-SYSTEM'));
  const activeAccounts = customerAccounts.filter(a => a.status === 'ACTIVE');
  const activeCount = activeAccounts.length;
  const totalCountFormatted = String(customerAccounts.length).padStart(2, '0');

  const formatBalance = (val, currency = 'INR') => {
    const num = Math.max(0, parseFloat(val) || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  return (
    <div className="space-y-10 pb-16">
      {/* 1. Hero Banner */}
      <div className="bg-[#eaf2e8] border border-[#d8e7d5] rounded-3xl p-7 sm:p-9 relative overflow-hidden shadow-xs">
        <div className="relative z-10 max-w-2xl">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#40624c] flex items-center space-x-1.5 mb-2">
            <span>✱</span>
            <span>YOUR FINANCIAL OVERVIEW</span>
          </div>

          <h1 className="text-3xl sm:text-4xl text-[#122a1f] font-normal leading-tight">
            Good to see you, <span className="font-serif italic font-medium">{getFirstName()}</span>
          </h1>

          <p className="text-xs sm:text-sm text-[#4d6e58] mt-2 leading-relaxed">
            Everything in its place. Here's your account overview.
          </p>

          <div className="mt-8 flex items-center space-x-2 text-[11px] font-mono text-[#52745e]">
            <span className="w-2 h-2 rounded-xs bg-[#52745e]" />
            <span>{getRoleLabel()}</span>
            <span>·</span>
            <span>Private workspace</span>
          </div>
        </div>

        {/* Decorative concentric rings with 'b' monogram on the right */}
        <div className="hidden lg:flex absolute right-12 top-1/2 -translate-y-1/2 items-center justify-center">
          <div className="w-56 h-56 rounded-full border border-[#cadfc6]/60 flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border border-[#b8d4b3]/60 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-[#d5e6d1] flex items-center justify-center text-[#174631] font-serif font-bold text-3xl shadow-sm">
                b
              </div>
            </div>
          </div>
          <div className="absolute bottom-2 right-4 text-xs font-mono text-[#5d7d69]">
            01 / 03
          </div>
        </div>
      </div>

      {/* 2. YOUR SPACE - Account Overview Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#698875]">
              YOUR SPACE
            </div>
            <h2 className="font-serif text-2xl font-normal text-[#122a1f] mt-0.5">
              Account overview
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('accounts')}
            className="text-xs font-medium text-[#1e523a] hover:text-[#0e3020] flex items-center space-x-1 transition"
          >
            <span>All accounts</span>
            <span>→</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Total accounts card */}
          <div className="bg-white border border-[#e5ede3] rounded-2xl p-6 flex items-center justify-between shadow-xs">
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#eaf2e8] text-[#1a4a35] flex items-center justify-center mb-4">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="text-xs text-[#63806f] font-medium">Total accounts</div>
              <div className="text-3xl font-mono font-bold text-[#122a1f] tracking-tight mt-1">
                {totalCountFormatted}
              </div>
              <div className="text-[11px] text-[#789685] font-mono mt-1">
                Accounts connected
              </div>
            </div>

            {/* Circular Ring Graphic Watermark */}
            <div className="w-16 h-16 rounded-full border-2 border-[#edf4ec]" />
          </div>

          {/* Account status card */}
          <div className="bg-white border border-[#e5ede3] rounded-2xl p-6 flex flex-col justify-between shadow-xs">
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#eaf2e8] text-[#1a4a35] flex items-center justify-center mb-4">
                <Shield className="w-4 h-4" />
              </div>
              <div className="text-xs text-[#63806f] font-medium">Account status</div>
              <div className="text-2xl font-semibold text-[#122a1f] mt-1">
                {activeCount > 0 ? 'Active accounts' : 'No accounts'}
              </div>
              <div className="text-[11px] text-[#789685] font-mono mt-1">
                {activeCount} active account{activeCount === 1 ? '' : 's'}
              </div>
            </div>

            {/* Small status bar indicator on bottom right */}
            <div className="flex justify-end mt-4">
              <div className="w-14 bg-[#e5ede3] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#4a7c59] h-full rounded-full transition-all duration-500" 
                  style={{ width: customerAccounts.length > 0 ? `${Math.max(20, (activeCount / customerAccounts.length) * 100)}%` : '50%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONNECTED - Your Accounts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#698875]">
              CONNECTED
            </div>
            <h2 className="font-serif text-2xl font-normal text-[#122a1f] mt-0.5">
              Your accounts
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('accounts')}
            className="w-8 h-8 rounded-full border border-[#ccd8ca] flex items-center justify-center text-[#1a4a35] hover:bg-[#eaf2e8] transition"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {customerAccounts.length === 0 ? (
          <div className="bg-white border border-[#e5ede3] rounded-2xl p-10 text-center shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#edf4ec] text-[#40624c] flex items-center justify-center mx-auto mb-3 border border-[#dde8dc]">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#122a1f]">No accounts yet</h3>
            <p className="text-xs text-[#63806f] max-w-sm mx-auto mt-1">
              Customer accounts are opened after an administrator reviews your request.
            </p>
            <button
              onClick={() => onNavigateTab('account-request')}
              className="mt-4 px-4 py-2 bg-white border border-[#cad8c8] hover:border-[#133e2b] text-[#133e2b] text-xs font-semibold rounded-xl transition shadow-xs"
            >
              Request an account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customerAccounts.map(acc => (
              <div
                key={acc.id}
                className="bg-white border border-[#e5ede3] hover:border-[#b8d2ba] rounded-2xl p-5 flex flex-col justify-between transition-all shadow-xs group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-[#122a1f]">
                      {acc.accountNumber}
                    </span>
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                      acc.status === 'ACTIVE'
                        ? 'bg-[#eaf2e8] text-[#133e2b] border-[#cbdec7]'
                        : 'bg-[#fef2f2] text-rose-700 border-rose-200'
                    }`}>
                      {acc.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#698675] font-mono truncate">
                    {acc.ownerEmail || user?.email}
                  </div>

                  <div className="mt-4 p-3 bg-[#f8faf7] rounded-xl border border-[#eaf0e8]">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#739280]">
                      Available Balance
                    </div>
                    <div className="text-2xl font-mono font-bold text-[#122a1f] mt-0.5">
                      {formatBalance(acc.balance, acc.currency)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#edf3ec] flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      if (onSelectAccountForStatement) onSelectAccountForStatement(acc);
                      onNavigateTab('statements');
                    }}
                    className="text-[#133e2b] hover:underline font-medium"
                  >
                    View statement →
                  </button>
                  <button
                    onClick={onOpenTransfer}
                    className="text-[#597866] hover:text-[#122a1f] font-mono text-[11px]"
                  >
                    Transfer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. ON YOUR TERMS - Quick actions */}
      <div className="space-y-4">
        <div>
          <div className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#698875]">
            ON YOUR TERMS
          </div>
          <h2 className="font-serif text-2xl font-normal text-[#122a1f] mt-0.5">
            Quick actions
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Action 1: Deposit */}
          <div
            onClick={onOpenDeposit}
            className="bg-[#f8faf6] border border-[#e4ece2] hover:border-[#b8d2ba] rounded-2xl p-5 cursor-pointer transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-7 h-7 rounded-lg bg-white border border-[#d6e2d3] flex items-center justify-center text-[#2a4d38] group-hover:scale-105 transition">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#7e9988] font-medium">
                OPEN
              </span>
            </div>
            <div className="font-semibold text-sm text-[#122a1f]">Deposit</div>
            <div className="text-xs text-[#698675] mt-0.5">Add funds</div>
          </div>

          {/* Action 2: Withdraw */}
          <div
            onClick={onOpenWithdraw}
            className="bg-[#f8faf6] border border-[#e4ece2] hover:border-[#b8d2ba] rounded-2xl p-5 cursor-pointer transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-7 h-7 rounded-lg bg-white border border-[#d6e2d3] flex items-center justify-center text-[#2a4d38] group-hover:scale-105 transition">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#7e9988] font-medium">
                OPEN
              </span>
            </div>
            <div className="font-semibold text-sm text-[#122a1f]">Withdraw</div>
            <div className="text-xs text-[#698675] mt-0.5">Move funds out</div>
          </div>

          {/* Action 3: Transfer */}
          <div
            onClick={onOpenTransfer}
            className="bg-[#f8faf6] border border-[#e4ece2] hover:border-[#b8d2ba] rounded-2xl p-5 cursor-pointer transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-7 h-7 rounded-lg bg-white border border-[#d6e2d3] flex items-center justify-center text-[#2a4d38] group-hover:scale-105 transition">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#7e9988] font-medium">
                OPEN
              </span>
            </div>
            <div className="font-semibold text-sm text-[#122a1f]">Transfer</div>
            <div className="text-xs text-[#698675] mt-0.5">Between accounts</div>
          </div>
        </div>
      </div>

      {/* 5. Clean Swiss Footer */}
      <div className="pt-8 border-t border-[#e5ede3] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6a8776]">
        <div>BalanceVault — Financial clarity, by design</div>
        <div className="flex items-center space-x-1.5 text-[11px] font-mono">
          <Lock className="w-3.5 h-3.5 text-[#597866]" />
          <span>Secure session</span>
        </div>
      </div>
    </div>
  );
}

