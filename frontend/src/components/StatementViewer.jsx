import React, { useState, useEffect } from 'react';
import { FileText, ArrowDownLeft, ArrowUpRight, AlertOctagon, RefreshCw, Filter, ShieldCheck, Hash, ShieldAlert, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

export default function StatementViewer({
  selectedAccount,
  accounts,
  onSelectAccount,
  onLoadStatement,
  statement,
  loading
}) {
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'CREDIT', 'DEBIT', 'REFUSED'
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
    <div className="space-y-8 pb-16">
      {/* Header & Account Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#5c7c6a]">
            AUDIT JOURNAL
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#122a1f] mt-1">
            Statements
          </h1>
          <p className="text-xs text-[#52705e] mt-1">
            Provable append-only journal of validated Debits, Credits, and audited Refusals.
          </p>
        </div>

        {/* Vault selector dropdown */}
        <div className="flex items-center space-x-2.5">
          <label className="text-xs text-[#52705e] font-semibold">Vault:</label>
          <select
            value={selectedAccount ? selectedAccount.id : ''}
            onChange={(e) => {
              const acc = accounts.find(a => a.id === e.target.value);
              if (acc) onSelectAccount(acc);
            }}
            className="bg-white border border-[#d6e2d4] rounded-xl px-3.5 py-2 text-xs text-[#122a1f] font-mono focus:outline-none focus:border-[#133e2b] shadow-xs"
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
              className="p-2 bg-white hover:bg-[#f2f6f1] text-[#1a4a35] rounded-xl border border-[#d6e2d4] transition shadow-xs"
              title="Refresh Statement"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#133e2b]' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Statement Container */}
      <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#f8faf7] p-3 rounded-2xl border border-[#eaf0e8]">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[#6c8a77] absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search statement by ID, counterparty, memo, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#d6e2d4] rounded-xl pl-9 pr-8 py-1.5 text-xs text-[#122a1f] placeholder-[#819e8e] focus:outline-none focus:border-[#133e2b] font-mono transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-[#6c8a77] hover:text-[#122a1f] transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs & Page size */}
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
                  className={`text-xs px-3 py-1.5 rounded-lg font-mono font-medium transition ${
                    filterType === f.key
                      ? 'bg-[#133e2b] text-white shadow-xs font-semibold'
                      : 'text-[#597866] hover:text-[#122a1f] hover:bg-[#eef3ec]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 font-mono text-xs text-[#52705e]">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-[#d6e2d4] rounded-lg px-2 py-1 text-xs text-[#122a1f] focus:outline-none focus:border-[#133e2b] font-mono"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statement Table */}
        {!selectedAccount ? (
          <div className="text-center py-12 text-[#6c8a77] text-xs font-mono">
            Select an account above to inspect its append-only ledger entries.
          </div>
        ) : totalItems === 0 ? (
          <div className="text-center py-12 text-[#52705e] text-xs bg-[#f8faf7] rounded-2xl border border-[#eaf0e8] font-mono space-y-2">
            <p>No ledger entries match {searchQuery ? `"${searchQuery}"` : 'this filter criteria'}.</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-[#133e2b] font-semibold hover:underline"
              >
                Clear search filter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-[#e5ede3] bg-white">
              <table className="w-full text-left text-xs text-[#122a1f]">
                <thead className="bg-[#f8faf7] text-[#597866] uppercase font-mono text-[10px] tracking-wider border-b border-[#e5ede3]">
                  <tr>
                    <th className="px-4 py-3">Timestamp / Hash</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Counterparty / Details</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Running Balance</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf3ec] font-mono text-[11px]">
                  {paginatedStatement.map((item, idx) => {
                    const isRefused = item.status === 'REFUSED';
                    const isCredit = item.entryType === 'CREDIT' && !isRefused;

                    return (
                      <tr key={idx} className="hover:bg-[#f6f9f5] transition">
                        {/* Timestamp & Tx Hash */}
                        <td className="px-4 py-3 font-mono text-[#52705e]">
                          <div className="font-semibold text-[#122a1f]">
                            {new Date(item.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="text-[10px] text-[#789685]">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </div>
                          <div className="text-[9px] text-[#91ad9d] truncate max-w-[140px]" title={item.transactionId}>
                            Tx: {item.transactionId ? item.transactionId.substring(0, 16) : 'N/A'}...
                          </div>
                        </td>

                        {/* Entry Type */}
                        <td className="px-4 py-3">
                          {isRefused ? (
                            <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-[10px] font-bold">
                              <AlertOctagon className="w-3 h-3 mr-0.5" />
                              REFUSAL
                            </span>
                          ) : isCredit ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px] font-bold">
                              <ArrowDownLeft className="w-3 h-3 mr-0.5 text-emerald-600" />
                              CREDIT
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 text-[10px] font-bold">
                              <ArrowUpRight className="w-3 h-3 mr-0.5 text-slate-500" />
                              DEBIT
                            </span>
                          )}
                        </td>

                        {/* Counterparty / Description */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#122a1f] flex items-center space-x-1">
                            <span>{item.counterpartyAccount || 'Direct Clearing'}</span>
                          </div>
                          <div className="text-[10px] text-[#698675] font-sans mt-0.5">
                            {item.description || item.reason || 'Double-entry transfer'}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className={`px-4 py-3 text-right font-bold text-xs ${
                          isRefused
                            ? 'text-rose-600 line-through'
                            : isCredit
                            ? 'text-emerald-700'
                            : 'text-[#122a1f]'
                        }`}>
                          {isRefused ? '₹0.00' : `${isCredit ? '+' : '-'}₹${parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                        </td>

                        {/* Running Balance */}
                        <td className="px-4 py-3 text-right text-[#52705e]">
                          {isRefused ? (
                            <span className="text-[#91ad9d] italic text-[10px]">Unchanged</span>
                          ) : item.runningBalance != null ? (
                            formatBalance(item.runningBalance)
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                            isRefused
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-[#eaf2e8] text-[#133e2b] border-[#cbdec7]'
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs font-mono text-[#52705e]">
                <div>
                  Showing {startIndex + 1}–{endIndex} of {totalItems} entries
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={validCurrentPage <= 1}
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#d6e2d4] hover:bg-[#f2f6f1] disabled:opacity-40 transition text-xs font-semibold"
                  >
                    Prev
                  </button>

                  <span className="text-xs font-semibold text-[#122a1f]">
                    {validCurrentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={validCurrentPage >= totalPages}
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#d6e2d4] hover:bg-[#f2f6f1] disabled:opacity-40 transition text-xs font-semibold"
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
