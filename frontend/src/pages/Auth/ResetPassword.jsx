import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { apiFetch } from "../../utils/api";

export default function ResetPassword() {
  const [form, setForm] = useState({
    token: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("Password reset! Please sign in.");
      navigate("/auth");
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
          <h1 className="font-display text-2xl text-white font-semibold">
            Reset Password
          </h1>
        </div>
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/45 mb-1.5 block font-medium">
                Reset Token
              </label>
              <input
                value={form.token}
                onChange={(e) =>
                  setForm((p) => ({ ...p, token: e.target.value }))
                }
                placeholder="Paste reset token"
                required
                className="input-dark font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-white/45 mb-1.5 block font-medium">
                New Password
              </label>
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) =>
                  setForm((p) => ({ ...p, newPassword: e.target.value }))
                }
                placeholder="••••••••"
                required
                minLength={6}
                className="input-dark"
              />
            </div>
            <div>
              <label className="text-xs text-white/45 mb-1.5 block font-medium">
                Confirm Password
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((p) => ({ ...p, confirmPassword: e.target.value }))
                }
                placeholder="••••••••"
                required
                minLength={6}
                className="input-dark"
              />
            </div>
            {form.newPassword &&
              form.confirmPassword &&
              form.newPassword !== form.confirmPassword && (
                <p className="text-red-400 text-xs font-medium">
                  Passwords do not match
                </p>
              )}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
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
