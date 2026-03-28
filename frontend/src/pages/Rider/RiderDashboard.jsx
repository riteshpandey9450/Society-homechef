import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/common/Layout";
import StatusBadge from "../../components/common/StatusBadge";
import OTPDisplay from "../../components/common/OTPDisplay";
import OTPInput from "../../components/common/OTPInput";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import toast from "react-hot-toast";
import { formatPrice, formatDate, timeAgo } from "../../utils/helpers";

const TABS = [
  { id: "available", label: "Available" },
  { id: "active", label: "My Delivery" },
  { id: "history", label: "History" },
  { id: "profile", label: "Profile" },
];

export default function RiderDashboard() {
  const [tab, setTab] = useState("available");
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [pickupOTP, setPickupOTP] = useState(null);
  const [requestingId, setRequestingId] = useState(null);
  const [verifyingDelivery, setVerifyingDelivery] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const { authFetch, user, updateUser } = useAuth();
  const { on, off, connected } = useSocket();

  const fetchAvailableOrders = useCallback(async () => {
    try {
      const res = await authFetch("/api/rider/available-orders");
      const data = await res.json();
      if (data.success) setAvailableOrders(data.data);
    } catch {}
  }, [authFetch]);

  const fetchActiveOrder = useCallback(async () => {
    try {
      const res = await authFetch("/api/rider/active-order");
      const data = await res.json();
      if (data.success) setActiveOrder(data.data);
    } catch {}
  }, [authFetch]);

  const fetchHistoryOrders = useCallback(async () => {
    try {
      const res = await authFetch(
        "/api/rider/orders?status=DELIVERED,CANCELLED",
      );
      const data = await res.json();
      if (data.success) setHistoryOrders(data.data);
    } catch {}
  }, [authFetch]);

  useEffect(() => {
    setIsOnline(user?.isOnline || false);
    fetchAvailableOrders();
    fetchActiveOrder();
    fetchHistoryOrders();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!connected) return;
    const handleNew = () => fetchAvailableOrders();
    const handleUpdate = () => {
      fetchActiveOrder();
      fetchAvailableOrders();
      fetchHistoryOrders();
    };
    const handleApproved = (d) => {
      toast.success(d.message || "Chef confirmed!");
      setPickupOTP(null);
      fetchActiveOrder();
    };
    const handleCancelled = (d) => {
      toast.error(d.message || "Order cancelled");
      fetchAvailableOrders();
      fetchActiveOrder();
      fetchHistoryOrders();
    };
    on("newOrderAvailable", handleNew);
    on("pickupApproved", handleApproved);
    on("orderDelivered", handleUpdate);
    on("orderCancelled", handleCancelled);
    return () => {
      off("newOrderAvailable", handleNew);
      off("pickupApproved", handleApproved);
      off("orderDelivered", handleUpdate);
      off("orderCancelled", handleCancelled);
    };
  }, [
    on,
    off,
    connected,
    fetchAvailableOrders,
    fetchActiveOrder,
    fetchHistoryOrders,
  ]);

  const isLocked =
    isOnline &&
    activeOrder &&
    ["ASSIGNED", "PICKED_UP"].includes(activeOrder?.status);

  const handleToggleOnline = async () => {
    if (isLocked) {
      toast.error("Complete your current delivery before going offline");
      return;
    }
    setTogglingOnline(true);
    try {
      const res = await authFetch("/api/rider/status", {
        method: "PUT",
        body: JSON.stringify({ isOnline: !isOnline }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      const next = data.data.isOnline;
      setIsOnline(next);
      updateUser({ ...user, isOnline: next });
      toast.success(next ? "You are now online" : "You are now offline");
      if (next) fetchAvailableOrders();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleRequestPickup = async (orderId) => {
    setRequestingId(orderId);
    try {
      const res = await authFetch(
        `/api/rider/orders/${orderId}/request-pickup`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPickupOTP(data.data.pickupOTP);
      toast.success("Order assigned! Show the pickup OTP to the chef.");
      fetchAvailableOrders();
      fetchActiveOrder();
      setTab("active");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRequestingId(null);
    }
  };

  const handleVerifyDelivery = async (otp) => {
    if (!activeOrder) return;
    setVerifyingDelivery(true);
    try {
      const res = await authFetch(
        `/api/rider/orders/${activeOrder._id}/verify-delivery`,
        {
          method: "POST",
          body: JSON.stringify({ otp }),
        },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Delivery confirmed! Well done.");
      setShowDeliveryModal(false);
      setActiveOrder(null);
      setPickupOTP(null);
      fetchHistoryOrders();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVerifyingDelivery(false);
    }
  };

  const deliveredCount = historyOrders.filter(
    (o) => o.status === "DELIVERED",
  ).length;
  const earnings = historyOrders
    .filter((o) => o.status === "DELIVERED")
    .reduce((s, o) => s + (o.totalAmount || 0) * 0.2, 0);

  return (
    <Layout
      tabs={TABS}
      activeTab={tab}
      onTabChange={(t) => {
        if (t === "profile") {
          setProfileForm({
            name: user.name,
            address: { ...user.address },
            location: { ...user.location },
          });
          setEditingProfile(false);
        }
        setTab(t);
      }}
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Deliveries", value: deliveredCount, color: "text-white" },
          {
            label: "Active",
            value: activeOrder ? 1 : 0,
            color: "text-yellow-400",
          },
          {
            label: "Earnings",
            value: `₹${earnings.toFixed(0)}`,
            color: "text-orange-400",
          },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-white/40 mt-0.5 font-medium">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Online toggle */}
      <div
        className={`rounded-2xl p-5 border mb-5 transition-all duration-400 ${
          isOnline
            ? "bg-green-500/8 border-green-500/25"
            : "bg-white/4 border-white/8"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-white text-base mb-0.5">
              {isOnline ? "Online" : "Offline"}
            </p>
            <p className="text-xs text-white/45">
              {isLocked
                ? "Complete delivery before going offline"
                : isOnline
                  ? "Visible to customers and accepting orders"
                  : "Go online to receive delivery orders"}
            </p>
          </div>
          <button
            onClick={handleToggleOnline}
            disabled={togglingOnline || isLocked}
            className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none flex-shrink-0 ${
              isOnline ? "bg-green-500" : "bg-white/18"
            } ${togglingOnline || isLocked ? "opacity-45 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                isOnline ? "left-7" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── AVAILABLE ── */}
      {tab === "available" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl text-white">
              Available Orders
            </h2>
            <button
              onClick={fetchAvailableOrders}
              className="btn-ghost text-xs px-3 py-2"
            >
              Refresh
            </button>
          </div>

          {!isOnline && (
            <div className="glass-card p-8 text-center">
              <p className="text-white/40 text-sm">
                Go online to see available orders
              </p>
            </div>
          )}
          {isOnline && availableOrders.length === 0 && (
            <div className="glass-card p-10 text-center">
              <p className="text-white/40 text-sm animate-bounce-gentle">
                Waiting for orders...
              </p>
            </div>
          )}
          {isOnline && availableOrders.length > 0 && (
            <div className="space-y-4">
              {availableOrders.map((order) => (
                <AvailableOrderCard
                  key={order._id}
                  order={order}
                  onPickup={() => handleRequestPickup(order._id)}
                  loading={requestingId === order._id}
                  hasActive={!!activeOrder}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVE DELIVERY ── */}
      {tab === "active" && (
        <div className="animate-fade-in">
          <h2 className="font-display text-2xl text-white mb-4">My Delivery</h2>
          {!activeOrder ? (
            <div className="glass-card p-10 text-center">
              <p className="text-white/40 text-sm mb-3">No active delivery</p>
              <button
                onClick={() => setTab("available")}
                className="btn-ghost text-sm"
              >
                Browse Available
              </button>
            </div>
          ) : (
            <ActiveDeliveryCard
              order={activeOrder}
              pickupOTP={pickupOTP}
              onVerifyDelivery={() => setShowDeliveryModal(true)}
            />
          )}
        </div>
      )}

      {/* ── HISTORY ── */}
      {tab === "history" && (
        <div className="animate-fade-in">
          <h2 className="font-display text-2xl text-white mb-4">History</h2>
          {historyOrders.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <p className="text-white/40 text-sm">No deliveries yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyOrders.map((o) => (
                <div key={o._id} className="glass-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {o.items?.length === 1
                          ? o.items[0].name
                          : `${o.items?.length} items`}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {o.customer?.customerName} · {timeAgo(o.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <StatusBadge status={o.status} />
                      {o.status === "DELIVERED" && (
                        <span className="text-xs text-green-400 font-semibold">
                          +₹{((o.totalAmount || 0) * 0.2).toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PROFILE ── */}
      {tab === "profile" && (
        <div className="max-w-lg mx-auto animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl text-white">Profile</h2>
            <button
              onClick={() => setEditingProfile((p) => !p)}
              className="btn-ghost text-sm"
            >
              {editingProfile ? "Cancel" : "Edit"}
            </button>
          </div>
          {!editingProfile ? (
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-white/8">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2 ${
                    isOnline
                      ? "bg-green-500/15 text-green-400 border-green-500/35"
                      : "bg-white/8 text-white/55 border-white/10"
                  }`}
                >
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-display text-xl text-white">
                    {user?.name}
                  </p>
                  <p className="text-sm text-white/40">{user?.email}</p>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border mt-1 inline-block ${
                      isOnline
                        ? "bg-green-500/12 text-green-400 border-green-500/20"
                        : "bg-white/6 text-white/40 border-white/10"
                    }`}
                  >
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/4 rounded-xl p-3">
                  <p className="text-lg font-bold text-white">
                    {deliveredCount}
                  </p>
                  <p className="text-xs text-white/40 font-medium">
                    Deliveries
                  </p>
                </div>
                <div className="bg-white/4 rounded-xl p-3">
                  <p className="text-lg font-bold text-orange-400">
                    ₹{earnings.toFixed(0)}
                  </p>
                  <p className="text-xs text-white/40 font-medium">Earned</p>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSavingProfile(true);
                try {
                  const res = await authFetch("/api/rider/profile", {
                    method: "PUT",
                    body: JSON.stringify(profileForm),
                  });
                  const data = await res.json();
                  if (!data.success) throw new Error(data.message);
                  updateUser(data.data);
                  toast.success("Profile updated!");
                  setEditingProfile(false);
                } catch (err) {
                  toast.error(err.message);
                } finally {
                  setSavingProfile(false);
                }
              }}
              className="glass-card p-6 space-y-4"
            >
              <div>
                <label className="text-xs text-white/45 mb-1.5 block font-medium">
                  Name
                </label>
                <input
                  value={profileForm.name || ""}
                  onChange={(e) =>
                    setProfileForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="input-dark"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-white/45 block font-medium">
                  Address
                </label>
                {["flat", "street", "landmark"].map((f) => (
                  <input
                    key={f}
                    placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                    value={profileForm.address?.[f] || ""}
                    onChange={(e) =>
                      setProfileForm((p) => ({
                        ...p,
                        address: { ...p.address, [f]: e.target.value },
                      }))
                    }
                    className="input-dark"
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="btn-primary w-full"
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Delivery OTP modal */}
      {showDeliveryModal && activeOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={(e) =>
            e.target === e.currentTarget && setShowDeliveryModal(false)
          }
        >
          <div className="glass-card p-6 w-full max-w-sm animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl text-white">
                Confirm Delivery
              </h3>
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="bg-white/4 border border-white/8 rounded-xl p-3 mb-5">
              <p className="text-xs text-white/40 font-medium">Delivering</p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {activeOrder.items?.length === 1
                  ? activeOrder.items[0].name
                  : `${activeOrder.items?.length} items`}
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                to {activeOrder.customer?.customerName}
              </p>
            </div>
            <p className="text-xs text-white/40 text-center mb-5">
              Ask the customer for their 4-digit delivery OTP
            </p>
            <OTPInput
              onVerify={handleVerifyDelivery}
              loading={verifyingDelivery}
              label="Enter customer's delivery OTP"
            />
          </div>
        </div>
      )}
    </Layout>
  );
}

// ── Available Order Card ────────────────────────────────────────────────────

function AvailableOrderCard({ order, onPickup, loading, hasActive }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="glass-card overflow-hidden animate-slide-up border border-orange-500/8 hover:border-orange-500/20 transition-colors">
      <div className="p-4">
        <div className="flex gap-3 mb-3">
          <div className="flex flex-shrink-0">
            {order.items
              ?.slice(0, 2)
              .map((item, idx) =>
                item.image ? (
                  <img
                    key={idx}
                    src={item.image}
                    alt={item.name}
                    className={`w-14 h-14 rounded-xl object-cover border-2 border-[#0a0a12] ${idx > 0 ? "-ml-4" : ""}`}
                  />
                ) : null,
              )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm">
              {order.items?.length === 1
                ? order.items[0].name
                : `${order.items?.length} items`}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              From {order.chef?.chefName}
            </p>
            <p className="text-xs text-white/25 mt-0.5">
              {[
                order.chef?.chefAddress?.street,
                order.chef?.chefAddress?.landmark,
              ]
                .filter(Boolean)
                .join(", ") || "Chef location"}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-orange-400 font-bold">
              {formatPrice(order.totalAmount)}
            </p>
            <p className="text-xs text-white/35 mt-0.5">
              {order.totalItems} item{order.totalItems !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="text-xs text-white/30 mb-3">
          Deliver to:{" "}
          {[
            order.customer?.customerAddress?.street,
            order.customer?.customerAddress?.landmark,
          ]
            .filter(Boolean)
            .join(", ") || "Customer address"}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setExpanded((p) => !p)}
            className="btn-ghost flex-1 text-xs py-2"
          >
            {expanded ? "Hide items" : "View items"}
          </button>
          <button
            onClick={onPickup}
            disabled={loading || hasActive}
            className="btn-primary flex-1 text-xs py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={hasActive ? "Complete current delivery first" : ""}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-1.5">
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : hasActive ? (
              "Busy"
            ) : (
              "Accept & Get OTP"
            )}
          </button>
        </div>

        {expanded && (
          <div className="mt-3 border-t border-white/7 pt-3 space-y-2 animate-slide-down">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-white/55">{item.name}</span>
                <div className="flex gap-3">
                  <span className="text-white/30">x{item.quantity}</span>
                  <span className="text-orange-400 font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Active Delivery Card ────────────────────────────────────────────────────

function ActiveDeliveryCard({ order, pickupOTP, onVerifyDelivery }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="glass-card overflow-hidden border border-orange-500/18">
        <div className="bg-orange-500/8 border-b border-orange-500/15 px-4 py-2.5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
            Active Delivery
          </span>
          <StatusBadge status={order.status} size="sm" />
        </div>
        <div className="p-4">
          <div className="flex gap-3 mb-4">
            <div className="flex flex-shrink-0">
              {order.items
                ?.slice(0, 2)
                .map((item, idx) =>
                  item.image ? (
                    <img
                      key={idx}
                      src={item.image}
                      alt={item.name}
                      className={`w-14 h-14 rounded-xl object-cover border-2 border-[#0a0a12] ${idx > 0 ? "-ml-4" : ""}`}
                    />
                  ) : null,
                )}
            </div>
            <div>
              <p className="font-semibold text-white text-sm">
                {order.items?.length === 1
                  ? order.items[0].name
                  : `${order.items?.length} items`}
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                Chef: {order.chef?.chefName}
              </p>
              <p className="text-xs text-white/40">
                Customer: {order.customer?.customerName}
              </p>
              <p className="text-orange-400 font-bold text-sm mt-1">
                {formatPrice(order.totalAmount)}
              </p>
            </div>
          </div>

          {/* Items list */}
          <div className="bg-white/3 rounded-xl p-3 mb-4 space-y-1.5">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-white/55">{item.name}</span>
                <span className="text-white/35">
                  x{item.quantity} · {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="bg-white/4 rounded-xl p-3 text-xs">
              <p className="text-white/40 mb-1 font-medium">
                Pickup from (Chef)
              </p>
              <p className="text-white/65 leading-relaxed">
                {[
                  order.chef?.chefAddress?.flat,
                  order.chef?.chefAddress?.street,
                  order.chef?.chefAddress?.landmark,
                ]
                  .filter(Boolean)
                  .join(", ") || "N/A"}
              </p>
            </div>
            <div className="bg-white/4 rounded-xl p-3 text-xs">
              <p className="text-white/40 mb-1 font-medium">
                Deliver to (Customer)
              </p>
              <p className="text-white/65 leading-relaxed">
                {[
                  order.customer?.customerAddress?.flat,
                  order.customer?.customerAddress?.street,
                  order.customer?.customerAddress?.landmark,
                ]
                  .filter(Boolean)
                  .join(", ") || "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: Show pickup OTP to chef */}
      {order.status === "ASSIGNED" && (pickupOTP || order.pickupOTPPlain) && (
        <div>
          <p className="text-xs text-white/40 text-center mb-2 font-medium">
            Step 1 of 2 — Show this OTP to the chef
          </p>
          <OTPDisplay
            otp={pickupOTP || order.pickupOTPPlain}
            label="Pickup OTP"
            sublabel="Show to chef — they will verify it to confirm handover"
            expiresAt={order.pickupOTP?.expiresAt}
          />
        </div>
      )}

      {/* Step 2: Enter customer's delivery OTP */}
      {order.status === "PICKED_UP" && (
        <div>
          <p className="text-xs text-white/40 text-center mb-2 font-medium">
            Step 2 of 2 - Enter customer's OTP to confirm delivery
          </p>
          <div className="glass-card p-5 border border-green-500/18">
            <p className="text-sm text-white/55 text-center mb-4">
              Ask the customer to show you their delivery OTP
            </p>
            <button onClick={onVerifyDelivery} className="btn-primary w-full">
              Enter Customer OTP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
