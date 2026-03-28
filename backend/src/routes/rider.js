const express = require("express");
const router = express.Router();
const { verifyRider } = require("../middleware/auth");
const Order = require("../models/Order");
const User = require("../models/User");
const { generateOrderOTPs, verifyOTP } = require("../utils/otp");
const { emitToUser } = require("../socket");

// PUT /api/rider/status

router.put("/status", verifyRider, async (req, res) => {
  try {
    const { isOnline } = req.body;
    if (!isOnline) {
      const active = await Order.findOne({
        "rider.riderId": req.user._id,
        status: { $in: ["ASSIGNED", "PICKED_UP"] },
      });
      if (active) {
        return res.status(400).json({
          success: false,
          message: "Complete your current delivery before going offline.",
          data: { hasActiveOrder: true },
        });
      }
    }
    const rider = await User.findByIdAndUpdate(
      req.user._id,
      { isOnline },
      { new: true },
    );
    res.json({
      success: true,
      message: `You are now ${isOnline ? "online" : "offline"}`,
      data: { isOnline: rider.isOnline },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// GET /api/rider/available-orders

router.get("/available-orders", verifyRider, async (req, res) => {
  try {
    const orders = await Order.find({ status: "PLACED" }).sort({
      createdAt: -1,
    });
    res.json({
      success: true,
      message: "Available orders fetched",
      data: orders,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// GET /api/rider/orders
router.get("/orders", verifyRider, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { "rider.riderId": req.user._id };
    if (status) {
      const arr = status
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      filter.status = arr.length === 1 ? arr[0] : { $in: arr };
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, message: "Orders fetched", data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// POST /api/rider/orders/:id/request-pickup

router.post("/orders/:id/request-pickup", verifyRider, async (req, res) => {
  try {
    // Step 1: Atomically self-assign — only succeeds if order is still PLACED
    // Use explicit $set to avoid any mixing ambiguity in Mongoose
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, status: "PLACED", "rider.riderId": null },
      {
        $set: {
          status: "ASSIGNED",
          "rider.riderId": req.user._id,
          "rider.riderName": req.user.name,
        },
        $push: {
          statusHistory: {
            status: "ASSIGNED",
            note: `Rider ${req.user.name} accepted the order`,
          },
        },
      },
      { new: true },
    );

    if (!order) {
      return res.status(409).json({
        success: false,
        message:
          "Order is no longer available — another rider may have taken it.",
        data: null,
      });
    }

    // Step 2: Generate both OTPs
    const { pickupPlain, pickupHash, deliveryPlain, deliveryHash } =
      await generateOrderOTPs();

    // Step 3: Store OTPs via a SEPARATE findByIdAndUpdate — never touch the document
    //         returned from step 1 to avoid any save() dirty-tracking issues.
    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          pickupOTP: {
            hash: pickupHash,
            expiresAt: null,
            attempts: 0,
            used: false,
          },
          pickupOTPPlain: pickupPlain,
          deliveryOTP: {
            hash: deliveryHash,
            expiresAt: null,
            attempts: 0,
            used: false,
          },
          deliveryOTPPlain: deliveryPlain,
        },
      },
      { new: true },
    );

    // Notify customer — they receive deliveryOTPPlain to show the rider later
    emitToUser(order.customer.customerId.toString(), "orderAssigned", {
      orderId: order._id,
      riderName: req.user.name,
      deliveryOTPPlain: deliveryPlain,
      message: `${req.user.name} is on the way to pick up your order!`,
    });

    // Notify chef
    emitToUser(order.chef.chefId.toString(), "riderComing", {
      orderId: order._id,
      riderName: req.user.name,
      message: `Rider ${req.user.name} is heading to you. They will show you a pickup OTP.`,
    });

    res.json({
      success: true,
      message: "Order assigned! Show the pickup OTP to the chef.",
      data: {
        order: updatedOrder,
        pickupOTP: pickupPlain,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// POST /api/rider/orders/:id/verify-delivery

router.post("/orders/:id/verify-delivery", verifyRider, async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res
        .status(400)
        .json({ success: false, message: "OTP is required", data: null });
    }

    // Find by _id only — no status/riderId filter so we get a precise error if those differ
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found", data: null });
    }

    // Validate that this rider owns the order
    if (
      !order.rider.riderId ||
      order.rider.riderId.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message: "This order is not assigned to you",
          data: null,
        });
    }

    // Validate status
    if (order.status !== "PICKED_UP") {
      return res.status(400).json({
        success: false,
        message: `Order is currently in ${order.status} state, not PICKED_UP`,
        data: null,
      });
    }

    // Validate delivery OTP exists and hasn't been used
    if (!order.deliveryOTP?.hash || order.deliveryOTP.used) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Delivery OTP is invalid or already used",
          data: null,
        });
    }

    if (order.deliveryOTP.attempts >= 3) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Too many failed OTP attempts",
          data: null,
        });
    }

    const valid = await verifyOTP(otp, order.deliveryOTP.hash);

    if (!valid) {
      order.deliveryOTP.attempts += 1;
      await order.save();
      const left = 3 - order.deliveryOTP.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${left} attempt${left === 1 ? "" : "s"} remaining.`,
        data: null,
      });
    }

    // OTP valid — mark DELIVERED
    order.deliveryOTP.used = true;
    order.deliveryOTPPlain = null;
    order.status = "DELIVERED";
    order.statusHistory.push({
      status: "DELIVERED",
      note: "Delivery OTP verified by rider",
    });
    await order.save();

    // Notify customer
    emitToUser(order.customer.customerId.toString(), "orderDelivered", {
      orderId: order._id,
      message: "Your order has been delivered! Enjoy your meal.",
    });

    // Notify chef — FIX: use order.items[0].name instead of order.dish.name
    const itemSummary =
      order.items?.length === 1
        ? order.items[0].name
        : `${order.items?.length || "your"} items`;

    emitToUser(order.chef.chefId.toString(), "orderDelivered", {
      orderId: order._id,
      message: `${itemSummary} delivered successfully by ${req.user.name}.`,
    });

    res.json({
      success: true,
      message: "Delivery confirmed! Order complete.",
      data: { status: "DELIVERED" },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// GET /api/rider/active-order
router.get("/active-order", verifyRider, async (req, res) => {
  try {
    const order = await Order.findOne({
      "rider.riderId": req.user._id,
      status: { $in: ["ASSIGNED", "PICKED_UP"] },
    }).sort({ createdAt: -1 });
    res.json({ success: true, message: "Active order fetched", data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// Profile
router.get("/profile", verifyRider, async (req, res) => {
  res.json({ success: true, message: "Profile fetched", data: req.user });
});

router.put("/profile", verifyRider, async (req, res) => {
  try {
    const { name, address, location } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (address) updates.address = address;
    if (location) updates.location = location;
    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
    });
    res.json({ success: true, message: "Profile updated", data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

module.exports = router;
