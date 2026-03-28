import { CUSTOMER_TIMELINE, STATUS_LABELS } from "../../utils/helpers";

export default function OrderTimeline({ status }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
        <span className="text-red-400 text-sm font-semibold">
          Order Cancelled
        </span>
      </div>
    );
  }

  const currentIdx = CUSTOMER_TIMELINE.indexOf(status);

  return (
    <div className="flex items-center w-full py-1">
      {CUSTOMER_TIMELINE.map((s, idx) => {
        const done = idx <= currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={s} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-400 ${
                  active
                    ? "bg-orange-500 ring-2 ring-orange-400 ring-offset-2 ring-offset-[#0a0a12] scale-110"
                    : done
                      ? "bg-orange-600/80"
                      : "bg-white/10"
                }`}
              >
                {done && !active && (
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {active && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span
                className={`text-[10px] mt-1.5 font-semibold whitespace-nowrap leading-none ${
                  active
                    ? "text-orange-400"
                    : done
                      ? "text-white/55"
                      : "text-white/20"
                }`}
              >
                {STATUS_LABELS[s]}
              </span>
            </div>
            {idx < CUSTOMER_TIMELINE.length - 1 && (
              <div
                className={`h-px flex-1 mx-1 rounded-full transition-all duration-400 ${
                  idx < currentIdx ? "bg-orange-500" : "bg-white/10"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
