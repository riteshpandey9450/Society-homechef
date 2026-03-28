import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../utils/api";

const ROLES = [
  { id: "customer", label: "Customer", desc: "Order homemade food" },
  { id: "chef", label: "Chef", desc: "Share your recipes" },
  { id: "rider", label: "Rider", desc: "Deliver orders" },
];

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer",
    flat: "",
    street: "",
    landmark: "",
  });
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await apiFetch("/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
            address: {
              flat: form.flat,
              street: form.street,
              landmark: form.landmark,
            },
          }),
        });
        login(res.data.user, res.data.token);
        toast.success(`Welcome, ${res.data.user.name}!`);
        navigate(`/${res.data.user.role}`);
      } else {
        const res = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        login(res.data.user, res.data.token);
        toast.success(`Welcome back, ${res.data.user.name}!`);
        navigate(`/${res.data.user.role}`);
      }
    } catch (err) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4">
      {/* Background glows */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-green-500/4 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

      <div className="w-full max-w-md relative animate-slide-up">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 items-center justify-center mb-4 shadow-xl shadow-orange-500/30">
            <span className="text-white text-2xl font-bold font-display">
              S
            </span>
          </div>
          <h1 className="font-display text-3xl text-white font-semibold">
            Society HomeChef
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Homemade food from your community
          </p>
        </div>

        <div className="glass-card p-8 shadow-2xl">
          {/* Tab switcher */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6 gap-1">
            {["login", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === m
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                    : "text-white/45 hover:text-white/70"
                }`}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="animate-slide-down space-y-4">
                <div>
                  <label className="text-xs text-white/45 mb-1.5 block font-medium">
                    Full Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Your full name"
                    required
                    className="input-dark"
                  />
                </div>

                {/* Role selection */}
                <div>
                  <label className="text-xs text-white/45 mb-2 block font-medium">
                    I am a...
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map((r) => (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => set("role", r.id)}
                        className={`p-3 rounded-xl border text-center transition-all duration-200 ${
                          form.role === r.id
                            ? "border-orange-400/70 bg-orange-500/12 shadow-lg"
                            : "border-white/8 bg-white/3 hover:border-white/16"
                        }`}
                      >
                        <div
                          className={`text-xs font-bold mt-1 ${form.role === r.id ? "text-orange-400" : "text-white/60"}`}
                        >
                          {r.label}
                        </div>
                        <div className="text-[10px] text-white/30 mt-0.5 leading-snug">
                          {r.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="text-xs text-white/45 block font-medium">
                    Address (optional)
                  </label>
                  <input
                    value={form.flat}
                    onChange={(e) => set("flat", e.target.value)}
                    placeholder="Flat / House No."
                    className="input-dark"
                  />
                  <input
                    value={form.street}
                    onChange={(e) => set("street", e.target.value)}
                    placeholder="Street / Area"
                    className="input-dark"
                  />
                  <input
                    value={form.landmark}
                    onChange={(e) => set("landmark", e.target.value)}
                    placeholder="Landmark"
                    className="input-dark"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-white/45 mb-1.5 block font-medium">
                Email Address
              </label>
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                type="email"
                placeholder="you@example.com"
                required
                className="input-dark"
              />
            </div>

            <div>
              <label className="text-xs text-white/45 mb-1.5 block font-medium">
                Password
              </label>
              <input
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                className="input-dark"
              />
            </div>

            {mode === "login" && (
              <div className="text-right -mt-1">
                <a
                  href="/forgot-password"
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors font-medium"
                >
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-sm font-bold mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </span>
              ) : mode === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Society HomeChef &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
