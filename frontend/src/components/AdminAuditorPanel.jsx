import React, { useState, useEffect } from 'react';
import { ShieldAlert, BarChart3, Search, RefreshCw, AlertTriangle, CheckCircle, Lock, Eye } from 'lucide-react';
import { api } from '../api';

export default function AdminAuditorPanel({ user }) {
  const [aggregate, setAggregate] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [agg, logs] = await Promise.all([
        api.getAggregateBalance(),
        api.getAuditLogs()
      ]);
      setAggregate(agg);
      setAuditLogs(logs);
    } catch (e) {
      console.error("Failed to load audit/aggregate:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  const filteredLogs = auditLogs.filter(l => {
    const text = `${l.action} ${l.status} ${l.resource} ${l.details} ${l.userRole}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <span>Aggregate System Liquidity</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {formatCurrency(aggregate?.aggregateBalance || 0, aggregate?.currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sum of all active account ledger balances</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Vault Accounts
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {aggregate?.totalAccounts || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active Accounts: {aggregate?.activeAccounts || 0}</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Integrity Status</span>
          </div>
          <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center space-x-1.5">
            <CheckCircle className="w-4 h-4" />
            <span>Zero-Sum Conserved</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Postgres ACID Triggers Active</p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-purple-400" />
              <span>Immutable System Audit Logs & IDOR Interceptions</span>
            </h3>
            <p className="text-xs text-slate-400">
              Complete provable trail of account creations, transfers, overdraw attempts, and security breaches.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono w-48 sm:w-64"
              />
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No audit records match your query.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 font-mono text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 uppercase text-[11px] border-b border-slate-800">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Security Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => {
                  const isForbidden = log.status === 'FORBIDDEN';
                  const isRefused = log.status === 'REFUSED';
                  const isSuccess = log.status === 'SUCCESS';

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-200">
                        {log.action}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {log.userRole || 'ANONYMOUS'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-sky-400 max-w-[140px] truncate">
                        {log.resource || '-'}
                      </td>

                      <td className="py-3 px-4">
                        {isForbidden ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            FORBIDDEN
                          </span>
                        ) : isRefused ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            REFUSED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            SUCCESS
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-300 text-[11px] font-sans">
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
