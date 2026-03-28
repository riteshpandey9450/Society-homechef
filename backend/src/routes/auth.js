const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { generateResetToken, hashResetToken } = require("../utils/otp");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "7d",
  });
};

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role, address, location } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and role are required",
        data: null,
      });
    }

    if (!["chef", "customer", "rider"].includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid role", data: null });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
        data: null,
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      address: address || {},
      location: location || {},
    });

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          address: user.address,
          location: user.location,
          isOnline: user.isOnline,
        },
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
        data: null,
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials", data: null });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials", data: null });
    }

    const token = generateToken(user._id, user.role);

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          address: user.address,
          location: user.location,
          isOnline: user.isOnline,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required", data: null });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Security: don't reveal if email exists
      return res.json({
        success: true,
        message: "If that email exists, a reset token has been generated",
        data: null,
      });
    }

    const resetToken = generateResetToken();
    user.resetPasswordToken = hashResetToken(resetToken);
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save({ validateBeforeSave: false });

    // In production, send email. For dev, return token directly.
    return res.json({
      success: true,
      message: "Password reset token generated",
      data: {
        resetToken, // In production, send via email only
        note: "Use this token in the reset-password endpoint",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Token, newPassword and confirmPassword are required",
        data: null,
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
        data: null,
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
        data: null,
      });
    }

    const hashedToken = hashResetToken(token);
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
        data: null,
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res.json({
      success: true,
      message: "Password reset successful",
      data: null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

module.exports = router;
