import { useState, useRef } from "react";
import toast from "react-hot-toast";

export default function OTPInput({ onVerify, loading, label }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const inputs = useRef([]);

  const handleChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    if (val && idx < 3) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0)
      inputs.current[idx - 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (p.length === 4) {
      setDigits(p.split(""));
      inputs.current[3]?.focus();
    }
  };

  const submit = () => {
    const otp = digits.join("");
    if (otp.length !== 4) {
      toast.error("Enter all 4 digits");
      return;
    }
    setDigits(["", "", "", ""]);
    inputs.current[0]?.focus();
    onVerify(otp);
  };

  const full = digits.join("");

  return (
    <div className="text-center">
      <p className="text-sm text-white/55 mb-4 font-medium">
        {label || "Enter the 4-digit OTP"}
      </p>
      <div className="flex items-center justify-center gap-3 mb-5">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={loading}
            className={`w-14 h-14 text-center text-xl font-mono font-bold rounded-xl border-2 bg-white/5 text-white outline-none transition-all disabled:opacity-50 ${
              d
                ? "border-orange-400 bg-orange-500/10"
                : "border-white/15 focus:border-orange-400"
            }`}
          />
        ))}
      </div>
      <button
        onClick={submit}
        disabled={loading || full.length !== 4}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Verifying...
          </span>
        ) : (
          "Verify OTP"
        )}
      </button>
    </div>
  );
}
