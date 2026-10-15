const express = require('express');
const Item = require('../models/Item');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth); // all item routes need login

// pick only the fields we allow the client to set
function cleanBody(body) {
  const data = {
    name: body.name,
    quantity: Number(body.quantity),
    unit: body.unit || 'piece',
    expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
  };
  if (body.lowStockLimit !== undefined && body.lowStockLimit !== '') {
    data.lowStockLimit = Number(body.lowStockLimit);
  }
  return data;
}

function validate(data) {
  if (!data.name || !data.name.trim()) return 'Item name is required';
  if (Number.isNaN(data.quantity) || data.quantity < 0) return 'Quantity must be 0 or more';
  if (data.expiryDate && Number.isNaN(data.expiryDate.getTime())) return 'Expiry date is not valid';
  return null;
}

// list all items of this shop, sorted by name
router.get('/', async (req, res, next) => {
  try {
    const items = await Item.find({ user: req.userId }).sort({ name: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = cleanBody(req.body);
    const error = validate(data);
    if (error) return res.status(400).json({ message: error });

    const item = await Item.create({ ...data, user: req.userId });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = cleanBody(req.body);
    const error = validate(data);
    if (error) return res.status(400).json({ message: error });

    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      data,
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const item = await Item.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
