import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/common/Layout";
import StatusBadge from "../../components/common/StatusBadge";
import OTPInput from "../../components/common/OTPInput";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import toast from "react-hot-toast";
import {
  formatPrice,
  timeAgo,
  formatDate,
  getHealthColor,
} from "../../utils/helpers";

const TABS = [
  { id: "dishes", label: "My Dishes" },
  { id: "add", label: "Add Dish" },
  { id: "orders", label: "Incoming" },
  { id: "history", label: "Completed" },
];

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  quantity: "",
  isVeg: true,
  image: "",
};

export default function ChefDashboard() {
  const [tab, setTab] = useState("dishes");
  const [dishes, setDishes] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingDish, setEditingDish] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [otpModal, setOtpModal] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [filterVeg, setFilterVeg] = useState("all");
  const [imagePreview, setImagePreview] = useState("");
  const { authFetch } = useAuth();
  const { on, off, connected } = useSocket();

  const fetchDishes = useCallback(async () => {
    try {
      const res = await authFetch("/api/chef/dishes");
      const data = await res.json();
      if (data.success) setDishes(data.data);
    } catch {}
  }, [authFetch]);

  const fetchActiveOrders = useCallback(async () => {
    try {
      const res = await authFetch("/api/chef/orders?status=PLACED,ASSIGNED");
      const data = await res.json();
      if (data.success) setActiveOrders(data.data);
    } catch {}
  }, [authFetch]);

  const fetchCompletedOrders = useCallback(async () => {
    try {
      const res = await authFetch(
        "/api/chef/orders?status=PICKED_UP,DELIVERED,CANCELLED",
      );
      const data = await res.json();
      if (data.success) setCompletedOrders(data.data);
    } catch {}
  }, [authFetch]);

  useEffect(() => {
    fetchDishes();
    fetchActiveOrders();
    fetchCompletedOrders();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!connected) return;
    const refresh = () => {
      fetchActiveOrders();
      fetchCompletedOrders();
    };
    on("orderPlaced", refresh);
    on("riderComing", refresh);
    on("orderPickedUp", refresh);
    on("orderDelivered", refresh);
    on("orderCancelled", refresh);
    return () => {
      off("orderPlaced", refresh);
      off("riderComing", refresh);
      off("orderPickedUp", refresh);
      off("orderDelivered", refresh);
      off("orderCancelled", refresh);
    };
  }, [on, off, connected, fetchActiveOrders, fetchCompletedOrders]);

  // ── dish form ─────────────────────────────────────────────────────────────

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((p) => ({ ...p, image: ev.target.result }));
      setImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitDish = async (e) => {
    e.preventDefault();
    if (!form.image) {
      toast.error("Please upload a dish image");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity),
        isVeg: form.isVeg,
        image: form.image,
      };
      const url = editingDish
        ? `/api/chef/dishes/${editingDish._id}`
        : "/api/chef/dishes";
      const res = await authFetch(url, {
        method: editingDish ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success(
        editingDish
          ? "Dish updated"
          : "Dish created — nutrition estimated by AI",
      );
      setForm(EMPTY_FORM);
      setImagePreview("");
      setEditingDish(null);
      fetchDishes();
      setTab("dishes");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDish = (dish) => {
    setForm({
      name: dish.name,
      description: dish.description,
      price: dish.price,
      quantity: dish.quantity,
      isVeg: dish.isVeg,
      image: dish.image,
    });
    setImagePreview(dish.image);
    setEditingDish(dish);
    setTab("add");
  };

  const handleDeleteDish = async (id) => {
    if (!confirm("Delete this dish?")) return;
    try {
      const res = await authFetch(`/api/chef/dishes/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Dish deleted");
      fetchDishes();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleSoldOut = async (dish) => {
    try {
      const res = await authFetch(`/api/chef/dishes/${dish._id}/soldout`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success(data.message);
      fetchDishes();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── OTP verify ────────────────────────────────────────────────────────────

  const handleVerifyPickup = async (otp) => {
    if (!otpModal) return;
    setOtpLoading(true);
    try {
      const res = await authFetch(
        `/api/chef/orders/${otpModal._id}/verify-pickup`,
        {
          method: "POST",
          body: JSON.stringify({ otp }),
        },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Pickup verified. Rider heading to customer.");
      setOtpModal(null);
      fetchActiveOrders();
      fetchCompletedOrders();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const filteredDishes = dishes.filter((d) =>
    filterVeg === "veg" ? d.isVeg : filterVeg === "nonveg" ? !d.isVeg : true,
  );

  const revenue = completedOrders
    .filter((o) => o.status === "DELIVERED")
    .reduce((s, o) => s + (o.totalAmount || 0), 0);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Layout tabs={TABS} activeTab={tab} onTabChange={setTab}>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Dishes", value: dishes.length, color: "text-orange-400" },
          {
            label: "Incoming",
            value: activeOrders.length,
            color: "text-yellow-400",
          },
          {
            label: "Delivered",
            value: completedOrders.filter((o) => o.status === "DELIVERED")
              .length,
            color: "text-green-400",
          },
          {
            label: "Revenue",
            value: formatPrice(revenue),
            color: "text-orange-400",
          },
        ].map((s) => (
          <div key={s.label} className="glass-card p-5 animate-slide-up">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-white/40 mt-0.5 font-medium">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── DISHES ── */}
      {tab === "dishes" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="font-display text-2xl text-white">My Dishes</h2>
            <div className="flex gap-2">
              {[
                ["all", "All"],
                ["veg", "Veg"],
                ["nonveg", "Non-Veg"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setFilterVeg(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    filterVeg === v
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "bg-white/5 border-white/9 text-white/50 hover:border-white/18"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {filteredDishes.length === 0 ? (
            <div className="text-center py-20 glass-card">
              <p className="text-white/40 text-sm mb-4">No dishes yet</p>
              <button onClick={() => setTab("add")} className="btn-primary">
                Add your first dish
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredDishes.map((dish) => (
                <ChefDishCard
                  key={dish._id}
                  dish={dish}
                  onEdit={() => handleEditDish(dish)}
                  onDelete={() => handleDeleteDish(dish._id)}
                  onToggleSoldOut={() => handleToggleSoldOut(dish)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ADD / EDIT DISH ── */}
      {tab === "add" && (
        <div className="max-w-xl mx-auto animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl text-white">
              {editingDish ? "Edit Dish" : "New Dish"}
            </h2>
            {editingDish && (
              <button
                onClick={() => {
                  setEditingDish(null);
                  setForm(EMPTY_FORM);
                  setImagePreview("");
                }}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
            )}
          </div>

          <form
            onSubmit={handleSubmitDish}
            className="glass-card p-6 space-y-5"
          >
            {/* Image */}
            <div>
              <label className="text-xs text-white/45 mb-2 block font-medium">
                Dish Photo <span className="text-orange-400">*</span>
              </label>
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden h-52">
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview("");
                      setForm((p) => ({ ...p, image: "" }));
                    }}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-sm transition-colors"
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
              ) : (
                <label className="flex flex-col items-center justify-center h-52 border-2 border-dashed border-white/14 hover:border-orange-400/50 rounded-xl cursor-pointer transition-colors bg-white/2 hover:bg-orange-500/4 group">
                  <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-orange-500/10 flex items-center justify-center mb-3 transition-colors">
                    <svg
                      className="w-6 h-6 text-white/30 group-hover:text-orange-400 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-white/40 group-hover:text-white/60 font-medium transition-colors">
                    Click to upload
                  </p>
                  <p className="text-xs text-white/25 mt-1">
                    JPG, PNG, WEBP up to 5 MB
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/45 mb-1.5 block font-medium">
                  Name <span className="text-orange-400">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Chicken Biryani"
                  required
                  className="input-dark"
                />
              </div>
              <div>
                <label className="text-xs text-white/45 mb-1.5 block font-medium">
                  Price (₹) <span className="text-orange-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, price: e.target.value }))
                  }
                  placeholder="150"
                  required
                  className="input-dark"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-white/45 mb-1.5 block font-medium">
                Description <span className="text-orange-400">*</span>
                <span className="text-white/25 normal-case font-normal ml-2">
                  — AI uses this for nutrition
                </span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Describe ingredients, cooking style, flavours..."
                required
                rows={3}
                className="input-dark resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/45 mb-1.5 block font-medium">
                  Available Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, quantity: e.target.value }))
                  }
                  placeholder="10"
                  required
                  className="input-dark"
                />
              </div>
              <div>
                <label className="text-xs text-white/45 mb-1.5 block font-medium">
                  Type
                </label>
                <div className="flex gap-2 mt-1">
                  {[
                    { v: true, l: "Veg" },
                    { v: false, l: "Non-Veg" },
                  ].map((opt) => (
                    <button
                      type="button"
                      key={String(opt.v)}
                      onClick={() => setForm((p) => ({ ...p, isVeg: opt.v }))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        form.isVeg === opt.v
                          ? opt.v
                            ? "bg-green-500/18 border-green-500/45 text-green-400"
                            : "bg-red-500/18 border-red-500/45 text-red-400"
                          : "bg-white/4 border-white/9 text-white/40 hover:border-white/18"
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3.5 font-semibold"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {editingDish ? "Updating..." : "Creating..."}
                </span>
              ) : editingDish ? (
                "Update Dish"
              ) : (
                "Create Dish"
              )}
            </button>
          </form>
        </div>
      )}

      {/* ── INCOMING ORDERS ── */}
      {tab === "orders" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl text-white">
              Incoming Orders
            </h2>
            <button
              onClick={fetchActiveOrders}
              className="btn-ghost text-xs px-3 py-2"
            >
              Refresh
            </button>
          </div>
          {activeOrders.length === 0 ? (
            <div className="text-center py-20 glass-card">
              <p className="text-white/40 text-sm">No pending orders</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <ChefOrderCard
                  key={order._id}
                  order={order}
                  onVerify={
                    order.status === "ASSIGNED"
                      ? () => setOtpModal(order)
                      : null
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COMPLETED ── */}
      {tab === "history" && (
        <div className="animate-fade-in">
          <h2 className="font-display text-2xl text-white mb-4">
            Completed Orders
          </h2>
          {completedOrders.length === 0 ? (
            <div className="text-center py-20 glass-card">
              <p className="text-white/40 text-sm">Nothing here yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedOrders.map((order) => (
                <ChefOrderCard key={order._id} order={order} compact />
              ))}
            </div>
          )}
        </div>
      )}

      {/* OTP MODAL */}
      {otpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setOtpModal(null)}
        >
          <div className="glass-card p-6 w-full max-w-sm animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl text-white">
                Verify Pickup OTP
              </h3>
              <button
                onClick={() => setOtpModal(null)}
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
            <div className="bg-white/4 border border-white/8 rounded-xl p-3 mb-4 space-y-1">
              <p className="text-xs text-white/40 font-medium">Order</p>
              <p className="text-sm font-semibold text-white">
                {otpModal.items?.length === 1
                  ? otpModal.items[0].name
                  : `${otpModal.items?.length} items`}
              </p>
              <p className="text-xs text-white/40">
                Customer: {otpModal.customer?.customerName}
              </p>
              {otpModal.rider?.riderName && (
                <p className="text-xs text-orange-400/80">
                  Rider: {otpModal.rider.riderName}
                </p>
              )}
            </div>
            <p className="text-xs text-white/40 text-center mb-5 leading-relaxed">
              Ask the rider to show you their 4-digit pickup OTP and enter it
              below
            </p>
            <OTPInput
              onVerify={handleVerifyPickup}
              loading={otpLoading}
              label="Enter rider's pickup OTP"
            />
          </div>
        </div>
      )}
    </Layout>
  );
}

// ── Chef Dish Card ────────────────────────────────────────────────────────────

function ChefDishCard({ dish, onEdit, onDelete, onToggleSoldOut }) {
  const hc = getHealthColor(dish.healthScore);
  return (
    <div
      className={`glass-card dish-card overflow-hidden flex flex-col ${dish.isSoldOut ? "opacity-60" : ""}`}
    >
      <div className="relative h-44 bg-white/4 overflow-hidden flex-shrink-0">
        {dish.image ? (
          <img
            src={dish.image}
            alt={dish.name}
            className="w-full h-full object-cover transition-transform duration-400 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute top-2.5 left-2.5">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${dish.isVeg ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"}`}
          >
            {dish.isVeg ? "VEG" : "NON-VEG"}
          </span>
        </div>
        {dish.isSoldOut && (
          <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
            <span className="bg-red-500/90 text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wide">
              SOLD OUT
            </span>
          </div>
        )}
        <div className="absolute bottom-2.5 right-2.5">
          <span className="text-orange-300 font-bold text-sm bg-black/50 backdrop-blur-sm rounded-lg px-2 py-0.5">
            {formatPrice(dish.price)}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-white text-sm leading-snug mb-0.5">
          {dish.name}
        </h3>
        <p className="text-xs text-white/30 line-clamp-2 mb-3">
          {dish.description}
        </p>
        {dish.calories && (
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="text-[10px] font-medium bg-white/6 border border-white/8 rounded-md px-2 py-0.5 text-white/50">
              {dish.calories} kcal
            </span>
            <span
              className={`text-[10px] font-medium bg-white/6 border border-white/8 rounded-md px-2 py-0.5 ${hc}`}
            >
              {dish.healthScore}/10
            </span>
            <span className="text-[10px] font-medium bg-white/6 border border-white/8 rounded-md px-2 py-0.5 text-white/50">
              {dish.quantity} left
            </span>
          </div>
        )}
        <div className="flex gap-2 mt-auto">
          <button onClick={onEdit} className="btn-ghost flex-1 text-xs py-2">
            Edit
          </button>
          <button
            onClick={onToggleSoldOut}
            className={`flex-1 text-xs py-2 rounded-xl border font-semibold transition-all ${
              dish.isSoldOut
                ? "bg-green-500/10 border-green-500/25 text-green-400 hover:bg-green-500/18"
                : "bg-orange-500/10 border-orange-500/22 text-orange-400 hover:bg-orange-500/18"
            }`}
          >
            {dish.isSoldOut ? "Set Available" : "Sold Out"}
          </button>
          <button onClick={onDelete} className="btn-danger text-xs py-2 px-3">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Chef Order Card ──────────────────────────────────────────────────────────

function ChefOrderCard({ order, onVerify, compact }) {
  const [expanded, setExpanded] = useState(false);
  const statusNote = {
    PLACED: "Waiting for a rider",
    ASSIGNED: "Rider on the way — verify OTP when they arrive",
    PICKED_UP: "Order picked up by rider",
    DELIVERED: "Delivered to customer",
    CANCELLED: "Cancelled",
  };

  return (
    <div className="glass-card overflow-hidden animate-slide-up">
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {/* Item images */}
          <div className="flex flex-shrink-0">
            {order.items
              ?.slice(0, 2)
              .map((item, idx) =>
                item.image ? (
                  <img
                    key={idx}
                    src={item.image}
                    alt={item.name}
                    className={`w-12 h-12 rounded-xl object-cover border-2 border-[#0a0a12] ${idx > 0 ? "-ml-3" : ""}`}
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
              {order.customer?.customerName}
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

        {statusNote[order.status] && (
          <p
            className={`text-xs px-3 py-1.5 rounded-lg mb-3 ${
              order.status === "ASSIGNED"
                ? "bg-orange-500/10 text-orange-400/80 border border-orange-500/18"
                : "bg-white/4 text-white/35"
            }`}
          >
            {statusNote[order.status]}
          </p>
        )}

        {!compact && onVerify && (
          <button
            onClick={onVerify}
            className="btn-primary w-full text-sm py-2.5 mb-3"
          >
            Enter Pickup OTP from Rider
          </button>
        )}

        {!compact && (
          <>
            <button
              onClick={() => setExpanded((p) => !p)}
              className="btn-ghost w-full text-xs py-2"
            >
              {expanded
                ? "Hide items"
                : `Show all ${order.items?.length} items`}
            </button>
            {expanded && (
              <div className="mt-3 border-t border-white/7 pt-3 space-y-2 animate-slide-down">
                {order.items?.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-white/65">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-white/35 text-xs">
                        x{item.quantity}
                      </span>
                      <span className="text-orange-400 font-semibold text-xs">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-white/7 text-sm">
                  <span className="text-white/45 font-medium">Total</span>
                  <span className="text-orange-400 font-bold">
                    {formatPrice(order.totalAmount)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
