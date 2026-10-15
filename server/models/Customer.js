const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true }, // 10 digits, no +91
  },
  { timestamps: true }
);

// same phone number cannot be added twice in one shop
customerSchema.index({ user: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
