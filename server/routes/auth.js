const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const makeToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

router.post('/signup', async (req, res, next) => {
  try {
    const { shopName, email, password } = req.body;
    if (!shopName || !email || !password) {
      return res.status(400).json({ message: 'Shop name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'This email is already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ shopName, email, password: hashed });

    res.status(201).json({ token: makeToken(user), shopName: user.shopName });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) return res.status(401).json({ message: 'Wrong email or password' });

    res.json({ token: makeToken(user), shopName: user.shopName });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
