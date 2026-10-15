const mongoose = require('mongoose');

// One row = one entry in the khata book.
// "given"    = shopkeeper gave goods on credit (customer owes more)
// "received" = customer paid money back (customer owes less)
// Amount is stored in paise (integer) so there are no decimal rounding errors.
const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    type: { type: String, enum: ['given', 'received'], required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    note: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, customer: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
