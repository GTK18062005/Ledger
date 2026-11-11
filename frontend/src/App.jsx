import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewTab from './components/OverviewTab';
import AccountDashboard from './components/AccountDashboard';
import StatementViewer from './components/StatementViewer';
import AccountRequestTab from './components/AccountRequestTab';
import { AdminAuditorPanel } from './components/AdminAuditorPanel';
import AuditorOversightView from './components/AuditorOversightView';
import ProfileTab from './components/ProfileTab';
import SecurityTab from './components/SecurityTab';
import SettingsTab from './components/SettingsTab';
import DepositModal from './components/DepositModal';
import WithdrawModal from './components/WithdrawModal';
import TransferModal from './components/TransferModal';
import OnboardingModal from './components/OnboardingModal';
import BootstrapAdminModal from './components/BootstrapAdminModal';
import LoginPage from './components/LoginPage';
import { api, getStoredUser, clearAuth } from './api';
import {
  Loader2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  Clock, ShieldCheck, CheckCircle2, AlertTriangle
} from 'lucide-react';

const ADMIN_PANEL_TABS = new Set([
  'admin-audit',
  'admin-users',
  'admin-accounts',
  'admin-deposits',
  'admin-reversals',
  'audit-logs',
  'integrity-reports'
]);

export default function App() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [statement, setStatement] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const [pendingAccountRequestsCount, setPendingAccountRequestsCount] = useState(0);
  const [pendingDepositRequestsCount, setPendingDepositRequestsCount] = useState(0);
  const [userDepositRequests, setUserDepositRequests] = useState([]);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statementLoading, setStatementLoading] = useState(false);

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showBootstrapModal, setShowBootstrapModal] = useState(false);

  const loadPendingCounts = useCallback(async (activeUser) => {
    const u = activeUser || getStoredUser();
    if (!u) return;
    try {
      const [accReqs, depReqs] = await Promise.allSettled([
        api.getAccountRequests(),
        api.getDepositRequests()
      ]);

      if (accReqs.status === 'fulfilled' && Array.isArray(accReqs.value)) {
        setPendingAccountRequestsCount(accReqs.value.filter(r => r.status === 'PENDING').length);
      }
      if (depReqs.status === 'fulfilled' && Array.isArray(depReqs.value)) {
        setUserDepositRequests(depReqs.value);
        setPendingDepositRequestsCount(depReqs.value.filter(r => r.status === 'PENDING').length);
      }
    } catch {
      // Non-fatal background badge update
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAccounts();
      const list = data || [];
      setAccounts(list);
      if (list.length > 0) {
        setSelectedAccount((prev) => (prev && list.some(a => a.id === prev.id) ? prev : list[0]));
      } else {
        setSelectedAccount(null);
      }
    } catch (e) {
      console.error('Failed to load accounts:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshWorkspace = useCallback(async (activeUser) => {
    await Promise.all([loadAccounts(), loadPendingCounts(activeUser)]);
  }, [loadAccounts, loadPendingCounts]);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = getStoredUser();
        if (stored) {
          setUser(stored);
          setActiveTab(stored.role === 'AUDITOR' ? 'auditor-overview' : 'overview');
          await refreshWorkspace(stored);
        }
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, [refreshWorkspace]);

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.login(email, password);
      const newUser = {
        userId: res.userId,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
        primaryAccountId: res.primaryAccountId,
        primaryAccountNumber: res.primaryAccountNumber
      };
      setUser(newUser);
      setActiveTab(newUser.role === 'AUDITOR' ? 'auditor-overview' : 'overview');
      await refreshWorkspace(newUser);
      return res;
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
    setPendingAccountRequestsCount(0);
    setPendingDepositRequestsCount(0);
    setUserDepositRequests([]);
    setActiveTab('overview');
  };

  const loadStatement = async (accountId) => {
    setStatementLoading(true);
    try {
      const data = await api.getStatement(accountId);
      setStatement(data || []);
    } catch (e) {
      console.error('Failed to load statement:', e);
      setStatement([]);
    } finally {
      setStatementLoading(false);
    }
  };

  const handleSelectAccountForStatement = (acc) => {
    setSelectedAccount(acc);
    setActiveTab('statements');
    loadStatement(acc.id);
  };

  const handleCreateAccount = async (payload) => {
    await api.createAccount(payload);
    await refreshWorkspace();
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center space-y-3 font-mono">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Connecting to LedgerLine Core Infrastructure...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage
          onLogin={handleLogin}
          loading={loading}
          onOpenOnboardModal={() => setShowOnboardModal(true)}
          onOpenBootstrapModal={() => setShowBootstrapModal(true)}
        />

        <OnboardingModal
          isOpen={showOnboardModal}
          onClose={() => setShowOnboardModal(false)}
          onSuccess={async (newUser) => {
            setShowOnboardModal(false);
            if (newUser && newUser.token) {
              const registered = {
                userId: newUser.userId,
                email: newUser.email,
                fullName: newUser.fullName,
                role: newUser.role,
                primaryAccountId: newUser.primaryAccountId,
                primaryAccountNumber: newUser.primaryAccountNumber
              };
              setUser(registered);
              setActiveTab('overview');
              await refreshWorkspace(registered);
            }
          }}
        />

        <BootstrapAdminModal
          isOpen={showBootstrapModal}
          onClose={() => setShowBootstrapModal(false)}
        />
      </>
    );
  }

  const customerAccounts = (accounts || []).filter(
    (a) => !a.isSystem && !a.accountNumber?.startsWith('ACC-SYSTEM')
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-row font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* Left Midnight Slate Institutional Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        pendingAccountRequestsCount={pendingAccountRequestsCount}
        pendingDepositRequestsCount={pendingDepositRequestsCount}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <Header
          user={user}
          accounts={accounts}
          onLogout={handleLogout}
          onNavigateTab={setActiveTab}
          onSelectAccountForStatement={handleSelectAccountForStatement}
          pendingAccountRequestsCount={pendingAccountRequestsCount}
          pendingDepositRequestsCount={pendingDepositRequestsCount}
        />

        <main className="flex-1 px-6 sm:px-10 lg:px-10 py-7 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            {activeTab === 'overview' && (
              <OverviewTab
                user={user}
                accounts={accounts}
                onNavigateTab={setActiveTab}
                onSelectAccountForStatement={handleSelectAccountForStatement}
                onOpenDeposit={() => setShowDepositModal(true)}
                onOpenWithdraw={() => setShowWithdrawModal(true)}
                onOpenTransfer={() => setShowTransferModal(true)}
                pendingAccountRequestsCount={pendingAccountRequestsCount}
                pendingDepositRequestsCount={pendingDepositRequestsCount}
              />
            )}

            {activeTab === 'auditor-overview' && (
              <AuditorOversightView
                accounts={accounts}
                onNavigateTab={setActiveTab}
                onFilterAuditAlerts={() => setActiveTab('audit-logs')}
              />
            )}

            {activeTab === 'accounts' && (
              <AccountDashboard
                accounts={accounts}
                user={user}
                onSelectAccountForStatement={handleSelectAccountForStatement}
                onSelectAccountForTransfer={() => setShowTransferModal(true)}
                onCreateAccount={handleCreateAccount}
                onNavigateTab={setActiveTab}
                onRefresh={() => refreshWorkspace()}
                loading={loading}
              />
            )}

            {activeTab === 'statements' && (
              <StatementViewer
                selectedAccount={selectedAccount}
                accounts={accounts}
                onSelectAccount={setSelectedAccount}
                onLoadStatement={loadStatement}
                statement={statement}
                loading={statementLoading}
              />
            )}

            {activeTab === 'account-request' && (
              <AccountRequestTab
                user={user}
                accounts={accounts}
                onRefreshAccounts={() => refreshWorkspace()}
              />
            )}

            {activeTab === 'operations' && (
              <div className="space-y-6 pb-16">
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600">
                    OPERATIONS & LIQUIDITY
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
                    Deposit & Withdraw Desk
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Initiate Maker-Checker inward deposits or instant double-entry settlements with strict zero-overdraft guards.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-4">
                        <ArrowDownLeft className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {user.role === 'ADMIN' ? 'Treasury Credit / Deposit' : 'Request Inward Deposit'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {user.role === 'ADMIN'
                          ? 'Credit customer accounts directly via SYSTEM_FUNDING or review pending customer remittance tickets.'
                          : 'Submit a wire UTR and deposit request for administrator verification under Maker-Checker dual control.'}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDepositModal(true)}
                      className="mt-5 w-full py-2.5 px-4 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>{user.role === 'ADMIN' ? 'Open Treasury Deposit Form' : 'Submit Deposit Request'}</span>
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center mb-4">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">External Settlement Withdrawal</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Withdraw settled liquidity from any active vault to SYSTEM_SETTLEMENT. Enforces strict non-negative balance invariants.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowWithdrawModal(true)}
                      className="mt-5 w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2"
                    >
                      <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                      <span>Initiate Withdrawal</span>
                    </button>
                  </div>
                </div>

                {/* Recent Deposit Requests Table */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">Deposit Approval Status Tracker</h3>
                    </div>
                    {user.role === 'ADMIN' && (
                      <button
                        onClick={() => setActiveTab('admin-deposits')}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Go to Admin Approval Queue &rarr;
                      </button>
                    )}
                  </div>

                  {userDepositRequests.length === 0 ? (
                    <div className="py-6 text-center text-xs font-mono text-slate-400">
                      No deposit requests recorded yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-mono text-[10px] uppercase">
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Target Vault</th>
                            <th className="py-2 px-3">Amount</th>
                            <th className="py-2 px-3">Reference / Memo</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {userDepositRequests.slice(0, 8).map((r) => (
                            <tr key={r.id}>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                {r.accountNumber || r.accountId?.substring(0, 10)}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                ₹{Number(r.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{r.referenceMemo || '—'}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                                  r.status === 'APPROVED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : r.status === 'REJECTED'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'transfers' && (
              <div className="space-y-6 pb-16">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600">
                      PEER-TO-PEER CLEARING
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
                      Atomic Peer Transfers
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      Idempotent double-entry transfers with deterministic row-level locking and non-negative balance protection.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="px-5 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-2xs inline-flex items-center space-x-2 self-start"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>New Peer Transfer</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customerAccounts.map((acc) => (
                    <div key={acc.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-slate-900">{acc.accountNumber}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {acc.status}
                          </span>
                        </div>
                        <div className="text-2xl font-mono font-extrabold text-slate-900 mt-3">
                          ₹{Math.max(0, parseFloat(acc.balance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-1">{acc.currency} Available Vault</div>
                      </div>
                      <button
                        onClick={() => setShowTransferModal(true)}
                        className="mt-4 w-full py-2 bg-slate-50 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs font-semibold transition"
                      >
                        Transfer from {acc.accountNumber} &rarr;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ADMIN_PANEL_TABS.has(activeTab) && (
              <AdminAuditorPanel
                user={user}
                accounts={accounts}
                initialSection={activeTab}
                onRefreshAccounts={loadAccounts}
                onRequestsUpdated={() => refreshWorkspace()}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileTab
                user={user}
                onUserUpdated={(updatedUser) => {
                  setUser((prev) => ({
                    ...prev,
                    fullName: updatedUser.fullName
                  }));
                }}
              />
            )}

            {activeTab === 'security' && (
              <SecurityTab user={user} />
            )}

            {activeTab === 'settings' && (
              <SettingsTab user={user} />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        accounts={accounts}
        user={user}
        onRefresh={() => refreshWorkspace()}
      />

      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        accounts={accounts}
        user={user}
        onRefresh={() => refreshWorkspace()}
      />

      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        accounts={accounts}
        user={user}
        onRefresh={() => refreshWorkspace()}
      />

      <OnboardingModal
        isOpen={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
        onSuccess={() => setShowOnboardModal(false)}
      />

      <BootstrapAdminModal
        isOpen={showBootstrapModal}
        onClose={() => setShowBootstrapModal(false)}
      />
    </div>
  );
}
