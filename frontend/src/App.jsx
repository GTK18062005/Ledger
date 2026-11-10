import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DemoUserSwitcher from './components/DemoUserSwitcher';
import AccountDashboard from './components/AccountDashboard';
import TransferForm from './components/TransferForm';
import StatementViewer from './components/StatementViewer';
import AdminAuditorPanel from './components/AdminAuditorPanel';
import OnboardingModal from './components/OnboardingModal';
import BootstrapAdminModal from './components/BootstrapAdminModal';
import { api, getStoredUser, clearAuth } from './api';
import { Wallet, ArrowRightLeft, FileText, ShieldAlert, Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [statement, setStatement] = useState([]);
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts', 'transfer', 'statement', 'audit'

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statementLoading, setStatementLoading] = useState(false);

  // Modals
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showBootstrapModal, setShowBootstrapModal] = useState(false);

  // Initialize session: try stored user or auto-login as Alice (Account Holder)
  useEffect(() => {
    const init = async () => {
      try {
        const stored = getStoredUser();
        if (stored) {
          setUser(stored);
          await loadAccounts();
        } else {
          // Default demo session: Alice
          await handleLogin('alice@ledgerline.io', 'Password123!');
        }
      } catch (e) {
        console.error("Initialization error:", e);
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, []);

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.login(email, password);
      const newUser = {
        userId: res.userId,
        email: res.email,
        role: res.role,
        primaryAccountId: res.primaryAccountId,
        primaryAccountNumber: res.primaryAccountNumber
      };
      setUser(newUser);
      await loadAccounts();
    } catch (err) {
      alert("Login failed: " + (err.message || "Invalid credentials"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setAccounts([]);
    setSelectedAccount(null);
    setStatement([]);
    handleLogin('alice@ledgerline.io', 'Password123!');
  };

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.getAccounts();
      setAccounts(data);
      if (data.length > 0) {
        setSelectedAccount(data[0]);
      } else {
        setSelectedAccount(null);
      }
    } catch (e) {
      console.error("Failed to load accounts:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadStatement = async (accountId) => {
    setStatementLoading(true);
    try {
      const data = await api.getStatement(accountId);
      setStatement(data);
    } catch (e) {
      console.error("Failed to load statement:", e);
      setStatement([]);
    } finally {
      setStatementLoading(false);
    }
  };

  const handleSelectAccountForStatement = (acc) => {
    setSelectedAccount(acc);
    setActiveTab('statement');
    loadStatement(acc.id);
  };

  const handleSelectAccountForTransfer = (acc) => {
    setSelectedAccount(acc);
    setActiveTab('transfer');
  };

  const handleCreateAccount = async (payload) => {
    await api.createAccount(payload);
    await loadAccounts();
  };

  const handleExecuteTransfer = async (payload, idempotencyKey) => {
    return await api.transfer(payload, idempotencyKey);
  };

  const handleExecuteDeposit = async (payload, idempotencyKey) => {
    return await api.deposit(payload, idempotencyKey);
  };

  const handleExecuteWithdraw = async (payload, idempotencyKey) => {
    return await api.withdraw(payload, idempotencyKey);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-obsidian-950">
        <div className="text-center space-y-3 font-mono">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Verifying Zero-Sum Invariant & Connecting to Vault...</p>
        </div>
      </div>
    );
  }

  const isAdminOrAuditor = user && (user.role === 'ADMIN' || user.role === 'AUDITOR');

  return (
    <div className="min-h-screen bg-obsidian-950 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenOnboardModal={() => setShowOnboardModal(true)}
        onOpenBootstrapModal={() => setShowBootstrapModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Interactive Multi-Tenant Persona Switcher */}
        <DemoUserSwitcher
          currentUser={user}
          onSelectUser={handleLogin}
          loading={loading}
        />

        {/* Primary View Navigation */}
        <div className="border-b border-obsidian-750 flex space-x-6">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`pb-3 text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'accounts'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Vault Accounts ({accounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transfer')}
            className={`pb-3 text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'transfer'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Financial Mutations</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('statement');
              if (selectedAccount) loadStatement(selectedAccount.id);
            }}
            className={`pb-3 text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'statement'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Ledger Statements</span>
          </button>

          {isAdminOrAuditor && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-3 text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition ${
                activeTab === 'audit'
                  ? 'border-purple-400 text-purple-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Compliance & Audit Invariant</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'accounts' && (
          <AccountDashboard
            accounts={accounts}
            user={user}
            onSelectAccountForStatement={handleSelectAccountForStatement}
            onSelectAccountForTransfer={handleSelectAccountForTransfer}
            onCreateAccount={handleCreateAccount}
            onRefresh={loadAccounts}
            loading={loading}
          />
        )}

        {activeTab === 'transfer' && (
          <TransferForm
            accounts={accounts}
            user={user}
            onExecuteTransfer={handleExecuteTransfer}
            onExecuteDeposit={handleExecuteDeposit}
            onExecuteWithdraw={handleExecuteWithdraw}
            onRefreshAccounts={loadAccounts}
          />
        )}

        {activeTab === 'statement' && (
          <StatementViewer
            selectedAccount={selectedAccount}
            accounts={accounts}
            onSelectAccount={(acc) => {
              setSelectedAccount(acc);
              loadStatement(acc.id);
            }}
            onLoadStatement={loadStatement}
            statement={statement}
            loading={statementLoading}
          />
        )}

        {activeTab === 'audit' && isAdminOrAuditor && (
          <AdminAuditorPanel
            user={user}
            accounts={accounts}
            onRefreshAccounts={loadAccounts}
          />
        )}
      </main>

      {/* Onboarding Dialog */}
      <OnboardingModal
        isOpen={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
        onSuccess={async (newUser) => {
          setShowOnboardModal(false);
          await loadAccounts();
        }}
      />

      {/* First Admin Bootstrap Dialog */}
      <BootstrapAdminModal
        isOpen={showBootstrapModal}
        onClose={() => setShowBootstrapModal(false)}
        onSuccess={async (adminUser) => {
          setShowBootstrapModal(false);
          await handleLogin(adminUser.email, 'AdminSecret123!');
        }}
      />

      <footer className="border-t border-obsidian-800 py-6 text-center text-xs text-slate-500 font-mono">
        BalanceVault Core • PostgreSQL Double-Entry Engine • Redis Sliding-Window Rate Limiting • Zero-Sum Invariant Enforced
      </footer>
    </div>
  );
}
