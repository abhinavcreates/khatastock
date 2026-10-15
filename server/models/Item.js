const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    // every item belongs to one shopkeeper, so shops never see each other's data
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'piece' },
    expiryDate: { type: Date, default: null },
    lowStockLimit: { type: Number, default: 5, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Item', itemSchema);
