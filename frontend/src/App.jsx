import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewTab from './components/OverviewTab';
import AccountDashboard from './components/AccountDashboard';
import StatementViewer from './components/StatementViewer';
import AccountRequestTab from './components/AccountRequestTab';
import AdminAuditorPanel from './components/AdminAuditorPanel';
import OperationsDeskTab from './components/OperationsDeskTab';
import AuditorOversightTab from './components/AuditorOversightTab';
import PlatformTransactionsTab from './components/PlatformTransactionsTab';
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
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [statement, setStatement] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [statementAccountView, setStatementAccountView] = useState(false);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statementLoading, setStatementLoading] = useState(false);
  const [pendingAccountRequestsCount, setPendingAccountRequestsCount] = useState(0);
  const [pendingDepositRequestsCount, setPendingDepositRequestsCount] = useState(0);
  const [securityAlertsCount, setSecurityAlertsCount] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Modal Dialog states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showBootstrapModal, setShowBootstrapModal] = useState(false);

  const getDefaultTabForRole = (role) => {
    if (role === 'ADMIN') return 'admin-audit';
    if (role === 'AUDITOR') return 'auditor-overview';
    return 'overview';
  };

  // Initialize session: check stored user token; if not present, show LoginPage
  useEffect(() => {
    const init = async () => {
      try {
        const stored = getStoredUser();
        if (stored) {
          setUser(stored);
          setActiveTab(getDefaultTabForRole(stored.role));
          await loadAccounts(stored);
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
        fullName: res.fullName,
        role: res.role,
        primaryAccountId: res.primaryAccountId,
        primaryAccountNumber: res.primaryAccountNumber
      };
      setUser(newUser);
      setActiveTab(getDefaultTabForRole(newUser.role));
      setStatementAccountView(false);
      await loadAccounts(newUser);
      return res;
    } catch (err) {
      throw err;
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
    setTransactions([]);
    setAuditLogs([]);
    setPendingAccountRequestsCount(0);
    setPendingDepositRequestsCount(0);
    setSecurityAlertsCount(0);
    setStatementAccountView(false);
    setActiveTab('overview');
  };

  const loadPendingCounts = async (activeUser) => {
    const u = activeUser || getStoredUser();
    if (!u) return;
    try {
      const accReqs = await api.getAccountRequests('PENDING').catch(() => []);
      setPendingAccountRequestsCount(Array.isArray(accReqs) ? accReqs.length : 0);

      if (u.role === 'ADMIN' || u.role === 'AUDITOR') {
        const [depReqs, txList, logs] = await Promise.all([
          api.getDepositRequests('PENDING').catch(() => []),
          api.getTransactions().catch(() => []),
          api.getAuditLogs().catch(() => [])
        ]);
        setPendingDepositRequestsCount(Array.isArray(depReqs) ? depReqs.length : 0);
        setTransactions(Array.isArray(txList) ? txList : []);
        const validLogs = Array.isArray(logs) ? logs : [];
        setAuditLogs(validLogs);
        setSecurityAlertsCount(
          validLogs.filter((l) => l.status === 'REFUSED' || l.status === 'SECURITY').length
        );
      } else {
        const depReqs = await api.getDepositRequests().catch(() => []);
        const pendingDeps = Array.isArray(depReqs)
          ? depReqs.filter((d) => d.status === 'PENDING').length
          : 0;
        setPendingDepositRequestsCount(pendingDeps);
        setSecurityAlertsCount(0);
        setAuditLogs([]);
      }
    } catch (e) {
      // ignore background badge refresh failure
    }
  };

  const loadAccounts = async (activeUser) => {
    setLoading(true);
    try {
      const data = await api.getAccounts();
      setAccounts(data || []);
      if (data && data.length > 0) {
        setSelectedAccount((prev) => (prev && data.some((a) => a.id === prev.id) ? data.find((a) => a.id === prev.id) : data[0]));
      } else {
        setSelectedAccount(null);
      }
      await loadPendingCounts(activeUser);
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
      setStatement(data || []);
    } catch (e) {
      console.error("Failed to load statement:", e);
      setStatement([]);
    } finally {
      setStatementLoading(false);
    }
  };

  const handleSelectAccountForStatement = (acc) => {
    setSelectedAccount(acc);
    setStatementAccountView(true);
    setActiveTab('statements');
    loadStatement(acc.id);
  };

  const handleSelectTab = (tabId) => {
    if (tabId === 'statements') {
      setStatementAccountView(false);
    }
    setActiveTab(tabId);
  };

  const handleCreateAccount = async (payload) => {
    await api.createAccount(payload);
    await loadAccounts(user);
  };

  const handleOnboardSuccess = async (res) => {
    setShowOnboardModal(false);
    const registered = res?.userId ? {
      userId: res.userId,
      email: res.email,
      fullName: res.fullName || 'Account holder',
      role: res.role || 'ACCOUNT_HOLDER',
      primaryAccountId: res.primaryAccountId,
      primaryAccountNumber: res.primaryAccountNumber
    } : getStoredUser();
    if (registered) {
      setUser(registered);
      await loadAccounts(registered);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9f6]">
        <div className="text-center space-y-3 font-mono">
          <Loader2 className="w-8 h-8 text-[#133e2b] animate-spin mx-auto" />
          <p className="text-xs text-[#52705e]">Connecting to BalanceVault Swiss Depository...</p>
        </div>
      </div>
    );
  }

  // IF USER IS NOT LOGGED IN: SHOW SWISS LOGIN PAGE
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
          onSuccess={handleOnboardSuccess}
        />

        <BootstrapAdminModal
          isOpen={showBootstrapModal}
          onClose={() => setShowBootstrapModal(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9f6] flex flex-row font-sans selection:bg-[#133e2b]/15 selection:text-[#133e2b]">
      {/* 1. Left Swiss Forest Sidebar (Fixed) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        user={user}
        onLogout={handleLogout}
        pendingAccountRequestsCount={pendingAccountRequestsCount}
        pendingDepositRequestsCount={pendingDepositRequestsCount}
        securityAlertsCount={securityAlertsCount}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Header */}
        <Header
          user={user}
          activeTab={activeTab}
          onLogout={handleLogout}
          onSelectUser={handleLogin}
          onNavigateTab={handleSelectTab}
          accounts={accounts}
          transactions={user?.role === 'ACCOUNT_HOLDER' ? statement : transactions}
          auditLogs={auditLogs}
          pendingAccountRequestsCount={pendingAccountRequestsCount}
          pendingDepositRequestsCount={pendingDepositRequestsCount}
          securityAlertsCount={securityAlertsCount}
          onSelectSearchAccount={(acc) => setSelectedAccount(acc)}
        />

        {/* View Content Area */}
        <main className="flex-1 px-6 sm:px-10 lg:px-12 py-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full">
            {activeTab === 'overview' && (
              <OverviewTab
                user={user}
                accounts={accounts}
                onNavigateTab={handleSelectTab}
                onSelectAccountForStatement={handleSelectAccountForStatement}
                onOpenDeposit={() => setShowDepositModal(true)}
                onOpenWithdraw={() => setShowWithdrawModal(true)}
                onOpenTransfer={() => setShowTransferModal(true)}
              />
            )}

            {activeTab === 'accounts' && (
              <AccountDashboard
                accounts={accounts}
                user={user}
                onSelectAccountForStatement={handleSelectAccountForStatement}
                onSelectAccountForTransfer={() => setShowTransferModal(true)}
                onCreateAccount={handleCreateAccount}
                onNavigateTab={handleSelectTab}
                onRefresh={() => loadAccounts(user)}
                loading={loading}
              />
            )}

            {activeTab === 'operations' && (
              <OperationsDeskTab
                user={user}
                accounts={accounts}
                onRefresh={() => loadAccounts(user)}
              />
            )}

            {activeTab === 'statements' && (
              (user?.role === 'ADMIN' || user?.role === 'AUDITOR') && !statementAccountView ? (
                <PlatformTransactionsTab
                  user={user}
                  mode="statements"
                  onRefresh={() => loadAccounts(user)}
                />
              ) : (
                <div className="space-y-4">
                  {(user?.role === 'ADMIN' || user?.role === 'AUDITOR') && (
                    <button
                      type="button"
                      onClick={() => setStatementAccountView(false)}
                      className="text-xs font-mono text-[#133e2b] hover:underline"
                    >
                      ← Back to Platform Transactions Journal
                    </button>
                  )}
                  <StatementViewer
                    selectedAccount={selectedAccount}
                    accounts={accounts}
                    onSelectAccount={setSelectedAccount}
                    onLoadStatement={loadStatement}
                    statement={statement}
                    loading={statementLoading}
                  />
                </div>
              )
            )}

            {activeTab === 'account-request' && (
              <AccountRequestTab
                user={user}
                accounts={accounts}
                onRefreshAccounts={() => loadAccounts(user)}
              />
            )}

            {(activeTab === 'admin-audit' ||
              activeTab === 'admin-users' ||
              activeTab === 'admin-accounts' ||
              activeTab === 'audit-logs') && (
              <AdminAuditorPanel
                user={user}
                accounts={accounts}
                section={activeTab}
                onRefreshAccounts={() => loadAccounts(user)}
              />
            )}

            {(activeTab === 'admin-transactions' || activeTab === 'admin-reversals') && (
              <PlatformTransactionsTab
                user={user}
                mode={activeTab}
                onRefresh={() => loadAccounts(user)}
              />
            )}

            {(activeTab === 'auditor-overview' || activeTab === 'integrity-reports') && (
              <AuditorOversightTab
                user={user}
                mode={activeTab}
                onNavigateTab={handleSelectTab}
                onRefresh={() => loadAccounts(user)}
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

      {/* Modals for Quick Actions */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        accounts={accounts}
        user={user}
        onRefresh={() => loadAccounts(user)}
      />

      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        accounts={accounts}
        user={user}
        onRefresh={() => loadAccounts(user)}
      />

      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        accounts={accounts}
        user={user}
        onRefresh={() => loadAccounts(user)}
      />

      <OnboardingModal
        isOpen={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
        onSuccess={handleOnboardSuccess}
      />

      <BootstrapAdminModal
        isOpen={showBootstrapModal}
        onClose={() => setShowBootstrapModal(false)}
      />
    </div>
  );
}
