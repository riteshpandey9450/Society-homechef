const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const chefRoutes = require("./routes/chef");
const customerRoutes = require("./routes/customer");
const riderRoutes = require("./routes/rider");

const app = express();

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.options("*", cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chef", chefRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/rider", riderRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Society HomeChef API is running 🍽️" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    data: null,
  });
});

module.exports = app;
