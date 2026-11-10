import React, { useState, useEffect } from 'react';
import { FileText, ArrowDownLeft, ArrowUpRight, AlertOctagon, RefreshCw, Filter, ShieldCheck, Hash, ShieldAlert } from 'lucide-react';

export default function StatementViewer({
  selectedAccount,
  accounts,
  onSelectAccount,
  onLoadStatement,
  statement,
  loading
}) {
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

  const formatBalance = (val, currency = 'INR') => {
    const num = parseFloat(val) || 0;
    return `${num.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${currency}`;
  };

  return (
    <div className="bg-obsidian-850 border border-obsidian-750 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header and Account Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-obsidian-750">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Immutable Double-Entry Statement</span>
          </h2>
          <p className="text-xs text-slate-400">
            Provable append-only journal of validated Debits, Credits, and audited Refusals.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <label className="text-xs text-slate-400 font-mono">Vault:</label>
          <select
            value={selectedAccount ? selectedAccount.id : ''}
            onChange={(e) => {
              const acc = accounts.find(a => a.id === e.target.value);
              if (acc) onSelectAccount(acc);
            }}
            className="bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.accountNumber} ({acc.ownerEmail || 'Owner'}) [{acc.currency}]
              </option>
            ))}
          </select>

          {selectedAccount && (
            <button
              onClick={() => onLoadStatement(selectedAccount.id)}
              disabled={loading}
              className="p-1.5 bg-obsidian-900 hover:bg-obsidian-800 text-slate-300 rounded-lg border border-obsidian-700 transition"
              title="Refresh Statement"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs text-slate-400 font-mono mr-1">Filter:</span>
        {[
          { key: 'ALL', label: 'All Postings' },
          { key: 'CREDIT', label: 'Credits (+)' },
          { key: 'DEBIT', label: 'Debits (-)' },
          { key: 'REFUSED', label: 'Refusals & Violations' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
            className={`text-xs px-2.5 py-1 rounded-md font-mono font-medium transition ${
              filterType === f.key
                ? 'bg-obsidian-800 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-obsidian-900'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Statement Table */}
      {!selectedAccount ? (
        <div className="text-center py-12 text-slate-500 text-xs font-mono">
          Select an account above to inspect its append-only ledger entries.
        </div>
      ) : filteredStatement.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs bg-obsidian-950/40 rounded-lg border border-obsidian-800 font-mono">
          No ledger entries match this criteria.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-obsidian-750 bg-obsidian-950">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-obsidian-900/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-obsidian-750">
              <tr>
                <th className="px-4 py-3">Timestamp / Hash</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Counterparty / Details</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Running Balance</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-800/80 font-mono text-[11px]">
              {filteredStatement.map((item, idx) => {
                const isRefused = item.status === 'REFUSED';
                const isCredit = item.entryType === 'CREDIT' && !isRefused;
                const isDebit = item.entryType === 'DEBIT' && !isRefused;

                return (
                  <tr
                    key={item.id || idx}
                    className={`hover:bg-obsidian-850/60 transition ${isRefused ? 'bg-amber-950/10' : ''}`}
                  >
                    {/* Timestamp & Hash snippet */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-slate-200 font-medium">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-1 mt-0.5">
                        <Hash className="w-2.5 h-2.5" />
                        <span>{(item.id || 'ENTRY-INIT').substring(0, 16)}...</span>
                      </div>
                    </td>

                    {/* Entry Type */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isRefused ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-500/30 flex items-center space-x-1 w-max">
                          <AlertOctagon className="w-3 h-3" />
                          <span>REFUSED</span>
                        </span>
                      ) : isCredit ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1 w-max">
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>CREDIT</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-500/30 flex items-center space-x-1 w-max">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>DEBIT</span>
                        </span>
                      )}
                    </td>

                    {/* Details / Counterparty */}
                    <td className="px-4 py-3">
                      <div className="text-slate-200 max-w-xs truncate">
                        {item.counterpartyAccount || item.description || (isRefused ? item.failureReason : 'Internal Ledger Operation')}
                      </div>
                      {isRefused && (
                        <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                          Invariant Conserved: No balances altered
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className={`px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap ${
                      isRefused ? 'text-slate-500 line-through' : isCredit ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isCredit ? '+' : isDebit ? '-' : ''}
                      {parseFloat(item.amount).toFixed(4)} {selectedAccount.currency}
                    </td>

                    {/* Running Balance */}
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-100 whitespace-nowrap">
                      {item.runningBalance !== null && item.runningBalance !== undefined
                        ? formatBalance(item.runningBalance, selectedAccount.currency)
                        : '—'}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isRefused
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {item.status}
                      </span>
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
