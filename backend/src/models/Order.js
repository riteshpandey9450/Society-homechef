const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    dishId: { type: mongoose.Schema.Types.ObjectId, ref: "Dish" },
    name: String,
    image: String,
    description: String,
    price: Number,
    quantity: { type: Number, default: 1 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema({
  // Multi-item: replaces the old single `dish` field
  items: [orderItemSchema],

  // Chef snapshot (all items belong to ONE chef)
  chef: {
    chefId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    chefName: String,
    chefAddress: { flat: String, street: String, landmark: String },
  },

  // Customer snapshot
  customer: {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customerName: String,
    customerAddress: { flat: String, street: String, landmark: String },
    customerLocation: { latitude: Number, longitude: Number },
  },

  // Rider snapshot
  rider: {
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    riderName: { type: String, default: null },
  },

  status: {
    type: String,
    enum: [
      "PLACED",
      "ASSIGNED",
      "ACCEPTED",
      "PICKED_UP",
      "DELIVERED",
      "CANCELLED",
    ],
    default: "PLACED",
  },

  totalAmount: { type: Number, default: 0 },
  totalItems: { type: Number, default: 0 },

  // Pickup OTP — chef verifies (rider shows it)
  pickupOTP: {
    hash: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    used: { type: Boolean, default: false },
  },

  // Delivery OTP — rider verifies (customer shows it)
  deliveryOTP: {
    hash: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    used: { type: Boolean, default: false },
  },

  // Plaintext OTPs for UI display (cleared after use)
  pickupOTPPlain: { type: String, default: null },
  deliveryOTPPlain: { type: String, default: null },

  statusHistory: [
    {
      status: String,
      timestamp: { type: Date, default: Date.now },
      note: String,
    },
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

orderSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Order", orderSchema);
