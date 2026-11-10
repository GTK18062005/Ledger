import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewTab from './components/OverviewTab';
import AccountDashboard from './components/AccountDashboard';
import StatementViewer from './components/StatementViewer';
import AccountRequestTab from './components/AccountRequestTab';
import AdminAuditorPanel from './components/AdminAuditorPanel';
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
  const [activeTab, setActiveTab] = useState('overview'); // Default to Overview (Image 1 / 3)

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statementLoading, setStatementLoading] = useState(false);

  // Modal Dialog states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showBootstrapModal, setShowBootstrapModal] = useState(false);

  // Initialize session: check stored user token; if not present, show LoginPage
  useEffect(() => {
    const init = async () => {
      try {
        const stored = getStoredUser();
        if (stored) {
          setUser(stored);
          await loadAccounts();
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
    setActiveTab('overview');
  };

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.getAccounts();
      setAccounts(data || []);
      if (data && data.length > 0) {
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
    setActiveTab('statements');
    loadStatement(acc.id);
  };

  const handleCreateAccount = async (payload) => {
    await api.createAccount(payload);
    await loadAccounts();
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
          onSuccess={async (newUser) => {
            setShowOnboardModal(false);
            if (newUser && newUser.email) {
              await handleLogin(newUser.email, 'Password123!');
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

  return (
    <div className="min-h-screen bg-[#f7f9f6] flex flex-row font-sans selection:bg-[#133e2b]/15 selection:text-[#133e2b]">
      {/* 1. Left Swiss Forest Sidebar (Fixed) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Header */}
        <Header
          user={user}
          activeTab={activeTab}
          onLogout={handleLogout}
          onSelectUser={handleLogin}
        />

        {/* View Content Area */}
        <main className="flex-1 px-6 sm:px-10 lg:px-12 py-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full">
            {activeTab === 'overview' && (
              <OverviewTab
                user={user}
                accounts={accounts}
                onNavigateTab={setActiveTab}
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
                onRefresh={loadAccounts}
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
                onRefreshAccounts={loadAccounts}
              />
            )}

            {activeTab === 'admin-audit' && (
              <AdminAuditorPanel
                user={user}
                accounts={accounts}
                onRefreshAccounts={loadAccounts}
              />
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
        onRefresh={loadAccounts}
      />

      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        accounts={accounts}
        user={user}
        onRefresh={loadAccounts}
      />

      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        accounts={accounts}
        user={user}
        onRefresh={loadAccounts}
      />

      <OnboardingModal
        isOpen={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
        onSuccess={async (newUser) => {
          setShowOnboardModal(false);
          if (newUser && newUser.email) {
            await handleLogin(newUser.email, 'Password123!');
          }
        }}
      />

      <BootstrapAdminModal
        isOpen={showBootstrapModal}
        onClose={() => setShowBootstrapModal(false)}
      />
    </div>
  );
}
