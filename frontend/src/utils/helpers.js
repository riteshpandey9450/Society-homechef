// Customer-facing 4-step tracking
export const CUSTOMER_TIMELINE = [
  "PLACED",
  "ASSIGNED",
  "PICKED_UP",
  "DELIVERED",
];

export const STATUS_LABELS = {
  PLACED: "Placed",
  ASSIGNED: "Rider Assigned",
  ACCEPTED: "Rider Accepted",
  PICKED_UP: "Picked Up",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const STATUS_ICONS = {
  PLACED: "📦",
  ASSIGNED: "🏍️",
  ACCEPTED: "✅",
  PICKED_UP: "🛵",
  DELIVERED: "🎉",
  CANCELLED: "❌",
};

export const STATUS_COLORS = {
  PLACED: "status-placed",
  ASSIGNED: "status-assigned",
  ACCEPTED: "status-accepted",
  PICKED_UP: "status-picked_up",
  DELIVERED: "status-delivered",
  CANCELLED: "status-cancelled",
};

export const formatPrice = (price) => `₹${Number(price || 0).toFixed(0)}`;

export const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export const getHealthColor = (score) => {
  if (!score) return "text-white/35";
  if (score >= 8) return "text-green-400";
  if (score >= 5) return "text-yellow-400";
  return "text-red-400";
};

export const getHealthLabel = (score) => {
  if (!score) return "N/A";
  if (score >= 8) return "Excellent";
  if (score >= 6) return "Good";
  if (score >= 4) return "Moderate";
  return "Indulgent";
};
