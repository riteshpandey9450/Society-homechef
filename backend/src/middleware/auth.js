const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided', data: null });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found', data: null });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token', data: null });
  }
};

const verifyChef = async (req, res, next) => {
  await verifyToken(req, res, () => {
    if (req.user.role !== 'chef') {
      return res.status(403).json({ success: false, message: 'Chef access required', data: null });
    }
    next();
  });
};

const verifyCustomer = async (req, res, next) => {
  await verifyToken(req, res, () => {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Customer access required', data: null });
    }
    next();
  });
};

const verifyRider = async (req, res, next) => {
  await verifyToken(req, res, () => {
    if (req.user.role !== 'rider') {
      return res.status(403).json({ success: false, message: 'Rider access required', data: null });
    }
    next();
  });
};

module.exports = { verifyToken, verifyChef, verifyCustomer, verifyRider };
