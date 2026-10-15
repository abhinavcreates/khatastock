// Creates a demo shop with made-up data so the app is not empty on first look.
// Run: npm run seed   (running it again wipes and recreates only the demo shop)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');
const Item = require('./models/Item');
const Customer = require('./models/Customer');
const Transaction = require('./models/Transaction');

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo1234';

const day = 86400000;
const daysFromNow = (n) => new Date(Date.now() + n * day);

// [name, quantity, unit, expiry in days from today (null = none), low stock limit]
const ITEMS = [
  ['Amul milk 500 ml', 12, 'packet', 1, 5],
  ['Britannia bread', 6, 'packet', -2, 4],
  ['Amul butter 100 g', 9, 'packet', 3, 4],
  ['Maggi masala 70 g', 40, 'packet', 90, 10],
  ['Parle-G', 30, 'packet', 120, 10],
  ['Tata salt 1 kg', 18, 'packet', 400, 6],
  ['Fortune sunflower oil 1 L', 3, 'packet', 200, 5],
  ['Aashirvaad atta 5 kg', 7, 'packet', 60, 3],
  ['Toor dal', 14, 'kg', null, 5],
  ['Basmati rice', 25, 'kg', null, 8],
  ['Sugar', 2, 'kg', null, 6],
  ['Red Label tea 250 g', 8, 'packet', 9, 4],
  ['Bournvita 500 g', 5, 'packet', 5, 3],
  ['Surf Excel 1 kg', 10, 'packet', 500, 4],
  ['Good Day biscuits', 20, 'packet', -8, 6],
];

// phone numbers are made up; the Remind button on these opens WhatsApp for them
// [name, phone, [[type, amount in rupees, note, days ago], ...]]
const CUSTOMERS = [
  ['Ramesh Gupta', '9000000001', [['given', 450, 'atta, dal', 20], ['given', 220, 'oil', 12], ['received', 300, '', 6]]],
  ['Sunita Devi', '9000000002', [['given', 180, 'sugar, tea', 15], ['received', 180, '', 9]]],
  ['Mohd. Salim', '9000000003', [['given', 1200, 'monthly ration', 25], ['received', 500, '', 14], ['given', 340, 'rice', 4]]],
  ['Anita Verma', '9000000004', [['given', 95, 'bread, butter', 3]]],
  ['Pappu Yadav', '9000000005', [['given', 600, 'atta', 30], ['given', 150, 'biscuits', 18]]],
  ['Kavita Singh', '9000000006', [['given', 275, 'oil', 10], ['received', 275, '', 2]]],
  ['Dinesh Tiwari', '9000000007', []],
];

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');
  await mongoose.connect(process.env.MONGO_URI);

  // remove the old demo shop and everything that belongs to it
  const old = await User.findOne({ email: DEMO_EMAIL });
  if (old) {
    await Promise.all([
      Item.deleteMany({ user: old._id }),
      Customer.deleteMany({ user: old._id }),
      Transaction.deleteMany({ user: old._id }),
    ]);
    await User.deleteOne({ _id: old._id });
  }

  const user = await User.create({
    shopName: 'Demo Kirana (sample data)',
    email: DEMO_EMAIL,
    password: await bcrypt.hash(DEMO_PASSWORD, 10),
  });

  await Item.insertMany(
    ITEMS.map(([name, quantity, unit, expiry, lowStockLimit]) => ({
      user: user._id,
      name,
      quantity,
      unit,
      expiryDate: expiry === null ? null : daysFromNow(expiry),
      lowStockLimit,
    }))
  );

  const txRows = [];
  for (const [name, phone, entries] of CUSTOMERS) {
    const customer = await Customer.create({ user: user._id, name, phone });
    for (const [type, rupees, note, daysAgo] of entries) {
      const when = daysFromNow(-daysAgo);
      txRows.push({
        _id: new mongoose.Types.ObjectId(),
        user: user._id,
        customer: customer._id,
        type,
        amountPaise: rupees * 100,
        note,
        createdAt: when,
        updatedAt: when,
      });
    }
  }
  // inserted directly so the entries keep their older dates
  if (txRows.length) await Transaction.collection.insertMany(txRows);

  console.log(`Demo shop ready. Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
