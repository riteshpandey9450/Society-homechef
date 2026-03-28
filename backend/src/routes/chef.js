const express = require("express");
const router = express.Router();
const { verifyChef } = require("../middleware/auth");
const Dish = require("../models/Dish");
const Order = require("../models/Order");
const { estimateNutritionWithGemini } = require("../utils/gemini");
const { verifyOTP } = require("../utils/otp");
const { emitToUser } = require("../socket");

// Dish CRUD

router.get("/dishes", verifyChef, async (req, res) => {
  try {
    const dishes = await Dish.find({
      chefId: req.user._id,
      isActive: true,
    }).sort({ createdAt: -1 });
    res.json({ success: true, message: "Dishes fetched", data: dishes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

router.post("/dishes", verifyChef, async (req, res) => {
  try {
    const { name, description, price, quantity, isVeg, image } = req.body;
    if (!name || !description || !image)
      return res
        .status(400)
        .json({
          success: false,
          message: "Name, description and image are required",
          data: null,
        });

    let nutrition = null;
    try {
      nutrition = await estimateNutritionWithGemini(name, description);
    } catch (_) {}

    const dish = await Dish.create({
      chefId: req.user._id,
      chefName: req.user.name,
      name,
      description,
      price: Number(price),
      quantity: Number(quantity),
      isVeg: isVeg !== false && isVeg !== "false",
      image,
      calories: nutrition?.calories || null,
      healthScore: nutrition?.healthScore || null,
      nutritionData: {
        protein: nutrition?.protein || null,
        carbs: nutrition?.carbs || null,
        fat: nutrition?.fat || null,
        fiber: nutrition?.fiber || null,
      },
    });
    res
      .status(201)
      .json({
        success: true,
        message: "Dish created successfully",
        data: { dish, nutrition },
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

router.put("/dishes/:id", verifyChef, async (req, res) => {
  try {
    const dish = await Dish.findOne({
      _id: req.params.id,
      chefId: req.user._id,
    });
    if (!dish)
      return res
        .status(404)
        .json({ success: false, message: "Dish not found", data: null });

    const { name, description, price, quantity, isVeg, image, isSoldOut } =
      req.body;
    if (name !== undefined) dish.name = name;
    if (description !== undefined) dish.description = description;
    if (price !== undefined) dish.price = Number(price);
    if (quantity !== undefined) {
      dish.quantity = Number(quantity);
      if (dish.quantity > 0) dish.isSoldOut = false;
    }
    if (isVeg !== undefined) dish.isVeg = isVeg !== false && isVeg !== "false";
    if (image !== undefined) dish.image = image;
    if (isSoldOut !== undefined) dish.isSoldOut = isSoldOut;

    if (name || description) {
      try {
        const n = await estimateNutritionWithGemini(
          dish.name,
          dish.description,
        );
        dish.calories = n?.calories;
        dish.healthScore = n?.healthScore;
        dish.nutritionData = {
          protein: n?.protein,
          carbs: n?.carbs,
          fat: n?.fat,
          fiber: n?.fiber,
        };
      } catch (_) {}
    }

    await dish.save();
    res.json({ success: true, message: "Dish updated", data: dish });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

router.delete("/dishes/:id", verifyChef, async (req, res) => {
  try {
    const dish = await Dish.findOneAndUpdate(
      { _id: req.params.id, chefId: req.user._id },
      { isActive: false },
      { new: true },
    );
    if (!dish)
      return res
        .status(404)
        .json({ success: false, message: "Dish not found", data: null });
    res.json({ success: true, message: "Dish deleted", data: null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

router.patch("/dishes/:id/soldout", verifyChef, async (req, res) => {
  try {
    const dish = await Dish.findOne({
      _id: req.params.id,
      chefId: req.user._id,
    });
    if (!dish)
      return res
        .status(404)
        .json({ success: false, message: "Dish not found", data: null });
    dish.isSoldOut = !dish.isSoldOut;
    await dish.save();
    res.json({
      success: true,
      message: `Dish marked as ${dish.isSoldOut ? "sold out" : "available"}`,
      data: dish,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// Returns orders for this chef's dishes.
// status query can be comma-separated: ?status=PLACED,ASSIGNED
router.get("/orders", verifyChef, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { "chef.chefId": req.user._id };

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

// Chef enters the OTP the rider shows them.
// If valid → status = PICKED_UP.
// The deliveryOTPPlain was already generated when rider did request-pickup,
// so we just need to notify the customer to make their OTP visible.
router.post("/orders/:id/verify-pickup", verifyChef, async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp)
      return res
        .status(400)
        .json({ success: false, message: "OTP is required", data: null });

    // Accept orders in ASSIGNED state (the new flow) or ACCEPTED (legacy)
    const order = await Order.findOne({
      _id: req.params.id,
      "chef.chefId": req.user._id,
      status: { $in: ["ASSIGNED", "ACCEPTED"] },
    });

    if (!order)
      return res
        .status(404)
        .json({
          success: false,
          message: "Order not found or not awaiting pickup",
          data: null,
        });

    if (!order.pickupOTP?.hash || order.pickupOTP.used)
      return res
        .status(400)
        .json({
          success: false,
          message: "Pickup OTP is invalid or already used",
          data: null,
        });

    if (order.pickupOTP.attempts >= 3)
      return res
        .status(400)
        .json({
          success: false,
          message: "Too many failed OTP attempts",
          data: null,
        });

    const valid = await verifyOTP(otp, order.pickupOTP.hash);

    if (!valid) {
      order.pickupOTP.attempts += 1;
      await order.save();
      const left = 3 - order.pickupOTP.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${left} attempt${left === 1 ? "" : "s"} remaining.`,
        data: null,
      });
    }

    // OTP is valid — hand over the food
    order.pickupOTP.used = true;
    order.pickupOTPPlain = null; // clear after use
    order.status = "PICKED_UP";
    order.statusHistory.push({
      status: "PICKED_UP",
      note: "Pickup OTP verified by chef",
    });
    await order.save();

    // Notify customer: food picked up (delivery OTP was already shown to them at ASSIGNED)
    emitToUser(order.customer.customerId.toString(), "orderPickedUp", {
      orderId: order._id,
      status: "PICKED_UP",
      message: "🛵 Your order has been picked up and is on its way!",
    });

    // Notify rider: chef approved, head to customer
    emitToUser(order.rider.riderId.toString(), "pickupApproved", {
      orderId: order._id,
      status: "PICKED_UP",
      message: "Chef confirmed. Head to the customer now.",
    });

    res.json({
      success: true,
      message: "Pickup verified! Order is on its way.",
      data: { status: "PICKED_UP" },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// Profile
router.get("/profile", verifyChef, async (req, res) => {
  res.json({ success: true, message: "Profile fetched", data: req.user });
});

router.put("/profile", verifyChef, async (req, res) => {
  try {
    const { name, address, location } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (address) updates.address = address;
    if (location) updates.location = location;
    const user = await require("../models/User").findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true },
    );
    res.json({ success: true, message: "Profile updated", data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

module.exports = router;
