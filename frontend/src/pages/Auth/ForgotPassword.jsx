import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { apiFetch } from "../../utils/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setResult(res.data);
      toast.success("Reset token generated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl bg-orange-500/15 border border-orange-500/25 items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-white font-semibold">
            Forgot Password
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Enter your email to get a reset token
          </p>
        </div>
        <div className="glass-card p-8">
          {result ? (
            <div className="text-center space-y-4 animate-scale-in">
              <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center mx-auto">
                <svg
                  className="w-6 h-6 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-white/60 text-sm">Copy your reset token:</p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 font-mono text-orange-400 break-all text-sm text-left">
                {result.resetToken}
              </div>
              <Link
                to="/reset-password"
                className="btn-primary block w-full text-center py-3"
              >
                Use This Token
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-white/45 mb-1.5 block font-medium">
                  Email Address
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="input-dark"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? "Generating..." : "Generate Reset Token"}
              </button>
            </form>
          )}
          <div className="text-center mt-4">
            <Link
              to="/auth"
              className="text-xs text-orange-400 hover:text-orange-300 transition-colors font-medium"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
