import { useState, useEffect, useCallback, useRef } from "react";
import Layout from "../../components/common/Layout";
import StatusBadge from "../../components/common/StatusBadge";
import OrderTimeline from "../../components/common/OrderTimeline";
import OTPDisplay from "../../components/common/OTPDisplay";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { useCart } from "../../contexts/CartContext";
import toast from "react-hot-toast";
import {
  formatPrice,
  formatDate,
  timeAgo,
  getHealthColor,
  CUSTOMER_TIMELINE,
  STATUS_LABELS,
} from "../../utils/helpers";

const TABS = [
  { id: "browse", label: "Browse" },
  { id: "cart", label: "Cart" },
  { id: "orders", label: "My Orders" },
  { id: "profile", label: "Profile" },
];

export default function CustomerDashboard() {
  const [tab, setTab] = useState("browse");
  const [dishes, setDishes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [filters, setFilters] = useState({
    isVeg: "",
    search: "",
    maxCalories: "",
    minHealthScore: "",
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const { authFetch, user, updateUser } = useAuth();
  const { on, off, connected } = useSocket();
  const {
    items: cartItems,
    totalItems,
    totalAmount,
    cartChefId,
    cartChefName,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemQuantity,
  } = useCart();

  // ── data fetchers ─────────────────────────────────────────────────────────

  const fetchDishes = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filters.isVeg !== "") p.append("isVeg", filters.isVeg);
      if (filters.search) p.append("search", filters.search);
      if (filters.maxCalories) p.append("maxCalories", filters.maxCalories);
      if (filters.minHealthScore)
        p.append("minHealthScore", filters.minHealthScore);
      const res = await authFetch(`/api/customer/dishes?${p}`);
      const data = await res.json();
      if (data.success) setDishes(data.data);
    } catch {
      toast.error("Failed to load dishes");
    } finally {
      setLoading(false);
    }
  }, [authFetch, filters]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await authFetch("/api/customer/orders");
      const data = await res.json();
      if (data.success) setOrders(data.data);
    } catch {}
  }, [authFetch]);

  useEffect(() => {
    fetchDishes();
  }, [filters.isVeg, filters.minHealthScore, filters.maxCalories]); // eslint-disable-line
  useEffect(() => {
    fetchOrders();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!connected) return;
    const refresh = () => fetchOrders();
    on("orderAssigned", refresh);
    on("orderPickedUp", refresh);
    on("orderDelivered", refresh);
    on("orderCancelled", refresh);
    return () => {
      off("orderAssigned", refresh);
      off("orderPickedUp", refresh);
      off("orderDelivered", refresh);
      off("orderCancelled", refresh);
    };
  }, [on, off, connected, fetchOrders]);

  // ── place order from cart ─────────────────────────────────────────────────

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setPlacingOrder(true);
    try {
      const body = {
        items: cartItems.map((i) => ({
          dishId: i.dishId,
          quantity: i.quantity,
        })),
      };
      const res = await authFetch("/api/customer/orders", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Order placed! A rider will pick it up soon.");
      clearCart();
      fetchOrders();
      setTab("orders");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm("Cancel this order?")) return;
    try {
      const res = await authFetch(`/api/customer/orders/${orderId}/cancel`, {
        method: "PUT",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Order cancelled");
      fetchOrders();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await authFetch("/api/customer/profile", {
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
  };

  const openProfile = () => {
    setProfileForm({
      name: user.name,
      address: { ...user.address },
      location: { ...user.location },
    });
    setEditingProfile(false);
    setTab("profile");
  };

  const activeOrderCount = orders.filter(
    (o) => !["DELIVERED", "CANCELLED"].includes(o.status),
  ).length;

  // ── tabs with badges ──────────────────────────────────────────────────────

  const tabsWithBadge = TABS.map((t) => {
    if (t.id === "cart" && totalItems > 0) return { ...t, badge: totalItems };
    if (t.id === "orders" && activeOrderCount > 0)
      return { ...t, badge: activeOrderCount };
    return t;
  });

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Layout
      tabs={tabsWithBadge}
      activeTab={tab}
      onTabChange={(t) => {
        if (t === "profile") openProfile();
        else setTab(t);
      }}
    >
      {/* ── BROWSE ── */}
      {tab === "browse" && (
        <div className="animate-fade-in">
          {/* Hero */}
          <div className="glass-card px-6 py-8 mb-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/8 to-transparent pointer-events-none" />
            <h1 className="font-display text-3xl md:text-4xl text-white mb-2 relative">
              What are you craving today?
            </h1>
            <p className="text-white/45 text-sm mb-5 relative">
              Homemade meals from your society's home chefs — fresh, local,
              delicious.
            </p>
            <div className="flex gap-3 relative">
              <div className="flex-1 relative">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, search: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && fetchDishes()}
                  placeholder="Search by dish name or ingredient..."
                  className="input-dark pl-10 w-full"
                />
              </div>
              <button
                onClick={fetchDishes}
                className="btn-primary px-5 flex-shrink-0"
              >
                Search
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { label: "All", val: "", type: "veg" },
              { label: "Veg", val: "true", type: "veg" },
              { label: "Non-Veg", val: "false", type: "veg" },
            ].map((f) => (
              <button
                key={f.val}
                onClick={() => setFilters((p) => ({ ...p, isVeg: f.val }))}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                  filters.isVeg === f.val
                    ? "bg-orange-500 border-orange-500 text-white"
                    : "bg-white/4 border-white/9 text-white/55 hover:border-white/18 hover:text-white/80"
                }`}
              >
                {f.label}
              </button>
            ))}
            <button
              onClick={() =>
                setFilters((p) => ({
                  ...p,
                  minHealthScore: p.minHealthScore ? "" : "7",
                }))
              }
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                filters.minHealthScore
                  ? "bg-green-500/80 border-green-500/80 text-white"
                  : "bg-white/4 border-white/9 text-white/55 hover:border-white/18"
              }`}
            >
              Healthy (7+)
            </button>
            <button
              onClick={() =>
                setFilters((p) => ({
                  ...p,
                  maxCalories: p.maxCalories ? "" : "400",
                }))
              }
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                filters.maxCalories
                  ? "bg-blue-500/80 border-blue-500/80 text-white"
                  : "bg-white/4 border-white/9 text-white/55 hover:border-white/18"
              }`}
            >
              Low Calorie (&lt;400)
            </button>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="glass-card h-72 shimmer rounded-2xl" />
              ))}
            </div>
          ) : dishes.length === 0 ? (
            <div className="text-center py-20 glass-card">
              <p className="text-white/40 text-sm">
                No dishes found. Try different filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {dishes.map((dish) => (
                <DishCard
                  key={dish._id}
                  dish={dish}
                  cartQty={getItemQuantity(dish._id)}
                  cartChefId={cartChefId}
                  onAdd={() => {
                    const ok = addItem(dish);
                    if (ok) toast.success(`${dish.name} added to cart`);
                  }}
                  onIncrease={() =>
                    updateQuantity(
                      dish._id.toString(),
                      getItemQuantity(dish._id) + 1,
                    )
                  }
                  onDecrease={() =>
                    updateQuantity(
                      dish._id.toString(),
                      getItemQuantity(dish._id) - 1,
                    )
                  }
                />
              ))}
            </div>
          )}

          {/* Floating cart bar */}
          {totalItems > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
              <button
                onClick={() => setTab("cart")}
                className="flex items-center gap-4 bg-orange-500 hover:bg-orange-400 text-white rounded-2xl px-6 py-4 shadow-2xl shadow-orange-500/40 transition-all hover:scale-105 active:scale-95 font-semibold"
              >
                <span className="bg-white/20 rounded-xl px-2.5 py-0.5 text-sm font-bold">
                  {totalItems}
                </span>
                <span>View Cart</span>
                <span className="ml-2 font-bold">
                  {formatPrice(totalAmount)}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CART ── */}
      {tab === "cart" && (
        <div className="animate-fade-in max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl text-white">Your Cart</h2>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
              >
                Clear cart
              </button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-20 glass-card">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-white/20"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-white/40 text-sm mb-4">Your cart is empty</p>
              <button onClick={() => setTab("browse")} className="btn-primary">
                Browse Dishes
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Chef info banner */}
              <div className="glass-card px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-400 font-bold text-sm">
                    {cartChefName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-white/40 leading-none">
                    Ordering from
                  </p>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {cartChefName}
                  </p>
                </div>
              </div>

              {/* Cart items */}
              {cartItems.map((item) => (
                <div
                  key={item.dishId}
                  className="glass-card p-4 flex items-center gap-4"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">
                      {item.name}
                    </p>
                    <p className="text-orange-400 font-bold text-sm mt-0.5">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        updateQuantity(item.dishId, item.quantity - 1)
                      }
                      className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/14 border border-white/10 text-white font-bold text-lg leading-none transition-all flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-white text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.dishId, item.quantity + 1)
                      }
                      className="w-8 h-8 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/25 text-orange-400 font-bold text-lg leading-none transition-all flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-white/70 font-bold text-sm w-16 text-right flex-shrink-0">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                  <button
                    onClick={() => removeItem(item.dishId)}
                    className="ml-1 flex-shrink-0 text-white/25 hover:text-red-400 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
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
              ))}

              {/* Summary */}
              <div className="glass-card p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">
                    Subtotal ({totalItems} items)
                  </span>
                  <span className="text-white font-semibold">
                    {formatPrice(totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-white/8 pt-3">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-orange-400 font-bold text-lg">
                    {formatPrice(totalAmount)}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="btn-primary w-full py-4 text-base font-bold"
              >
                {placingOrder ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Placing order...
                  </span>
                ) : (
                  `Place Order — ${formatPrice(totalAmount)}`
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ORDERS ── */}
      {tab === "orders" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl text-white">My Orders</h2>
            <button
              onClick={fetchOrders}
              className="btn-ghost text-xs px-3 py-2"
            >
              Refresh
            </button>
          </div>
          {orders.length === 0 ? (
            <div className="text-center py-20 glass-card">
              <p className="text-white/40 text-sm mb-4">No orders yet</p>
              <button onClick={() => setTab("browse")} className="btn-primary">
                Browse Dishes
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <CustomerOrderCard
                  key={order._id}
                  order={order}
                  onCancel={() => handleCancelOrder(order._id)}
                />
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
                <div className="w-14 h-14 bg-orange-500/15 rounded-full flex items-center justify-center text-xl font-bold text-orange-400">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-display text-xl text-white">
                    {user?.name}
                  </p>
                  <p className="text-sm text-white/40">{user?.email}</p>
                  <span className="text-xs bg-orange-500/12 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-medium">
                    Customer
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1 font-medium uppercase tracking-wide">
                  Delivery Address
                </p>
                <p className="text-sm text-white/65">
                  {[
                    user?.address?.flat,
                    user?.address?.street,
                    user?.address?.landmark,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Not set"}
                </p>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSaveProfile}
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
    </Layout>
  );
}

// ── Dish Card ────────────────────────────────────────────────────────────────

function DishCard({
  dish,
  cartQty,
  cartChefId,
  onAdd,
  onIncrease,
  onDecrease,
}) {
  const hc = getHealthColor(dish.healthScore);
  const fromDiffChef = cartChefId && cartChefId !== dish.chefId?.toString();

  return (
    <div
      className={`glass-card dish-card overflow-hidden flex flex-col ${fromDiffChef ? "opacity-50" : ""}`}
    >
      {/* Image area */}
      <div className="relative h-44 bg-white/4 overflow-hidden flex-shrink-0">
        {dish.image ? (
          <img
            src={dish.image}
            alt={dish.name}
            className="w-full h-full object-cover transition-transform duration-400 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
            <svg
              className="w-12 h-12 text-white/15"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Tags */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${dish.isVeg ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"}`}
          >
            {dish.isVeg ? "VEG" : "NON-VEG"}
          </span>
        </div>
        {dish.healthScore >= 7 && (
          <div className="absolute top-2.5 right-2.5">
            <span className="text-[10px] font-bold bg-green-500/90 text-white px-2 py-0.5 rounded-md">
              HEALTHY
            </span>
          </div>
        )}

        {/* Price overlay */}
        <div className="absolute bottom-2.5 right-2.5">
          <span className="text-orange-300 font-bold text-base bg-black/50 backdrop-blur-sm rounded-lg px-2 py-0.5">
            {formatPrice(dish.price)}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-white text-sm leading-snug mb-0.5">
          {dish.name}
        </h3>
        <p className="text-xs text-white/40 mb-2">by {dish.chefName}</p>
        <p className="text-xs text-white/30 line-clamp-2 mb-3 leading-relaxed">
          {dish.description}
        </p>

        {dish.calories && (
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] text-white/35">
              {dish.calories} kcal
            </span>
            <span className={`text-[11px] font-semibold ${hc}`}>
              {dish.healthScore}/10 health
            </span>
          </div>
        )}

        <div className="mt-auto">
          {cartQty === 0 ? (
            <button
              onClick={onAdd}
              disabled={fromDiffChef}
              title={
                fromDiffChef ? `Clear cart to order from ${dish.chefName}` : ""
              }
              className="btn-primary w-full text-sm py-2.5 disabled:opacity-40"
            >
              Add to Cart
            </button>
          ) : (
            <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/25 rounded-xl px-3 py-2">
              <button
                onClick={onDecrease}
                className="w-7 h-7 rounded-lg bg-orange-500/20 hover:bg-orange-500/35 text-white font-bold text-base flex items-center justify-center transition-all"
              >
                -
              </button>
              <span className="font-bold text-white text-sm">
                {cartQty} in cart
              </span>
              <button
                onClick={onIncrease}
                className="w-7 h-7 rounded-lg bg-orange-500/20 hover:bg-orange-500/35 text-white font-bold text-base flex items-center justify-center transition-all"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Customer Order Card ──────────────────────────────────────────────────────

function CustomerOrderCard({ order, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const canCancel = ["PLACED", "ASSIGNED"].includes(order.status);
  const showDeliveryOTP =
    ["ASSIGNED", "PICKED_UP"].includes(order.status) && order.deliveryOTPPlain;

  // Primary image is the first item's image
  const primaryImg = order.items?.[0]?.image;

  return (
    <div
      className={`glass-card overflow-hidden animate-slide-up ${
        order.status === "DELIVERED"
          ? "border border-green-500/18"
          : order.status === "CANCELLED"
            ? "border border-red-500/18 opacity-65"
            : order.status === "PICKED_UP"
              ? "border border-purple-500/18"
              : order.status === "ASSIGNED"
                ? "border border-orange-500/15"
                : ""
      }`}
    >
      {/* Header band */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3 mb-3">
          {/* Stacked item images */}
          <div className="flex flex-shrink-0">
            {order.items
              ?.slice(0, 2)
              .map((item, idx) =>
                item.image ? (
                  <img
                    key={idx}
                    src={item.image}
                    alt={item.name}
                    className={`w-12 h-12 rounded-xl object-cover border-2 border-[#0a0a12] ${idx > 0 ? "-ml-4" : ""}`}
                    style={{ zIndex: 2 - idx }}
                  />
                ) : null,
              )}
            {(order.items?.length || 0) > 2 && (
              <div className="w-12 h-12 rounded-xl bg-white/8 border-2 border-[#0a0a12] -ml-4 flex items-center justify-center z-0">
                <span className="text-xs font-bold text-white/60">
                  +{order.items.length - 2}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm leading-snug">
              {order.items?.length === 1
                ? order.items[0].name
                : `${order.items?.length} items from ${order.chef?.chefName}`}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              {order.chef?.chefName}
              {order.rider?.riderName && ` · ${order.rider.riderName}`}
            </p>
            <p className="text-xs text-white/25 mt-0.5">
              {timeAgo(order.createdAt)}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <StatusBadge status={order.status} />
            <span className="text-orange-400 font-bold text-sm">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Timeline */}
        {order.status !== "CANCELLED" && (
          <div className="overflow-x-auto mb-3">
            <OrderTimeline status={order.status} />
          </div>
        )}

        {/* Delivery OTP */}
        {showDeliveryOTP && (
          <div className="mb-3">
            <OTPDisplay
              otp={order.deliveryOTPPlain}
              label="Your Delivery OTP"
              sublabel="Show this to the rider when they arrive"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex-1 text-xs btn-ghost py-2"
          >
            {expanded ? "Hide details" : "View details"}
          </button>
          {canCancel && (
            <button onClick={onCancel} className="text-xs btn-danger py-2 px-4">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/7 px-4 py-4 space-y-3 animate-slide-down bg-white/2">
          {/* Items breakdown */}
          <div>
            <p className="text-xs text-white/40 font-medium uppercase tracking-wide mb-2">
              Items
            </p>
            <div className="space-y-2">
              {order.items?.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-white/70">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-white/40 text-xs">
                      x{item.quantity}
                    </span>
                    <span className="text-orange-400 font-semibold">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm border-t border-white/7 pt-2 mt-2">
              <span className="text-white/50 font-medium">Total</span>
              <span className="text-orange-400 font-bold">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs text-white/40 font-medium uppercase tracking-wide mb-1">
              Ordered
            </p>
            <p className="text-xs text-white/55">
              {formatDate(order.createdAt)}
            </p>
          </div>

          {order.statusHistory?.length > 0 && (
            <div>
              <p className="text-xs text-white/40 font-medium uppercase tracking-wide mb-2">
                Timeline
              </p>
              <div className="space-y-1">
                {[...order.statusHistory]
                  .reverse()
                  .slice(0, 5)
                  .map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500/60 flex-shrink-0" />
                      <span className="font-semibold text-white/55">
                        {STATUS_LABELS[h.status] || h.status}
                      </span>
                      <span className="text-white/25">
                        {timeAgo(h.timestamp)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
