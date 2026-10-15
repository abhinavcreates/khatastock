const express = require('express');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const MAX_AMOUNT_PAISE = 1000000 * 100; // Rs 10,00,000 per entry, catches typing mistakes

// "+91 98765-43210" or "098765 43210" -> "9876543210"
function cleanPhone(raw = '') {
  let p = String(raw).replace(/\D/g, '');
  if (p.length === 12 && p.startsWith('91')) p = p.slice(2);
  if (p.length === 11 && p.startsWith('0')) p = p.slice(1);
  return p;
}

function validateCustomer(name, phone) {
  if (!name || !name.trim()) return 'Customer name is required';
  if (!/^[6-9]\d{9}$/.test(phone)) return 'Enter a valid 10 digit mobile number';
  return null;
}

// balance = total given - total received. It is always calculated, never stored.
async function getBalances(userId, customerId = null) {
  const match = { user: new mongoose.Types.ObjectId(userId) };
  if (customerId) match.customer = new mongoose.Types.ObjectId(customerId);

  const rows = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$customer',
        given: { $sum: { $cond: [{ $eq: ['$type', 'given'] }, '$amountPaise', 0] } },
        received: { $sum: { $cond: [{ $eq: ['$type', 'received'] }, '$amountPaise', 0] } },
      },
    },
  ]);

  const map = {};
  rows.forEach((r) => (map[String(r._id)] = r.given - r.received));
  return map;
}

// list customers with their balance
router.get('/', async (req, res, next) => {
  try {
    const customers = await Customer.find({ user: req.userId }).sort({ name: 1 }).lean();
    const balances = await getBalances(req.userId);
    res.json(customers.map((c) => ({ ...c, balancePaise: balances[String(c._id)] || 0 })));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const name = req.body.name;
    const phone = cleanPhone(req.body.phone);
    const error = validateCustomer(name, phone);
    if (error) return res.status(400).json({ message: error });

    const customer = await Customer.create({ user: req.userId, name, phone });
    res.status(201).json({ ...customer.toObject(), balancePaise: 0 });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A customer with this phone number already exists' });
    }
    next(err);
  }
});

// one customer with balance and full history (newest first)
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, user: req.userId }).lean();
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const balances = await getBalances(req.userId, req.params.id);
    const transactions = await Transaction.find({ user: req.userId, customer: req.params.id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({
      customer: { ...customer, balancePaise: balances[String(customer._id)] || 0 },
      transactions,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const name = req.body.name;
    const phone = cleanPhone(req.body.phone);
    const error = validateCustomer(name, phone);
    if (error) return res.status(400).json({ message: error });

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { name, phone },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A customer with this phone number already exists' });
    }
    next(err);
  }
});

// deleting a customer also deletes all of their entries
router.delete('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    await Transaction.deleteMany({ user: req.userId, customer: req.params.id });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    next(err);
  }
});

// add an entry: udhaar given or payment received
router.post('/:id/transactions', async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, user: req.userId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { type, amount, note } = req.body;
    if (!['given', 'received'].includes(type)) {
      return res.status(400).json({ message: 'Choose udhaar given or payment received' });
    }

    const amountPaise = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      return res.status(400).json({ message: 'Amount must be more than 0' });
    }
    if (amountPaise > MAX_AMOUNT_PAISE) {
      return res.status(400).json({ message: 'Amount is too large, please check it' });
    }

    const tx = await Transaction.create({
      user: req.userId,
      customer: customer._id,
      type,
      amountPaise,
      note: note || '',
    });
    res.status(201).json(tx);
  } catch (err) {
    next(err);
  }
});

// remove a wrong entry
router.delete('/:id/transactions/:txId', async (req, res, next) => {
  try {
    const tx = await Transaction.findOneAndDelete({
      _id: req.params.txId,
      customer: req.params.id,
      user: req.userId,
    });
    if (!tx) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
