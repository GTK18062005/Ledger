import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, Wallet, UserCircle, Activity, Server, Zap, UserPlus, Key } from 'lucide-react';
import { api, onRateLimitUpdate } from '../api';

export default function Navbar({
  user,
  onLogout,
  onOpenOnboardModal,
  onOpenBootstrapModal
}) {
  const [healthStatus, setHealthStatus] = useState({
    status: 'UP',
    database: 'CONNECTED',
    doubleEntryIntegrity: 'CONSERVED_ZERO_SUM',
    netSystemBalance: '0.0000 INR',
    redisRateLimiter: 'CONNECTED'
  });
  const [rateLimitInfo, setRateLimitInfo] = useState(null);

  // Poll health status every 20 seconds
  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const data = await api.getHealth();
        if (isMounted && data) {
          setHealthStatus(data);
        }
      } catch (err) {
        if (isMounted) {
          setHealthStatus(prev => ({
            ...prev,
            status: 'DEGRADED',
            database: 'UNREACHABLE'
          }));
        }
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Listen to live rate limit response headers
  useEffect(() => {
    const unsubscribe = onRateLimitUpdate((info) => {
      setRateLimitInfo(info);
    });
    return unsubscribe;
  }, []);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-950/60 text-purple-300 border-purple-500/40';
      case 'AUDITOR':
        return 'bg-amber-950/60 text-amber-300 border-amber-500/40';
      case 'ACCOUNT_HOLDER':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const isHealthy = healthStatus.status === 'UP' && healthStatus.doubleEntryIntegrity === 'CONSERVED_ZERO_SUM';

  return (
    <header className="border-b border-obsidian-750 bg-obsidian-950/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Invariant Indicator */}
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-lg bg-obsidian-850 border border-emerald-500/30 flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white font-mono">BalanceVault</span>
              <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded bg-obsidian-800 text-slate-300 border border-obsidian-700">
                v1.0 Core
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center space-x-1.5">
              <span>ACID Double-Entry</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-mono">Deterministic Lock</span>
            </p>
          </div>
        </div>

        {/* Real-Time Telemetry Pills */}
        <div className="hidden md:flex items-center space-x-3">
          {/* Health Pill */}
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              isHealthy
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
            }`}
            title={`DB: ${healthStatus.database} | Integrity: ${healthStatus.doubleEntryIntegrity} | Net: ${healthStatus.netSystemBalance}`}
          >
            <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="font-semibold">{isHealthy ? 'ZERO-SUM CONSERVED' : 'INTEGRITY ALERT'}</span>
            <span className="text-[10px] text-slate-400 font-normal">({healthStatus.netSystemBalance})</span>
          </div>

          {/* Redis Rate Limit Quota */}
          <div
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-obsidian-750 bg-obsidian-850 text-xs font-mono text-slate-300"
            title={rateLimitInfo ? `Category: ${rateLimitInfo.category} | Remaining: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}` : "Sliding-Window Rate Limiter: Active"}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {rateLimitInfo && rateLimitInfo.remaining !== null
                ? `Quota: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}`
                : 'Rate Limiter: Active'}
            </span>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center space-x-3">
          {/* Register / Onboard Button */}
          <button
            onClick={onOpenOnboardModal}
            className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-obsidian-850 hover:bg-obsidian-800 border border-obsidian-750 hover:border-obsidian-700 px-3 py-1.5 rounded-lg transition"
            title="Register new customer and provision primary vault"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Onboard</span>
          </button>

          {/* First Admin Bootstrap */}
          <button
            onClick={onOpenBootstrapModal}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 bg-obsidian-850 hover:bg-obsidian-800 border border-obsidian-750 hover:border-obsidian-700 px-2.5 py-1.5 rounded-lg transition"
            title="Bootstrap Administrator with ADMIN_BOOTSTRAP_SECRET"
          >
            <Key className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline text-[11px]">Bootstrap Admin</span>
          </button>

          {user ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2.5 bg-obsidian-850 border border-obsidian-750 px-3 py-1.5 rounded-lg">
                <UserCircle className="w-4 h-4 text-slate-400" />
                <div className="text-left">
                  <div className="text-xs font-medium text-slate-200 leading-tight max-w-[130px] sm:max-w-[160px] truncate">
                    {user.email}
                  </div>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="flex items-center space-x-1 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-500/20 p-2 sm:px-3 sm:py-1.5 rounded-lg transition duration-150"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Offline Session</span>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
