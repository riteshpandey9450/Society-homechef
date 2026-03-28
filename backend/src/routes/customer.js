const express = require("express");
const router = express.Router();
const { verifyCustomer } = require("../middleware/auth");
const Dish = require("../models/Dish");
const Order = require("../models/Order");
const User = require("../models/User");
const { emitToUser, emitToRiders } = require("../socket");

// GET /api/customer/dishes  — browse available dishes

router.get("/dishes", async (req, res) => {
  try {
    const { isVeg, minCalories, maxCalories, minHealthScore, search } =
      req.query;
    const filter = { isActive: true, isSoldOut: false, quantity: { $gt: 0 } };

    if (isVeg !== undefined) filter.isVeg = isVeg === "true";
    if (maxCalories)
      filter.calories = { ...filter.calories, $lte: Number(maxCalories) };
    if (minCalories)
      filter.calories = { ...filter.calories, $gte: Number(minCalories) };
    if (minHealthScore) filter.healthScore = { $gte: Number(minHealthScore) };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const dishes = await Dish.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, message: "Dishes fetched", data: dishes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// GET /api/customer/orders  — my orders

router.get("/orders", verifyCustomer, async (req, res) => {
  try {
    const orders = await Order.find({
      "customer.customerId": req.user._id,
    }).sort({ createdAt: -1 });
    res.json({ success: true, message: "Orders fetched", data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// GET /api/customer/orders/:id

router.get("/orders/:id", verifyCustomer, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      "customer.customerId": req.user._id,
    });
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found", data: null });
    res.json({ success: true, message: "Order fetched", data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/customer/orders  — place a multi-item order
//
// Body: { items: [{ dishId, quantity }] }
// Rules:
//   All dishes must belong to the SAME chef
//   Each item quantity must be > 0 and available in stock
//   Deduct stock atomically per item
// ─────────────────────────────────────────────────────────────────────────────
router.post("/orders", verifyCustomer, async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "items[] is required", data: null });
    }

    // Validate quantities
    for (const item of items) {
      if (!item.dishId || !item.quantity || item.quantity < 1) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Each item needs dishId and quantity >= 1",
            data: null,
          });
      }
    }

    // Fetch all dishes in parallel
    const dishIds = items.map((i) => i.dishId);
    const dishes = await Dish.find({ _id: { $in: dishIds }, isActive: true });
    const dishMap = Object.fromEntries(
      dishes.map((d) => [d._id.toString(), d]),
    );

    // Validate every item
    let chefId = null;
    let chefUser = null;

    for (const item of items) {
      const dish = dishMap[item.dishId];
      if (!dish)
        return res
          .status(404)
          .json({
            success: false,
            message: `Dish not found: ${item.dishId}`,
            data: null,
          });
      if (dish.isSoldOut || dish.quantity < item.quantity) {
        return res
          .status(400)
          .json({
            success: false,
            message: `${dish.name} is sold out or insufficient stock`,
            data: null,
          });
      }
      // Same-chef constraint
      if (!chefId) {
        chefId = dish.chefId.toString();
        chefUser = await User.findById(dish.chefId);
        if (!chefUser)
          return res
            .status(404)
            .json({ success: false, message: "Chef not found", data: null });
      } else if (dish.chefId.toString() !== chefId) {
        return res
          .status(400)
          .json({
            success: false,
            message: "All items must be from the same chef",
            data: null,
          });
      }
    }

    const customer = req.user;

    // Build snapshot items array
    const snapshotItems = items.map((item) => {
      const dish = dishMap[item.dishId];
      return {
        dishId: dish._id,
        name: dish.name,
        image: dish.image,
        description: dish.description,
        price: dish.price,
        quantity: item.quantity,
      };
    });

    const totalAmount = snapshotItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );
    const totalItems = snapshotItems.reduce((sum, i) => sum + i.quantity, 0);

    // Create order
    const order = await Order.create({
      items: snapshotItems,
      chef: {
        chefId: chefUser._id,
        chefName: chefUser.name,
        chefAddress: chefUser.address,
      },
      customer: {
        customerId: customer._id,
        customerName: customer.name,
        customerAddress: customer.address,
        customerLocation: customer.location,
      },
      rider: { riderId: null, riderName: null },
      status: "PLACED",
      totalAmount,
      totalItems,
      statusHistory: [{ status: "PLACED", note: "Order placed by customer" }],
    });

    // Deduct stock for each item
    for (const item of items) {
      const dish = dishMap[item.dishId];
      dish.quantity -= item.quantity;
      if (dish.quantity <= 0) {
        dish.quantity = 0;
        dish.isSoldOut = true;
      }
      await dish.save();
    }

    // Broadcast to all online riders
    emitToRiders("newOrderAvailable", {
      orderId: order._id,
      chefName: chefUser.name,
      totalAmount,
      totalItems,
      customerName: customer.name,
      message: `New order from ${customer.name} — ${totalItems} item(s)`,
    });

    // Notify chef
    emitToUser(chefUser._id.toString(), "orderPlaced", {
      orderId: order._id,
      totalItems,
      customerName: customer.name,
      message: `New order from ${customer.name} — ${totalItems} item(s)`,
    });

    res
      .status(201)
      .json({
        success: true,
        message: "Order placed successfully!",
        data: order,
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// PUT /api/customer/orders/:id/cancel
router.put("/orders/:id/cancel", verifyCustomer, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      "customer.customerId": req.user._id,
    });
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found", data: null });

    if (!["PLACED", "ASSIGNED"].includes(order.status)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Order cannot be cancelled at this stage",
          data: null,
        });
    }

    order.status = "CANCELLED";
    order.statusHistory.push({
      status: "CANCELLED",
      note: "Cancelled by customer",
    });
    await order.save();

    // Restore stock for all items
    for (const item of order.items) {
      await Dish.findByIdAndUpdate(item.dishId, {
        $inc: { quantity: item.quantity },
        $set: { isSoldOut: false },
      });
    }

    emitToUser(order.chef.chefId.toString(), "orderCancelled", {
      orderId: order._id,
      message: `Order was cancelled by ${order.customer.customerName}`,
    });
    if (order.rider.riderId) {
      emitToUser(order.rider.riderId.toString(), "orderCancelled", {
        orderId: order._id,
        message: "Order was cancelled",
      });
    }

    res.json({ success: true, message: "Order cancelled", data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// Profile
router.get("/profile", verifyCustomer, async (req, res) => {
  res.json({ success: true, message: "Profile fetched", data: req.user });
});

router.put("/profile", verifyCustomer, async (req, res) => {
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
