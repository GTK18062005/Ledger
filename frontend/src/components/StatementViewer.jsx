import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, AlertOctagon, RefreshCw, Search, X } from 'lucide-react';

export default function StatementViewer({
  selectedAccount,
  accounts,
  onSelectAccount,
  onLoadStatement,
  statement,
  loading
}) {
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (selectedAccount) {
      onLoadStatement(selectedAccount.id);
    }
  }, [selectedAccount]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, selectedAccount, pageSize, searchQuery]);

  const filteredStatement = (statement || []).filter(item => {
    if (filterType === 'REFUSED' && item.status !== 'REFUSED') return false;
    if (filterType === 'CREDIT' && (item.entryType !== 'CREDIT' || item.status === 'REFUSED')) return false;
    if (filterType === 'DEBIT' && (item.entryType !== 'DEBIT' || item.status === 'REFUSED')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const txId = (item.transactionId || '').toLowerCase();
      const cp = (item.counterpartyAccount || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const status = (item.status || '').toLowerCase();
      const entryType = (item.entryType || '').toLowerCase();
      const amt = item.amount != null ? String(item.amount) : '';
      const date = (item.timestamp || item.createdAt || '').toLowerCase();
      const match = txId.includes(q) || cp.includes(q) || desc.includes(q) || status.includes(q) || entryType.includes(q) || amt.includes(q) || date.includes(q);
      if (!match) return false;
    }

    return true;
  });

  const totalItems = filteredStatement.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedStatement = filteredStatement.slice(startIndex, endIndex);

  const formatBalance = (val, currency = 'INR') => {
    const raw = parseFloat(val) || 0;
    const num = Math.max(0, raw);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Account Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600">
            APPEND-ONLY JOURNAL / DOUBLE-ENTRY PROOF
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            Ledger Statements
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cryptographically linked Debits, Credits, and intercepted Overdraft/Frozen refusals.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <label className="text-xs text-slate-600 font-semibold">Vault:</label>
          <select
            value={selectedAccount ? selectedAccount.id : ''}
            onChange={(e) => {
              const acc = accounts.find(a => a.id === e.target.value);
              if (acc) onSelectAccount(acc);
            }}
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500 shadow-2xs"
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
              className="p-2.5 bg-white hover:bg-slate-50 text-indigo-600 rounded-xl border border-slate-200 transition shadow-2xs"
              title="Refresh Statement"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Statement Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search statement by Tx ID, counterparty, memo, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              {[
                { key: 'ALL', label: 'All' },
                { key: 'CREDIT', label: 'Credits (+)' },
                { key: 'DEBIT', label: 'Debits (-)' },
                { key: 'REFUSED', label: 'Refusals' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterType(f.key)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-mono font-semibold transition ${
                    filterType === f.key
                      ? 'bg-[#0f172a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 font-mono text-xs text-slate-500">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {!selectedAccount ? (
          <div className="text-center py-12 text-slate-400 text-xs font-mono">
            Select a vault above to inspect its append-only double-entry journal.
          </div>
        ) : totalItems === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200/70 font-mono space-y-2">
            <p>No ledger entries match {searchQuery ? `"${searchQuery}"` : 'this filter criteria'}.</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-indigo-600 font-semibold hover:underline"
              >
                Clear search filter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
              <table className="w-full text-left text-xs text-slate-900">
                <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-3">Timestamp / Hash</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Counterparty / Details</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Running Balance</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {paginatedStatement.map((item, idx) => {
                    const isRefused = item.status === 'REFUSED';
                    const isCredit = item.entryType === 'CREDIT' && !isRefused;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-mono text-slate-600">
                          <div className="font-semibold text-slate-900">
                            {new Date(item.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </div>
                          <div className="text-[9px] text-slate-400 truncate max-w-[140px]" title={item.transactionId}>
                            Tx: {item.transactionId ? item.transactionId.substring(0, 16) : 'N/A'}...
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {isRefused ? (
                            <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-[10px] font-bold">
                              <AlertOctagon className="w-3 h-3 mr-0.5" />
                              REFUSAL
                            </span>
                          ) : isCredit ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px] font-bold">
                              <ArrowDownLeft className="w-3 h-3 mr-0.5 text-emerald-600" />
                              CREDIT
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 text-[10px] font-bold">
                              <ArrowUpRight className="w-3 h-3 mr-0.5 text-slate-500" />
                              DEBIT
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {item.counterpartyAccount || 'Direct Clearing'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                            {item.description || item.reason || 'Double-entry settlement'}
                          </div>
                        </td>

                        <td className={`px-4 py-3 text-right font-bold text-xs ${
                          isRefused
                            ? 'text-rose-600 line-through'
                            : isCredit
                            ? 'text-emerald-600'
                            : 'text-slate-900'
                        }`}>
                          {isRefused ? '₹0.00' : `${isCredit ? '+' : '-'}₹${parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                        </td>

                        <td className="px-4 py-3 text-right text-slate-600 font-semibold">
                          {isRefused ? (
                            <span className="text-slate-400 italic text-[10px] font-normal">Unchanged</span>
                          ) : item.runningBalance != null ? (
                            formatBalance(item.runningBalance, selectedAccount.currency || 'INR')
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                            isRefused
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {item.status || 'COMMITTED'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs font-mono text-slate-500">
                <div>
                  Showing {startIndex + 1}–{endIndex} of {totalItems} entries
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={validCurrentPage <= 1}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition text-xs font-semibold"
                  >
                    Prev
                  </button>

                  <span className="text-xs font-semibold text-slate-900">
                    {validCurrentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={validCurrentPage >= totalPages}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition text-xs font-semibold"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
