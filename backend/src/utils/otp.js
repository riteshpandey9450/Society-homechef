const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate a cryptographically secure 4-digit OTP.
 * Uses crypto.randomInt (CSPRNG) — NOT Math.random which is predictable.
 */
const generateOTP = () => {
  // crypto.randomInt(min, max) → inclusive min, exclusive max → 1000..9999
  return crypto.randomInt(1000, 10000).toString();
};

/**
 * Generate both pickup and delivery OTPs in one call.
 * Returns plain text versions for display + bcrypt hashes for storage.
 */
const generateOrderOTPs = async () => {
  const pickupPlain   = generateOTP();
  const deliveryPlain = generateOTP();

  const [pickupHash, deliveryHash] = await Promise.all([
    bcrypt.hash(pickupPlain,   10),
    bcrypt.hash(deliveryPlain, 10),
  ]);

  return { pickupPlain, pickupHash, deliveryPlain, deliveryHash };
};

/** Verify plain OTP against bcrypt hash */
const verifyOTP = async (otp, hash) => {
  if (!otp || !hash) return false;
  return bcrypt.compare(String(otp), hash);
};

/** Generate a password-reset token (hex, 40 chars) */
const generateResetToken = () => crypto.randomBytes(20).toString('hex');

/** SHA-256 hash of a token string */
const hashResetToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

/** bcrypt-hash a single OTP */
const hashOTP = (otp) => bcrypt.hash(String(otp), 10);

module.exports = {
  generateOTP,
  generateOrderOTPs,
  hashOTP,
  verifyOTP,
  generateResetToken,
  hashResetToken,
};
