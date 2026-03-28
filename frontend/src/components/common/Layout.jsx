import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

const ROLE_LABELS = { chef: "Chef", customer: "Customer", rider: "Rider" };

export default function Layout({ children, tabs, activeTab, onTabChange }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen mesh-bg">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[rgba(10,10,18,0.85)] backdrop-blur-xl border-b border-white/7">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold leading-none">
                S
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="font-display text-white text-base leading-none font-semibold">
                Society HomeChef
              </p>
              <p className="text-[11px] text-white/35 mt-0.5">
                {ROLE_LABELS[user?.role]} Dashboard
              </p>
            </div>
          </div>

          {/* Desktop tabs */}
          {tabs && (
            <div className="hidden md:flex items-center bg-white/5 rounded-xl p-1 gap-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* User menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen((p) => !p)}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/8 border border-white/8 rounded-xl px-3 py-2 transition-all"
            >
              <div className="w-7 h-7 bg-orange-500/20 rounded-full flex items-center justify-center text-sm font-semibold text-orange-400">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-sm text-white/70 hidden sm:block max-w-[110px] truncate font-medium">
                {user?.name}
              </span>
              <svg
                className="w-3.5 h-3.5 text-white/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 glass-card p-2 animate-slide-down z-50 shadow-2xl">
                <div className="px-3 py-2.5 border-b border-white/8 mb-2">
                  <p className="text-sm font-semibold text-white">
                    {user?.name}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile tabs */}
        {tabs && (
          <div className="md:hidden flex border-t border-white/7 overflow-x-auto scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 min-w-max py-2.5 px-4 text-xs font-semibold transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "text-orange-400 border-orange-400"
                    : "text-white/40 border-transparent hover:text-white/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
        {children}
      </main>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
