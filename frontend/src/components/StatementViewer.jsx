import React, { useState, useEffect } from 'react';
import { FileText, ArrowDownLeft, ArrowUpRight, AlertOctagon, RefreshCw, Filter, CheckCircle2, XCircle } from 'lucide-react';

export default function StatementViewer({ selectedAccount, accounts, onSelectAccount, onLoadStatement, statement, loading }) {
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'CREDIT', 'DEBIT', 'REFUSED'

  useEffect(() => {
    if (selectedAccount) {
      onLoadStatement(selectedAccount.id);
    }
  }, [selectedAccount]);

  const filteredStatement = statement.filter(item => {
    if (filterType === 'ALL') return true;
    if (filterType === 'REFUSED') return item.status === 'REFUSED';
    return item.entryType === filterType && item.status !== 'REFUSED';
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header and Account Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <FileText className="w-5 h-5 text-sky-400" />
            <span>Immutable Double-Entry Statement</span>
          </h2>
          <p className="text-xs text-slate-400">
            Append-only chronological journal of Debits, Credits, and Provable Refusal attempts.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <label className="text-xs text-slate-400 font-medium">Vault:</label>
          <select
            value={selectedAccount ? selectedAccount.id : ''}
            onChange={(e) => {
              const acc = accounts.find(a => a.id === e.target.value);
              if (acc) onSelectAccount(acc);
            }}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.accountNumber} ({acc.ownerEmail})
              </option>
            ))}
          </select>

          {selectedAccount && (
            <button
              onClick={() => onLoadStatement(selectedAccount.id)}
              disabled={loading}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Refresh Statement"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center space-x-2">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs text-slate-400 mr-2">Filter:</span>
        {['ALL', 'CREDIT', 'DEBIT', 'REFUSED'].map(f => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={`text-xs px-3 py-1 rounded-lg font-semibold transition ${
              filterType === f
                ? 'bg-slate-800 text-sky-400 border border-sky-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Statement Table */}
      {!selectedAccount ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          Select an account above to inspect its append-only ledger entries.
        </div>
      ) : filteredStatement.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
          No ledger entries match this criteria.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Initiator / Role</th>
                <th className="py-3 px-4">Entry Type</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status & Reason</th>
                <th className="py-3 px-4 text-right">Resulting Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredStatement.map((row) => {
                const isRefused = row.status === 'REFUSED';
                const isCredit = row.entryType === 'CREDIT' && !isRefused;
                const isDebit = row.entryType === 'DEBIT' && !isRefused;

                return (
                  <tr key={row.id} className="hover:bg-slate-800/30 transition">
                    {/* Timestamp */}
                    <td className="py-3 px-4 text-slate-300">
                      {new Date(row.timestamp).toLocaleDateString()} {new Date(row.timestamp).toLocaleTimeString()}
                    </td>

                    {/* Initiator */}
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">{row.initiatorEmail || 'System'}</div>
                      <span className="text-[10px] text-slate-400 uppercase font-sans">
                        {row.initiatorRole}
                      </span>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-4">
                      {isRefused ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <AlertOctagon className="w-3 h-3" />
                          <span>REFUSED ATTEMPT</span>
                        </span>
                      ) : isCredit ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                          <span>CREDIT (+)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          <ArrowUpRight className="w-3 h-3 text-rose-400" />
                          <span>DEBIT (-)</span>
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4">
                      <span className={`font-bold ${isRefused ? 'text-amber-400 line-through opacity-70' : isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isCredit ? '+' : isDebit ? '-' : ''}{formatCurrency(row.amount)}
                      </span>
                    </td>

                    {/* Status & Failure Reason */}
                    <td className="py-3 px-4">
                      {isRefused ? (
                        <div className="flex items-center space-x-1.5 text-amber-300">
                          <XCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span className="font-sans text-[11px] font-semibold">
                            {row.failureReason || 'REFUSED'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="font-sans text-[11px] font-semibold">COMPLETED</span>
                        </div>
                      )}
                    </td>

                    {/* Running Balance */}
                    <td className="py-3 px-4 text-right font-extrabold text-white text-sm">
                      {formatCurrency(row.runningBalance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
