/**
 * Dummy data seeder for Nahyan Store.
 *
 * Wipes and repopulates the catalog (Category + Product collections) with
 * realistic electronics-accessory demo data priced in PKR, and makes sure
 * one admin account exists so the admin panel is reachable immediately.
 *
 * Does NOT touch existing Users (other than upserting the one seed admin)
 * or Orders — safe to re-run without losing customer/order data.
 *
 * Usage:
 *   npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const slugify = require('./utils/slugify');
const Category = require('./models/Category');
const Product = require('./models/Product');
const User = require('./models/User');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@nahyanstore.pk';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';

const categoryNames = [
  'Mobiles',
  'Chargers',
  'Airpods',
  'Earphones',
  'Screen Protectors',
  'Cables',
  'Phone Covers',
];

// price in PKR (whole rupees)
const productsByCategory = {
  Mobiles: [
    {
      title: 'Infinix Hot 40i 8GB/128GB',
      description:
        'Smooth everyday performance with a big battery and a crisp 90Hz display — a solid budget pick.',
      price: 32999,
      stock: 18,
      images: ['https://images.pexels.com/photos/22667992/pexels-photo-22667992.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'RAM', value: '8GB' },
        { key: 'Storage', value: '128GB' },
        { key: 'Battery', value: '5000mAh' },
        { key: 'Display', value: '6.6" 90Hz' },
      ],
    },
    {
      title: 'Samsung Galaxy A15',
      description:
        'A dependable mid-ranger with a Super AMOLED display and all-day battery life.',
      price: 47999,
      stock: 12,
      images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Samsung_Galaxy_A40_und_Samsung_Galaxy_A15_20240529_HOF7494_RAW-Export_cens_%28cropped%29.png/500px-Samsung_Galaxy_A40_und_Samsung_Galaxy_A15_20240529_HOF7494_RAW-Export_cens_%28cropped%29.png'],
      specs: [
        { key: 'RAM', value: '6GB' },
        { key: 'Storage', value: '128GB' },
        { key: 'Battery', value: '5000mAh' },
        { key: 'Display', value: '6.5" Super AMOLED' },
      ],
    },
    {
      title: 'Xiaomi Redmi 13C',
      description: 'Big screen, big battery, and a 50MP main camera at a budget-friendly price.',
      price: 28499,
      stock: 25,
      images: ['https://images.unsplash.com/photo-1561474119-1b76f3a79816?auto=format&fit=crop&w=1200&q=80'],
      specs: [
        { key: 'RAM', value: '6GB' },
        { key: 'Storage', value: '128GB' },
        { key: 'Battery', value: '5000mAh' },
        { key: 'Camera', value: '50MP' },
      ],
    },
    {
      title: 'realme C67',
      description: 'A 108MP camera and 33W fast charging make this one punch above its price.',
      price: 39999,
      stock: 9,
      images: ['https://images.unsplash.com/photo-1608714783717-618b2de85e39?auto=format&fit=crop&w=1200&q=80'],
      specs: [
        { key: 'RAM', value: '8GB' },
        { key: 'Storage', value: '256GB' },
        { key: 'Charging', value: '33W Fast Charge' },
        { key: 'Camera', value: '108MP' },
      ],
    },
    {
      title: 'vivo Y17s',
      description: 'Slim, lightweight, and reliable for calls, chats, and everyday browsing.',
      price: 30999,
      stock: 4,
      images: ['https://images.unsplash.com/photo-1741061964577-3d4f0a021666?auto=format&fit=crop&w=1200&q=80'],
      specs: [
        { key: 'RAM', value: '4GB' },
        { key: 'Storage', value: '128GB' },
        { key: 'Battery', value: '5000mAh' },
        { key: 'Display', value: '6.56" HD+' },
      ],
    },
  ],

  Chargers: [
    {
      title: '20W PD Fast Charger',
      description: 'Compact single-port USB-C wall charger with Power Delivery fast charging.',
      price: 1499,
      stock: 60,
      images: ['https://images.unsplash.com/photo-1610056494249-5d7f111cf78f?auto=format&fit=crop&w=1200&q=80'],
      specs: [
        { key: 'Output', value: '20W' },
        { key: 'Ports', value: '1x USB-C' },
        { key: 'Cable included', value: 'No' },
      ],
    },
    {
      title: '33W GaN Fast Charger',
      description: 'GaN tech in a smaller footprint — charges phones and small tablets quickly.',
      price: 2299,
      stock: 40,
      images: ['https://images.pexels.com/photos/3921710/pexels-photo-3921710.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Output', value: '33W' },
        { key: 'Ports', value: '1x USB-C' },
        { key: 'Technology', value: 'GaN' },
      ],
    },
    {
      title: '65W GaN 3-Port Charger',
      description: 'One brick for your phone, laptop, and earbuds — charges all three together.',
      price: 4499,
      stock: 22,
      images: ['https://images.pexels.com/photos/35921904/pexels-photo-35921904.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Output', value: '65W' },
        { key: 'Ports', value: '2x USB-C, 1x USB-A' },
        { key: 'Technology', value: 'GaN III' },
      ],
    },
    {
      title: 'Dual USB Car Charger 30W',
      description: 'Plug-in car charger with two fast-charging ports for the whole front seat.',
      price: 1199,
      stock: 35,
      images: ['https://images.pexels.com/photos/7738878/pexels-photo-7738878.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Output', value: '30W total' },
        { key: 'Ports', value: '2x USB-A' },
        { key: 'Fit', value: 'Standard 12V socket' },
      ],
    },
    {
      title: 'Wireless Charging Pad 15W',
      description: 'Drop-and-go Qi wireless charging for any Qi-compatible phone.',
      price: 2799,
      stock: 3,
      images: ['https://images.unsplash.com/photo-1607092272638-229d96373815?auto=format&fit=crop&w=1200&q=80'],
      specs: [
        { key: 'Output', value: '15W max' },
        { key: 'Standard', value: 'Qi' },
        { key: 'Cable included', value: 'Yes, USB-C' },
      ],
    },
  ],

  Airpods: [
    {
      title: 'Airpods Pro 2 (ANC)',
      description: 'Active noise cancellation, transparency mode, and a compact charging case.',
      price: 8990,
      stock: 20,
      images: ['https://images.pexels.com/photos/3921872/pexels-photo-3921872.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Battery life', value: '24H with case' },
        { key: 'ANC', value: 'Yes' },
        { key: 'Connectivity', value: 'Bluetooth 5.3' },
      ],
    },
    {
      title: 'Airpods 3rd Gen',
      description: 'Spatial audio and a secure fit, without the noise cancellation premium.',
      price: 6490,
      stock: 27,
      images: ['https://images.pexels.com/photos/3921864/pexels-photo-3921864.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Battery life', value: '20H with case' },
        { key: 'ANC', value: 'No' },
        { key: 'Connectivity', value: 'Bluetooth 5.2' },
      ],
    },
    {
      title: 'i12 TWS Airpods',
      description: 'Budget true-wireless earbuds with touch controls and a pocketable case.',
      price: 1899,
      stock: 55,
      images: ['https://images.pexels.com/photos/8858287/pexels-photo-8858287.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Battery life', value: '12H with case' },
        { key: 'ANC', value: 'No' },
        { key: 'Connectivity', value: 'Bluetooth 5.0' },
      ],
    },
    {
      title: 'Airpods Max (Over-Ear)',
      description: 'Over-ear wireless headphones with high-fidelity sound and adaptive EQ.',
      price: 15990,
      stock: 6,
      images: ['https://images.pexels.com/photos/34075324/pexels-photo-34075324.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Battery life', value: '20H' },
        { key: 'ANC', value: 'Yes' },
        { key: 'Type', value: 'Over-ear' },
      ],
    },
  ],

  Earphones: [
    {
      title: 'Wired Earphones with Mic',
      description: 'Reliable 3.5mm wired earphones with an inline mic for calls.',
      price: 499,
      stock: 80,
      images: ['https://images.pexels.com/photos/983831/pexels-photo-983831.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Connector', value: '3.5mm' },
        { key: 'Mic', value: 'Yes' },
        { key: 'Cable length', value: '1.2m' },
      ],
    },
    {
      title: 'Type-C Earphones',
      description: 'Digital USB-C earphones for phones that skip the headphone jack.',
      price: 799,
      stock: 45,
      images: ['https://images.pexels.com/photos/18573073/pexels-photo-18573073.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Connector', value: 'USB-C' },
        { key: 'Mic', value: 'Yes' },
        { key: 'Cable length', value: '1.1m' },
      ],
    },
    {
      title: 'Sports Earphones (Sweatproof)',
      description: 'Ear-hook design with a sweat-resistant build, made for workouts.',
      price: 999,
      stock: 30,
      images: ['https://images.pexels.com/photos/7623730/pexels-photo-7623730.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Connector', value: '3.5mm' },
        { key: 'Water resistance', value: 'IPX4' },
        { key: 'Fit', value: 'Ear-hook' },
      ],
    },
    {
      title: 'Bass+ Stereo Earphones',
      description: 'Extra-bass tuning with a tangle-resistant flat cable.',
      price: 649,
      stock: 50,
      images: ['https://images.pexels.com/photos/14272794/pexels-photo-14272794.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Connector', value: '3.5mm' },
        { key: 'Cable', value: 'Tangle-free flat' },
        { key: 'Driver', value: '10mm' },
      ],
    },
  ],

  'Screen Protectors': [
    {
      title: '9D Tempered Glass Protector',
      description: 'Full-edge tempered glass with a hardness rating that shrugs off scratches.',
      price: 349,
      stock: 100,
      images: ['https://images.pexels.com/photos/7742507/pexels-photo-7742507.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
        { key: 'Hardness', value: '9H' },
        { key: 'Coverage', value: 'Full screen, 9D curved edge' },
      ],
    },
    {
      title: 'Privacy Screen Protector',
      description: 'Anti-peep tempered glass that blacks out the screen from side angles.',
      price: 599,
      stock: 40,
      images: ['https://images.pexels.com/photos/7742506/pexels-photo-7742506.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Type', value: 'Privacy / anti-spy' },
        { key: 'Hardness', value: '9H' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
      ],
    },
    {
      title: 'Matte Anti-Glare Protector',
      description: 'Fingerprint-resistant matte finish that cuts glare outdoors.',
      price: 449,
      stock: 35,
      images: ['https://images.pexels.com/photos/1350462/pexels-photo-1350462.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Finish', value: 'Matte anti-glare' },
        { key: 'Hardness', value: '7H' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
      ],
    },
    {
      title: 'Camera Lens Protector (2-Pack)',
      description: 'Slim tempered glass rings that protect the rear camera lenses.',
      price: 299,
      stock: 60,
      images: ['https://images.pexels.com/photos/12969045/pexels-photo-12969045.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Pack size', value: '2 pieces' },
        { key: 'Hardness', value: '9H' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
      ],
    },
  ],

  Cables: [
    {
      title: 'USB-C Fast Charging Cable 1m',
      description: 'Braided USB-C cable rated for fast charging and quick data transfer.',
      price: 449,
      stock: 90,
      images: ['https://images.pexels.com/photos/3921711/pexels-photo-3921711.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Length', value: '1m' },
        { key: 'Connector', value: 'USB-A to USB-C' },
        { key: 'Fast charging', value: 'Up to 65W' },
      ],
    },
    {
      title: 'Lightning Cable 1m',
      description: 'MFi-style Lightning cable for iPhone charging and syncing.',
      price: 599,
      stock: 50,
      images: ['https://images.pexels.com/photos/28042836/pexels-photo-28042836.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Length', value: '1m' },
        { key: 'Connector', value: 'USB-A to Lightning' },
        { key: 'Data sync', value: 'Yes' },
      ],
    },
    {
      title: 'Micro USB Cable 1m',
      description: 'The classic charging cable for older Android phones and accessories.',
      price: 249,
      stock: 70,
      images: ['https://images.pexels.com/photos/4219866/pexels-photo-4219866.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Length', value: '1m' },
        { key: 'Connector', value: 'USB-A to Micro USB' },
      ],
    },
    {
      title: 'USB-C to USB-C Cable 2m',
      description: 'Extra-long braided cable for charging from further away — great for beds and desks.',
      price: 799,
      stock: 33,
      images: ['https://images.pexels.com/photos/4219863/pexels-photo-4219863.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Length', value: '2m' },
        { key: 'Connector', value: 'USB-C to USB-C' },
        { key: 'Fast charging', value: 'Up to 100W' },
      ],
    },
  ],

  'Phone Covers': [
    {
      title: 'Silicone Case',
      description: 'Soft-touch silicone case with a snug fit and raised camera bump protection.',
      price: 599,
      stock: 65,
      images: ['https://images.pexels.com/photos/17077359/pexels-photo-17077359.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Material', value: 'Liquid silicone' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
        { key: 'Protection', value: 'Camera bump + edges' },
      ],
    },
    {
      title: 'Transparent Shockproof Case',
      description: 'Clear case with reinforced corners that keeps your phone\'s look intact.',
      price: 699,
      stock: 55,
      images: ['https://images.pexels.com/photos/7360460/pexels-photo-7360460.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Material', value: 'TPU + PC hybrid' },
        { key: 'Protection', value: 'Shockproof corners' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
      ],
    },
    {
      title: 'Leather Flip Cover',
      description: 'Card-slot flip cover in PU leather, doubles as a stand for video calls.',
      price: 1299,
      stock: 28,
      images: ['https://images.pexels.com/photos/8156983/pexels-photo-8156983.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Material', value: 'PU leather' },
        { key: 'Features', value: 'Card slot, kickstand' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
      ],
    },
    {
      title: 'Matte Hard Case',
      description: 'Fingerprint-resistant matte hard shell with a slim profile.',
      price: 549,
      stock: 5,
      images: ['https://images.pexels.com/photos/374140/pexels-photo-374140.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Material', value: 'Matte polycarbonate' },
        { key: 'Profile', value: 'Slim, 1mm wall' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
      ],
    },
  ],
};

function withUniqueSlug(title, usedSlugs) {
  const base = slugify(title);
  let slug = base;
  let n = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  usedSlugs.add(slug);
  return slug;
}

async function seed() {
  await connectDB();

  console.log('Clearing existing catalog (Categories + Products)...');
  await Promise.all([Category.deleteMany({}), Product.deleteMany({})]);

  console.log('Creating categories...');
  const categoryDocs = await Category.insertMany(
    categoryNames.map((name) => ({ name, slug: slugify(name) }))
  );
  const categoryIdByName = new Map(categoryDocs.map((c) => [c.name, c._id]));

  console.log('Creating products...');
  const usedSlugs = new Set();
  const productsToInsert = [];

  for (const [categoryName, products] of Object.entries(productsByCategory)) {
    const categoryId = categoryIdByName.get(categoryName);
    for (const p of products) {
      productsToInsert.push({
        title: p.title,
        slug: withUniqueSlug(p.title, usedSlugs),
        description: p.description,
        price: p.price,
        category: categoryId,
        images: p.images || [],
        specs: p.specs,
        stock: p.stock,
        isActive: true,
      });
    }
  }

  await Product.insertMany(productsToInsert);

  console.log('Ensuring seed admin account exists...');
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, await bcrypt.genSalt(10));
  const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
  if (existingAdmin) {
    existingAdmin.role = 'admin';
    await existingAdmin.save();
  } else {
    await User.create({
      name: 'Nahyan Store Admin',
      email: ADMIN_EMAIL,
      phone: '03000000000',
      passwordHash,
      role: 'admin',
    });
  }

  console.log('\nSeed complete:');
  console.log(`  Categories: ${categoryDocs.length}`);
  console.log(`  Products:   ${productsToInsert.length}`);
  console.log('  Admin login:');
  console.log(`    email:    ${ADMIN_EMAIL}`);
  console.log(
    existingAdmin
      ? '    password: (unchanged — account already existed, only role was set to admin)'
      : `    password: ${ADMIN_PASSWORD}`
  );

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
