import React, { useState } from 'react';
import { Key, Shield, CheckCircle2, AlertCircle, X, ArrowRight, Lock } from 'lucide-react';
import { api } from '../api';

export default function BootstrapAdminModal({ isOpen, onClose, onSuccess }) {
  const [email, setEmail] = useState('first_admin@balancevault.io');
  const [password, setPassword] = useState('AdminSecret123!');
  const [fullName, setFullName] = useState('System Administrator');
  const [bootstrapSecret, setBootstrapSecret] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.bootstrapAdmin({
        email,
        password,
        fullName,
        bootstrapSecret
      });
      setSuccessResult(res);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      setError(err.message || 'Administrator bootstrap failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessResult(null);
    setError(null);
    setBootstrapSecret('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-obsidian-850 border border-obsidian-750 rounded-xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-obsidian-800"
        >
          <X className="w-4 h-4" />
        </button>

        {!successResult ? (
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-500/30 flex items-center justify-center">
                <Key className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">First-Admin Bootstrap</h3>
                <p className="text-xs text-slate-400">
                  Provision the root administrator using the <code className="text-purple-300 font-mono">ADMIN_BOOTSTRAP_SECRET</code>.
                </p>
              </div>
            </div>

            <div className="my-3 p-3 rounded-lg bg-obsidian-950 border border-obsidian-800 text-[11px] text-slate-400 flex items-start space-x-2">
              <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                Bootstrap is locked automatically as soon as an administrator exists in the database.
              </span>
            </div>

            {error && (
              <div className="my-3 p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Master Bootstrap Secret (Required)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter ADMIN_BOOTSTRAP_SECRET"
                  value={bootstrapSecret}
                  onChange={(e) => setBootstrapSecret(e.target.value)}
                  className="w-full bg-obsidian-950 border border-purple-500/40 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Admin Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-obsidian-950 border border-obsidian-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-obsidian-750">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-sm transition flex items-center space-x-1.5"
                >
                  <span>{loading ? 'Validating Secret...' : 'Bootstrap Administrator'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-full bg-purple-950/70 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Administrator Minted</h3>
              <p className="text-xs text-slate-400">
                Root administration account provisioned and audit logged to database.
              </p>
            </div>

            <div className="bg-obsidian-950 p-4 rounded-lg border border-obsidian-750 space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-obsidian-800 pb-1.5">
                <span className="text-slate-400">Admin Email:</span>
                <span className="text-purple-300 font-bold">{successResult.email}</span>
              </div>
              <div className="flex justify-between border-b border-obsidian-800 pb-1.5">
                <span className="text-slate-400">Role:</span>
                <span className="text-emerald-400">{successResult.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">User ID:</span>
                <span className="text-slate-300 truncate max-w-[220px]">{successResult.userId}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition"
              >
                Close & Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
