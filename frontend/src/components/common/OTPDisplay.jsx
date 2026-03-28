import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function OTPDisplay({ otp, label, sublabel, expiresAt }) {
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() =>
    expiresAt
      ? Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
      : null,
  );

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(
      Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)),
    );
    const id = setInterval(() => {
      const left = Math.max(
        0,
        Math.floor((new Date(expiresAt) - Date.now()) / 1000),
      );
      setTimeLeft(left);
      if (left === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const expired = timeLeft === 0;
  const mins = timeLeft !== null ? Math.floor(timeLeft / 60) : null;
  const secs = timeLeft !== null ? timeLeft % 60 : null;

  return (
    <div className="bg-gradient-to-br from-orange-500/12 to-orange-600/4 border border-orange-500/25 rounded-2xl p-6 text-center animate-scale-in">
      <div className="w-10 h-10 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center mx-auto mb-3">
        <svg
          className="w-5 h-5 text-orange-400"
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

      <p className="text-sm font-semibold text-white/80 mb-0.5">{label}</p>
      {sublabel && <p className="text-xs text-white/40 mb-4">{sublabel}</p>}

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="bg-white/8 hover:bg-white/12 border border-white/12 rounded-xl px-8 py-2.5 text-sm font-medium text-white/60 hover:text-white transition-all mb-3"
        >
          Tap to reveal
        </button>
      ) : (
        <div className="mb-3">
          <div className="otp-display text-orange-400 my-2">{otp}</div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(otp);
              toast.success("OTP copied");
            }}
            className="text-xs text-white/35 hover:text-white/55 transition-colors font-medium"
          >
            Copy
          </button>
        </div>
      )}

      {timeLeft !== null && !expired && (
        <p
          className={`text-xs font-medium ${timeLeft < 120 ? "text-red-400 animate-pulse-soft" : "text-white/35"}`}
        >
          Expires in {mins}:{String(secs).padStart(2, "0")}
        </p>
      )}
      {expired && (
        <p className="text-xs text-red-400 font-medium">OTP Expired</p>
      )}
    </div>
  );
}
