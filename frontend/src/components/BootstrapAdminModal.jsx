import React, { useState } from 'react';
import { Key, CheckCircle2, AlertCircle, X, ShieldAlert, ArrowRight } from 'lucide-react';
import { api } from '../api';

export default function BootstrapAdminModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('first_admin@ledgerline.io');
  const [password, setPassword] = useState('AdminSecurePass123!');
  const [token, setToken] = useState('BOOTSTRAP-LEDGERLINE-INIT-2026');

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
        bootstrapToken: token
      });
      setSuccessResult(res);
    } catch (err) {
      setError(err.message || 'Bootstrap failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccessResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-[#e5ede3] rounded-3xl w-full max-w-md p-7 shadow-2xl relative">
        <button
          onClick={handleReset}
          className="absolute top-5 right-5 text-[#6c8a77] hover:text-[#122a1f] p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {!successResult ? (
          <div>
            <div className="mb-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#5c7c6a]">
                INITIALIZATION SECURITY
              </div>
              <h3 className="font-serif text-2xl font-normal text-[#122a1f] mt-0.5">
                First-Admin Bootstrap
              </h3>
              <p className="text-xs text-[#52705e] mt-1">
                Zero-trust bootstrap script. Only succeeds if zero administrators exist in the ledger system.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1e3c2c] mb-1">
                  Administrator Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2 text-xs text-[#122a1f] font-mono focus:outline-none focus:border-[#133e2b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e3c2c] mb-1">
                  Administrator Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2 text-xs text-[#122a1f] font-mono focus:outline-none focus:border-[#133e2b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e3c2c] mb-1">
                  Bootstrap Authorization Token
                </label>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-[#f8faf7] border border-[#d6e2d4] rounded-xl px-3.5 py-2 text-xs text-[#122a1f] font-mono focus:outline-none focus:border-[#133e2b]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-semibold text-[#52705e]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-[#133e2b] hover:bg-[#0e2e1f] text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center space-x-2"
                >
                  <span>{loading ? 'Bootstrapping...' : 'Execute Bootstrap'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#eaf2e8] text-[#133e2b] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-serif text-2xl font-normal text-[#122a1f]">
                Administrator Created
              </h3>
              <p className="text-xs text-[#52705e] mt-1">
                First-Admin successfully initialized.
              </p>
            </div>

            <div className="bg-[#f8faf7] border border-[#eaf0e8] rounded-2xl p-4 text-left font-mono text-xs space-y-2">
              <div><span className="text-[#6c8a77]">Admin ID:</span> {successResult.userId}</div>
              <div><span className="text-[#6c8a77]">Email:</span> {successResult.email}</div>
              <div><span className="text-[#6c8a77]">Role:</span> <span className="font-bold text-[#133e2b]">{successResult.role}</span></div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-2.5 bg-[#133e2b] text-white font-semibold rounded-xl text-xs"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
