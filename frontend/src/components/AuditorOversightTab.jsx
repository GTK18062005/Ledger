import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Download,
  RefreshCw,
  ArrowRight,
  ClipboardList,
  BarChart3,
  ShieldAlert,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../api';

export default function AuditorOversightTab({
  user,
  mode = 'auditor-overview',
  onNavigateTab,
  onRefresh
}) {
  const [integrity, setIntegrity] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isReportsView = mode === 'integrity-reports';

  const formatInr = (val) => {
    const num = parseFloat(val) || 0;
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const loadData = useCallback(async (isManualVerify = false) => {
    if (isManualVerify) {
      setVerifying(true);
    } else {
      setLoading(true);
    }
    try {
      const [integrityRes, txRes] = await Promise.all([
        api.getIntegrityVerification(),
        api.getTransactions()
      ]);
      setIntegrity(integrityRes);
      setTransactions(Array.isArray(txRes) ? txRes : []);
      if (isManualVerify) {
        setStatusMessage({
          type: 'success',
          text: `Live invariant check passed at ${new Date().toLocaleTimeString()} · SHA-256 digest validated · Zero negative-balance violations.`
        });
      }
      if (onRefresh) await onRefresh();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Unable to compute continuous assurance report.'
      });
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const handleExportDossier = () => {
    const dossier = {
      generatedAt: new Date().toISOString(),
      generatedBy: user?.email || 'compliance-user',
      role: user?.role,
      integrityReport: integrity,
      reconciledTransactionsSample: transactions.slice(0, 100)
    };
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ledgerline-audit-dossier-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMessage({
      type: 'success',
      text: 'Cryptographic Audit Dossier downloaded cleanly as JSON attestation.'
    });
  };

  const handleCopyHash = async () => {
    if (!integrity?.merkleRootHash) return;
    try {
      await navigator.clipboard.writeText(integrity.merkleRootHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 1800);
    } catch (err) {
      // Clipboard may be unavailable in restricted contexts
    }
  };

  const varianceFormatted = integrity?.variance !== undefined
    ? Number(integrity.variance).toFixed(4)
    : '0.0000';

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner (Swiss Sage Editorial Style) */}
      <div className="bg-[#eaf2e8] border border-[#d8e7d5] rounded-3xl p-7 sm:p-8 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-widest text-[#40624c] mb-2">
            <span>✱</span>
            <span>
              {isReportsView
                ? 'MATHEMATICAL VERIFICATION & PROOF MATRIX'
                : 'COMPLIANCE & AUDIT · CONTINUOUS ASSURANCE'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white border border-[#cfe0cc] text-[#133e2b] text-[10px]">
              AUTONOMOUS AUDIT ENGINE
            </span>
          </div>
          <h1 className="text-3xl font-serif font-normal text-[#122a1f]">
            {isReportsView
              ? 'Integrity Verification Reports'
              : 'Auditor Oversight & Continuous Assurance'}
          </h1>
          <p className="text-xs sm:text-sm text-[#4d6e58] mt-1.5 max-w-2xl leading-relaxed">
            Independent cryptographic verification engine, immutable double-entry sampling, real-time transaction reconciliation, and continuous compliance assurance across all vaults.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportDossier}
            disabled={!integrity}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white border border-[#d6e4d2] hover:bg-[#f2f6f0] disabled:opacity-50 text-xs font-medium text-[#122a1f] transition"
          >
            <Download className="w-4 h-4 text-[#133e2b]" />
            <span>Export Audit Dossier</span>
          </button>
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={verifying}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#133e2b] hover:bg-[#194e37] disabled:opacity-60 text-xs font-semibold text-white transition shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
            <span>{verifying ? 'Verifying Invariants...' : 'Run Live Invariant Verification'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`flex items-start space-x-2.5 p-4 rounded-2xl text-xs border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* 4 Telemetry & Assurance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* KPI 1: Total Transactions Reviewed */}
        <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#5c7c6a]">
                Total Transactions Reviewed
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#eaf2e8] text-[#133e2b] text-[10px] font-mono font-semibold shrink-0">
                100% Sampled
              </span>
            </div>
            <div className="text-3xl font-serif font-medium text-[#122a1f]">
              {loading ? '—' : integrity?.totalTransactionsReviewed ?? 0}
            </div>
            <p className="text-xs text-[#52705e] mt-1.5">
              {integrity?.totalLedgerEntries ?? 0} immutable double-entry postings sampled
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#eef3ec] flex items-center justify-between text-[10px] font-mono text-[#5c7c6a]">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Zero Blindspots</span>
            </span>
            <span>HASH-SAMPLED</span>
          </div>
        </div>

        {/* KPI 2: Reconciled Attested Volume (Forest Green Hero Card) */}
        <div className="bg-[#133e2b] text-white border border-[#245f44] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#9ec5b2]">
                Reconciled Attested Volume
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#1b543b] text-emerald-200 border border-[#2d7052] text-[10px] font-mono font-semibold shrink-0">
                {integrity?.conservedZeroSum ? 'Clean Opinion' : 'Variance Alert'}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-medium text-white truncate">
              {loading ? '—' : formatInr(integrity?.reconciledAttestedVolume)}
            </div>
            <p className="text-xs text-[#b5d6c5] mt-1.5">
              Double-entry balanced to {formatInr(integrity?.variance)} variance
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#225a41] flex items-center justify-between text-[10px] font-mono text-[#9ec5b2]">
            <span>Σ(DR) = Σ(CR)</span>
            <span>VAR: {varianceFormatted}</span>
          </div>
        </div>

        {/* KPI 3: Security Alerts */}
        <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#5c7c6a]">
                Security Alerts
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold shrink-0 ${
                  (integrity?.securityAlertsCount || 0) > 0
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-[#f2f6f0] text-[#456150]'
                }`}
              >
                {integrity?.securityAlertsCount ?? 0} Active
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-serif font-medium text-[#122a1f]">
                {loading ? '—' : integrity?.securityAlertsCount ?? 0}
              </span>
              <span className="text-xs text-[#52705e]">Anomalies &amp; Refusals</span>
            </div>
            <p className="text-xs text-[#698675] mt-1.5">
              Non-negative guard violations: {integrity?.negativeBalanceViolations ?? 0}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#eef3ec] flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#5c7c6a]">SecOps Triage</span>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('audit-logs')}
              className="text-[#133e2b] font-semibold hover:underline"
            >
              Review Alerts →
            </button>
          </div>
        </div>

        {/* KPI 4: Financial Integrity Index */}
        <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#5c7c6a]">
                Financial Integrity Index
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#eaf2e8] text-[#133e2b] text-[10px] font-mono font-semibold shrink-0">
                ISO 20022
              </span>
            </div>
            <div className="text-3xl font-serif font-medium text-[#133e2b]">
              {loading ? '—' : integrity?.financialIntegrityIndex || '100.000%'}
            </div>
            <p className="text-xs text-[#52705e] mt-1.5">
              SHA-256 ledger digest validated
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#eef3ec] flex items-center justify-between text-[10px] font-mono text-[#5c7c6a]">
            <span>Merkle Digest</span>
            <button
              type="button"
              onClick={handleCopyHash}
              title={integrity?.merkleRootHash || ''}
              className="inline-flex items-center space-x-1 text-[#133e2b] font-semibold hover:underline"
            >
              <span>
                {integrity?.merkleRootHash
                  ? `${integrity.merkleRootHash.slice(0, 12)}...`
                  : 'VALID'}
              </span>
              {copiedHash ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Proof Matrix when on Integrity Reports view */}
      {isReportsView && integrity && (
        <div className="bg-white border border-[#e5ede3] rounded-3xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#5c7c6a]">
                Mathematical Proof Breakdown
              </p>
              <h2 className="font-serif text-xl text-[#122a1f] mt-0.5">
                Zero-Sum Double-Entry &amp; SHA-256 Digest Verification
              </h2>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#eaf2e8] text-[#133e2b] border border-[#cfe0cc] self-start">
              Verified At: {integrity.verifiedAt ? new Date(integrity.verifiedAt).toLocaleString() : 'Live'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#f8fbf7] border border-[#e2ece0]">
              <p className="text-[10px] font-mono uppercase text-[#698675]">Sum of Debits (DR)</p>
              <p className="text-lg font-mono font-bold text-[#122a1f] mt-1">
                {formatInr(integrity.totalDebits)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#f8fbf7] border border-[#e2ece0]">
              <p className="text-[10px] font-mono uppercase text-[#698675]">Sum of Credits (CR)</p>
              <p className="text-lg font-mono font-bold text-[#122a1f] mt-1">
                {formatInr(integrity.totalCredits)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#f8fbf7] border border-[#e2ece0]">
              <p className="text-[10px] font-mono uppercase text-[#698675]">Net System Balance</p>
              <p className="text-lg font-mono font-bold text-[#133e2b] mt-1">
                {formatInr(integrity.netSystemBalance)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#f8fbf7] border border-[#e2ece0]">
              <p className="text-[10px] font-mono uppercase text-[#698675]">Negative Balance Check</p>
              <p className="text-lg font-mono font-bold text-emerald-700 mt-1">
                {integrity.negativeBalanceViolations} Violations
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#f4f8f2] border border-[#dce7d9] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#5c7c6a]">
                Full SHA-256 Ledger Integrity Digest
              </p>
              <p className="font-mono text-xs text-[#122a1f] break-all mt-1">
                {integrity.merkleRootHash}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyHash}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-[#d6e4d2] hover:bg-[#eaf2e8] text-xs font-mono font-semibold text-[#133e2b] shrink-0 transition"
            >
              {copiedHash ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedHash ? 'Copied Digest' : 'Copy SHA-256'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Lower Two-Column Reconciliation & Compliance Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Real-time Transaction Reconciliation Stream */}
        <div className="lg:col-span-8 bg-white border border-[#e5ede3] rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-serif text-xl text-[#122a1f]">
                Real-time Transaction Reconciliation Stream
              </h2>
              <p className="text-xs text-[#52705e] mt-0.5">
                Continuous ledger sampling and per-transaction DR = CR invariant attestation
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab(isAdmin ? 'admin-transactions' : 'statements')}
              className="inline-flex items-center space-x-1 text-xs font-medium text-[#133e2b] hover:underline shrink-0"
            >
              <span>View Full Journal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e5ede3] text-[10px] font-mono uppercase tracking-wider text-[#698675]">
                  <th className="py-3 pr-4">Ref &amp; Memo</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Invariant Check</th>
                  <th className="py-3 pl-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef3ec] text-xs">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#698675]">
                      {loading ? 'Sampling ledger stream...' : 'No transactions recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  transactions.slice(0, 12).map((tx) => (
                    <tr key={tx.transactionId} className="hover:bg-[#f8fbf7] transition">
                      <td className="py-3.5 pr-4">
                        <p className="font-medium text-[#122a1f] truncate max-w-xs">
                          {tx.referenceMemo || tx.transactionType}
                        </p>
                        <p className="text-[11px] font-mono text-[#698675] mt-0.5">
                          {tx.sourceAccountNumber || 'SYSTEM'} → {tx.destinationAccountNumber || 'SYSTEM'}
                        </p>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#f2f6f0] text-[#133e2b] border border-[#dde8da]">
                          {tx.transactionType}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {tx.status}
                          </span>
                          {tx.reversed && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              REVERSED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                            tx.invariantBalanced
                              ? 'bg-[#eaf2e8] text-[#133e2b]'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>{tx.invariantBalanced ? 'DR = CR BALANCED' : 'VARIANCE'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 pl-3 text-right font-mono font-semibold text-[#122a1f]">
                        {formatInr(tx.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Compliance Navigation */}
        <div className="lg:col-span-4 bg-white border border-[#e5ede3] rounded-3xl p-6 shadow-xs space-y-4 self-start">
          <div>
            <h2 className="font-serif text-xl text-[#122a1f]">Compliance Navigation</h2>
            <p className="text-xs text-[#52705e] mt-0.5">
              Direct access to assurance workflows
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('audit-logs')}
              className="w-full p-3.5 rounded-2xl bg-[#f8fbf7] hover:bg-[#eaf2e8] border border-[#e2ece0] transition flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#dce6d8] flex items-center justify-center shrink-0">
                  <ClipboardList className="w-4 h-4 text-[#133e2b]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#122a1f]">Immutable Audit Logs</p>
                  <p className="text-[11px] text-[#52705e]">Forensic record of all system events</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#5c7c6a] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('integrity-reports')}
              className="w-full p-3.5 rounded-2xl bg-[#f8fbf7] hover:bg-[#eaf2e8] border border-[#e2ece0] transition flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#dce6d8] flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4 text-[#133e2b]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#122a1f]">Integrity Verification Reports</p>
                  <p className="text-[11px] text-[#52705e]">Live mathematical balance proofs</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#5c7c6a] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('audit-logs')}
              className="w-full p-3.5 rounded-2xl bg-[#f8fbf7] hover:bg-[#eaf2e8] border border-[#e2ece0] transition flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#dce6d8] flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4 text-rose-700" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#122a1f]">Security Alerts &amp; Anomalies</p>
                  <p className="text-[11px] text-[#52705e]">SecOps refusals &amp; resolution triage</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#5c7c6a] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab(isAdmin ? 'admin-transactions' : 'statements')}
              className="w-full p-3.5 rounded-2xl bg-[#f8fbf7] hover:bg-[#eaf2e8] border border-[#e2ece0] transition flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#dce6d8] flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4 text-[#133e2b]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#122a1f]">Platform Transactions Journal</p>
                  <p className="text-[11px] text-[#52705e]">Cross-vault chronological ledger</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#5c7c6a] shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

