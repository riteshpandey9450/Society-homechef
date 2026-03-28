const mongoose = require("mongoose");

const dishSchema = new mongoose.Schema({
  chefId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  chefName: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: [true, "Dish name is required"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Description is mandatory"],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: 0,
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: 0,
  },
  isVeg: {
    type: Boolean,
    required: true,
    default: true,
  },
  image: {
    type: String,
    required: [true, "Image is mandatory"],
  },
  // AI-estimated nutrition
  calories: {
    type: Number,
    default: null,
  },
  healthScore: {
    type: Number,
    default: null,
    min: 0,
    max: 10,
  },
  nutritionData: {
    protein: { type: Number, default: null },
    carbs: { type: Number, default: null },
    fat: { type: Number, default: null },
    fiber: { type: Number, default: null },
  },
  isSoldOut: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

dishSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Dish", dishSchema);
