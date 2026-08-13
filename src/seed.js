/**
 * Dummy data seeder for SnapCell.
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

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@snapcell.pk';
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
    {
      title: 'Infinix Hot 50 4G',
      description: 'A large 6.78" display and all-day battery life make daily browsing and streaming effortless.',
      price: 33999,
      stock: 21,
      images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Infinix_HOT_50_4G.jpg/500px-Infinix_HOT_50_4G.jpg'],
      specs: [
        { key: 'RAM', value: '8GB' },
        { key: 'Storage', value: '256GB' },
        { key: 'Battery', value: '5000mAh' },
        { key: 'Display', value: '6.78" 120Hz' },
      ],
    },
    {
      title: 'Infinix Note 50 Pro 4G',
      description: 'Curved AMOLED display and fast 45W charging bring a flagship feel to the mid-range segment.',
      price: 54999,
      stock: 14,
      images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Infinix_Note_50_Pro_4G.jpg/500px-Infinix_Note_50_Pro_4G.jpg'],
      specs: [
        { key: 'RAM', value: '8GB' },
        { key: 'Storage', value: '256GB' },
        { key: 'Battery', value: '5000mAh' },
        { key: 'Display', value: '6.78" AMOLED' },
      ],
    },
    {
      title: 'Oppo A78 5G',
      description: 'Slim design meets 5G speed, with a 5000mAh battery and 33W SuperVOOC charging.',
      price: 62999,
      stock: 12,
      images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Oppo_A78.jpg/500px-Oppo_A78.jpg'],
      specs: [
        { key: 'RAM', value: '8GB' },
        { key: 'Storage', value: '128GB' },
        { key: 'Battery', value: '5000mAh' },
        { key: 'Network', value: '5G' },
      ],
    },
    {
      title: 'Xiaomi Redmi 13',
      description: 'A 108MP camera, 6.79" 120Hz display, and a massive battery for a well-rounded everyday phone.',
      price: 42999,
      stock: 27,
      images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Redmi_13_Product_photography_05.jpg/500px-Redmi_13_Product_photography_05.jpg'],
      specs: [
        { key: 'RAM', value: '8GB' },
        { key: 'Storage', value: '256GB' },
        { key: 'Battery', value: '5030mAh' },
        { key: 'Camera', value: '108MP' },
      ],
    },
    {
      title: 'Samsung Galaxy A25 5G',
      description: 'A Super AMOLED display and clean One UI experience backed by reliable Samsung after-sales support.',
      price: 74999,
      stock: 9,
      images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Samsung_Galaxy_A25_5G_2024.jpg/500px-Samsung_Galaxy_A25_5G_2024.jpg'],
      specs: [
        { key: 'RAM', value: '8GB' },
        { key: 'Storage', value: '128GB' },
        { key: 'Battery', value: '5000mAh' },
        { key: 'Display', value: '6.5" Super AMOLED' },
      ],
    },
    {
      title: 'Tecno Spark 20',
      description: 'Lightweight and affordable, with a 50MP camera and clean Android experience for first-time buyers.',
      price: 24999,
      stock: 33,
      images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Tecno_Spark_20.png/500px-Tecno_Spark_20.png'],
      specs: [
        { key: 'RAM', value: '8GB' },
        { key: 'Storage', value: '128GB' },
        { key: 'Battery', value: '5000mAh' },
        { key: 'Camera', value: '50MP' },
      ],
    },
    {
      title: 'vivo Y100',
      description: '5G speed, a 44MP selfie camera, and 44W FlashCharge in a slim, lightweight body.',
      price: 68999,
      stock: 11,
      images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/VIVO_Y100%EF%BC%882024%E5%B9%B42%E6%9C%8820%E6%97%A5%EF%BC%89.jpg/500px-VIVO_Y100%EF%BC%882024%E5%B9%B42%E6%9C%8820%E6%97%A5%EF%BC%89.jpg'],
      specs: [
        { key: 'RAM', value: '8GB' },
        { key: 'Storage', value: '256GB' },
        { key: 'Battery', value: '5000mAh' },
        { key: 'Network', value: '5G' },
      ],
    },
    {
      title: 'Itel S24',
      description: 'A 108MP camera and Helio G91 chipset bring flagship-grade photography to an entry-level price.',
      price: 26999,
      stock: 19,
      images: ['https://images.pexels.com/photos/288530/pexels-photo-288530.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'RAM', value: '8GB' },
        { key: 'Storage', value: '256GB' },
        { key: 'Battery', value: '5000mAh' },
        { key: 'Camera', value: '108MP' },
      ],
    },
    {
      title: 'Honor X7c',
      description: 'A giant 6000mAh battery and 108MP camera give this budget phone standout endurance.',
      price: 44999,
      stock: 16,
      images: ['https://images.pexels.com/photos/719399/pexels-photo-719399.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'RAM', value: '8GB' },
        { key: 'Storage', value: '256GB' },
        { key: 'Battery', value: '6000mAh' },
        { key: 'Camera', value: '108MP' },
      ],
    },
    {
      title: 'realme C65',
      description: 'A 90Hz display, 50MP camera, and 45W fast charging make this an easy budget recommendation.',
      price: 36999,
      stock: 24,
      images: ['https://images.pexels.com/photos/163065/mobile-phone-android-apps-phone-163065.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'RAM', value: '6GB' },
        { key: 'Storage', value: '128GB' },
        { key: 'Battery', value: '5000mAh' },
        { key: 'Camera', value: '50MP' },
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
    {
      title: '20000mAh Power Bank 22.5W',
      description: 'High-capacity power bank with a digital display and fast charging for multiple full top-ups on the go.',
      price: 3499,
      stock: 30,
      images: ['https://images.pexels.com/photos/10104318/pexels-photo-10104318.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Capacity', value: '20000mAh' },
        { key: 'Output', value: '22.5W' },
        { key: 'Ports', value: '1x USB-C, 1x USB-A' },
      ],
    },
    {
      title: '10000mAh Slim Power Bank 20W PD',
      description: 'Pocket-friendly slim design with USB-C Power Delivery for quick top-ups without the bulk.',
      price: 2299,
      stock: 42,
      images: ['https://images.pexels.com/photos/4072683/pexels-photo-4072683.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Capacity', value: '10000mAh' },
        { key: 'Output', value: '20W PD' },
        { key: 'Ports', value: '1x USB-C, 1x USB-A' },
      ],
    },
    {
      title: '4-Port USB Wall Charger 40W',
      description: 'Charge four devices at once from a single wall socket — ideal for shared desks and family homes.',
      price: 1899,
      stock: 35,
      images: ['https://images.pexels.com/photos/3639031/pexels-photo-3639031.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Output', value: '40W total' },
        { key: 'Ports', value: '2x USB-C, 2x USB-A' },
        { key: 'Cable included', value: 'No' },
      ],
    },
    {
      title: '6-in-1 USB-C Hub 100W PD Charging',
      description: 'Expand a single USB-C port into HDMI, USB-A, and 100W pass-through charging for laptops.',
      price: 5499,
      stock: 13,
      images: ['https://images.pexels.com/photos/4195408/pexels-photo-4195408.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Ports', value: '6-in-1' },
        { key: 'PD Output', value: '100W' },
        { key: 'Video', value: 'HDMI 4K' },
      ],
    },
    {
      title: 'MagSafe-Compatible Wireless Charger 15W',
      description: 'Magnetic snap-on alignment delivers a fast, cable-free 15W charge for compatible phones.',
      price: 2799,
      stock: 20,
      images: ['https://images.pexels.com/photos/7742585/pexels-photo-7742585.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Output', value: '15W' },
        { key: 'Type', value: 'Magnetic wireless' },
        { key: 'Cable included', value: 'Yes' },
      ],
    },
    {
      title: '6-Port Desktop Charging Station',
      description: 'Charge your whole household of gadgets from one organized hub with six independent ports.',
      price: 4299,
      stock: 8,
      images: ['https://images.pexels.com/photos/3921630/pexels-photo-3921630.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Ports', value: '6x USB' },
        { key: 'Output', value: '50W total' },
        { key: 'Cable management', value: 'Built-in' },
      ],
    },
    {
      title: 'Solar Power Bank 30000mAh',
      description: 'Rugged outdoor power bank with a solar panel backup — perfect for travel and emergencies.',
      price: 4999,
      stock: 15,
      images: ['https://images.pexels.com/photos/518530/pexels-photo-518530.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Capacity', value: '30000mAh' },
        { key: 'Output', value: '18W' },
        { key: 'Solar panel', value: 'Yes' },
      ],
    },
    {
      title: '45W Dual Port GaN Charger',
      description: 'Compact GaN charger with two ports that can power a phone and tablet simultaneously at full speed.',
      price: 3299,
      stock: 26,
      images: ['https://images.pexels.com/photos/4097206/pexels-photo-4097206.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Output', value: '45W' },
        { key: 'Ports', value: '1x USB-C, 1x USB-A' },
        { key: 'Technology', value: 'GaN' },
      ],
    },
    {
      title: 'Mini Power Bank 5000mAh Keychain',
      description: 'A tiny keychain-sized backup battery that slips into a pocket for emergency top-ups on the move.',
      price: 899,
      stock: 5,
      images: ['https://images.pexels.com/photos/19495448/pexels-photo-19495448.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Capacity', value: '5000mAh' },
        { key: 'Output', value: '10W' },
        { key: 'Form factor', value: 'Keychain' },
      ],
    },
    {
      title: '65W Laptop Type-C Power Adapter',
      description: 'Single USB-C brick powerful enough to fast-charge laptops, tablets, and phones alike.',
      price: 3999,
      stock: 4,
      images: ['https://images.pexels.com/photos/4219862/pexels-photo-4219862.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      specs: [
        { key: 'Output', value: '65W' },
        { key: 'Ports', value: '1x USB-C' },
        { key: 'Cable included', value: 'No' },
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
    {
      title: 'M10 TWS Wireless Earbuds',
      description: 'Compact true-wireless earbuds with touch controls and a pocket-friendly charging case, built for everyday budget use.',
      price: 1450,
      stock: 4,
      images: ['https://images.pexels.com/photos/33298188/pexels-photo-33298188.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Battery life', value: 'Up to 3 hrs (12 hrs with case)' },
        { key: 'Connectivity', value: 'Bluetooth 5.0' },
        { key: 'Control', value: 'Touch controls' },
        { key: 'Colors', value: 'Black, White' },
      ],
    },
    {
      title: 'F9 Wireless Earbuds with LED Display',
      description: 'Popular market favorite with an LED battery-percentage display on the charging case and punchy bass output.',
      price: 1899,
      stock: 38,
      images: ['https://images.pexels.com/photos/8380433/pexels-photo-8380433.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Battery life', value: 'Up to 4 hrs (20 hrs with case)' },
        { key: 'Connectivity', value: 'Bluetooth 5.0' },
        { key: 'Display', value: 'LED digital battery indicator' },
        { key: 'Mic', value: 'Built-in mic for calls' },
      ],
    },
    {
      title: 'P47 TWS Metal Box Earbuds',
      description: 'Classic P47 model with a sleek metal charging case, a long-running favorite among budget TWS buyers.',
      price: 1250,
      stock: 55,
      images: ['https://images.pexels.com/photos/32769441/pexels-photo-32769441.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Battery life', value: 'Up to 3.5 hrs (15 hrs with case)' },
        { key: 'Connectivity', value: 'Bluetooth 5.0' },
        { key: 'Case', value: 'Metal charging case' },
        { key: 'Water resistance', value: 'Splash resistant' },
      ],
    },
    {
      title: 'M19 Wireless Earbuds with Digital Display',
      description: 'Upgraded TWS earbuds with a smart digital display case and clearer call quality for daily commuting.',
      price: 2199,
      stock: 27,
      images: ['https://images.pexels.com/photos/17810098/pexels-photo-17810098.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Battery life', value: 'Up to 5 hrs (24 hrs with case)' },
        { key: 'Connectivity', value: 'Bluetooth 5.1' },
        { key: 'Display', value: 'Digital LED case display' },
        { key: 'Mic', value: 'Dual mic noise reduction' },
      ],
    },
    {
      title: 'Vooc Buds Pro TWS',
      description: 'Mid-range true-wireless earbuds tuned for deep bass with a stable low-latency connection for gaming and video.',
      price: 3499,
      stock: 21,
      images: ['https://images.pexels.com/photos/4966126/pexels-photo-4966126.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Battery life', value: 'Up to 6 hrs (30 hrs with case)' },
        { key: 'Connectivity', value: 'Bluetooth 5.2, low-latency gaming mode' },
        { key: 'Driver', value: '10mm dynamic driver' },
        { key: 'Water resistance', value: 'IPX5' },
      ],
    },
    {
      title: 'SoundLine Buds X2 ENC',
      description: 'Mid-range earbuds with environmental noise cancellation on calls and a comfortable in-ear fit for all-day wear.',
      price: 4299,
      stock: 16,
      images: ['https://images.pexels.com/photos/14741306/pexels-photo-14741306.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Battery life', value: 'Up to 6.5 hrs (26 hrs with case)' },
        { key: 'Connectivity', value: 'Bluetooth 5.3' },
        { key: 'ENC', value: 'Dual-mic ENC for calls' },
        { key: 'Water resistance', value: 'IPX4' },
      ],
    },
    {
      title: 'AirTune Pro TWS (ANC Lite)',
      description: 'Feature-rich earbuds offering light active noise cancellation and wireless charging support at a mid-range price.',
      price: 6499,
      stock: 12,
      images: ['https://images.pexels.com/photos/7129718/pexels-photo-7129718.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Battery life', value: 'Up to 7 hrs (28 hrs with case)' },
        { key: 'ANC', value: 'Hybrid ANC (light)' },
        { key: 'Connectivity', value: 'Bluetooth 5.3' },
        { key: 'Charging', value: 'USB-C, Qi wireless charging' },
      ],
    },
    {
      title: 'BeatWave BT-500 On-Ear Headphones',
      description: 'Foldable on-ear Bluetooth headphones with punchy bass and a padded headband for comfortable long listening sessions.',
      price: 3299,
      stock: 19,
      images: ['https://images.pexels.com/photos/610945/pexels-photo-610945.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Battery life', value: 'Up to 20 hrs playback' },
        { key: 'Connectivity', value: 'Bluetooth 5.0, 3.5mm aux backup' },
        { key: 'Type', value: 'On-ear, foldable' },
        { key: 'Mic', value: 'Built-in mic' },
      ],
    },
    {
      title: 'ThunderBass BT-900 Over-Ear Headphones',
      description: 'Over-ear wireless headphones with deep bass drivers and soft cushioned ear cups, built for extended music sessions.',
      price: 5499,
      stock: 9,
      images: ['https://images.pexels.com/photos/815494/pexels-photo-815494.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Battery life', value: 'Up to 25 hrs playback' },
        { key: 'Driver', value: '40mm bass-boosted driver' },
        { key: 'Connectivity', value: 'Bluetooth 5.1, 3.5mm aux, micro-SD MP3' },
        { key: 'Type', value: 'Over-ear, cushioned' },
      ],
    },
    {
      title: 'EliteBuds Max TWS (Premium ANC)',
      description: 'Flagship-style true-wireless earbuds with strong active noise cancellation and a premium touch-control charging case.',
      price: 17999,
      stock: 6,
      images: ['https://images.pexels.com/photos/5081398/pexels-photo-5081398.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Battery life', value: 'Up to 8 hrs (36 hrs with case)' },
        { key: 'ANC', value: 'Active Noise Cancellation up to 35dB' },
        { key: 'Connectivity', value: 'Bluetooth 5.3, multipoint pairing' },
        { key: 'Charging', value: 'USB-C, Qi wireless charging' },
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
    {
      title: 'ClearTone 3.5mm Wired Earphones',
      description: 'Reliable everyday wired earphones with a 3.5mm jack and balanced sound for calls and music.',
      price: 280,
      stock: 90,
      images: ['https://images.pexels.com/photos/10997634/pexels-photo-10997634.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Connector', value: '3.5mm jack' },
        { key: 'Mic', value: 'In-line mic' },
        { key: 'Cable length', value: '1.2m' },
        { key: 'Driver', value: '10mm dynamic driver' },
      ],
    },
    {
      title: 'UrbanWire USB-C Earphones',
      description: 'Digital USB-C wired earphones for modern phones without a headphone jack, with crisp in-line controls.',
      price: 450,
      stock: 42,
      images: ['https://images.pexels.com/photos/3394648/pexels-photo-3394648.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Connector', value: 'USB Type-C' },
        { key: 'Mic', value: 'In-line mic' },
        { key: 'Cable length', value: '1.1m' },
        { key: 'Control', value: 'Volume + call button' },
      ],
    },
    {
      title: 'GameStrike Pro Gaming Earphones',
      description: 'Wired gaming earphones with a boom-style in-line mic and deep bass tuned for FPS and mobile gaming.',
      price: 899,
      stock: 24,
      images: ['https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Connector', value: '3.5mm jack' },
        { key: 'Mic', value: 'High-sensitivity in-line mic' },
        { key: 'Cable length', value: '1.3m braided' },
        { key: 'Sound', value: 'Bass-enhanced gaming tuning' },
      ],
    },
    {
      title: 'VolControl Earphones with Remote',
      description: 'Wired earphones with an in-line remote for volume and track control, designed for hands-free convenience.',
      price: 380,
      stock: 60,
      images: ['https://images.pexels.com/photos/14272792/pexels-photo-14272792.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Connector', value: '3.5mm jack' },
        { key: 'Control', value: 'Volume + play/pause remote' },
        { key: 'Mic', value: 'Built-in mic' },
        { key: 'Cable length', value: '1.2m' },
      ],
    },
    {
      title: 'ValuePack Earphones (Bulk 5-Pack)',
      description: 'Budget bulk pack of five basic wired earphones, ideal for offices, schools, or bulk resale.',
      price: 950,
      stock: 15,
      images: ['https://images.pexels.com/photos/7772547/pexels-photo-7772547.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Connector', value: '3.5mm jack' },
        { key: 'Pack size', value: '5 units' },
        { key: 'Cable length', value: '1m each' },
        { key: 'Mic', value: 'No mic (music only)' },
      ],
    },
    {
      title: 'BassLine Metal Wired Earphones',
      description: 'Metal-housing wired earphones delivering extra bass punch with a durable braided cable.',
      price: 520,
      stock: 5,
      images: ['https://images.pexels.com/photos/205926/pexels-photo-205926.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Connector', value: '3.5mm jack' },
        { key: 'Build', value: 'Metal earpiece housing' },
        { key: 'Cable length', value: '1.2m braided' },
        { key: 'Mic', value: 'In-line mic' },
      ],
    },
    {
      title: 'AirFlex Sport Wired Earphones',
      description: 'Lightweight wired sport earphones with ear-hook fit and sweat-resistant coating for workouts.',
      price: 650,
      stock: 33,
      images: ['https://images.pexels.com/photos/9071749/pexels-photo-9071749.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Connector', value: '3.5mm jack' },
        { key: 'Fit', value: 'Ear-hook sport fit' },
        { key: 'Sweat resistance', value: 'IPX4' },
        { key: 'Mic', value: 'In-line mic' },
      ],
    },
    {
      title: 'StudioMic Wired Earphones',
      description: 'Wired earphones with a clear condenser-style in-line mic, well suited for online classes and calls.',
      price: 490,
      stock: 3,
      images: ['https://images.pexels.com/photos/7862517/pexels-photo-7862517.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Connector', value: '3.5mm jack' },
        { key: 'Mic', value: 'Noise-reducing condenser mic' },
        { key: 'Cable length', value: '1.2m' },
        { key: 'Use case', value: 'Calls, online classes' },
      ],
    },
    {
      title: 'FlatWire Tangle-Free Earphones',
      description: 'Flat-cable wired earphones engineered to resist tangling, with a simple no-mic design for pure music listening.',
      price: 220,
      stock: 75,
      images: ['https://images.pexels.com/photos/15367435/pexels-photo-15367435.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Connector', value: '3.5mm jack' },
        { key: 'Cable', value: 'Flat tangle-free design' },
        { key: 'Cable length', value: '1.1m' },
        { key: 'Mic', value: 'No mic' },
      ],
    },
    {
      title: 'DualDrive USB-C Gaming Earphones',
      description: 'USB-C wired gaming earphones with dual drivers for enhanced positional audio, built for mobile esports.',
      price: 1750,
      stock: 11,
      images: ['https://images.pexels.com/photos/30428610/pexels-photo-30428610.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Connector', value: 'USB Type-C' },
        { key: 'Driver', value: 'Dual dynamic drivers' },
        { key: 'Mic', value: 'In-line boom mic' },
        { key: 'Cable length', value: '1.2m' },
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
    {
      title: 'Hydrogel Self-Healing Screen Protector',
      description: 'Ultra-thin flexible hydrogel film that self-heals minor scratches and hugs curved edges for a full-screen fit.',
      price: 249,
      stock: 62,
      images: ['https://images.pexels.com/photos/288479/pexels-photo-288479.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Material', value: 'TPU Hydrogel' },
        { key: 'Compatibility', value: 'Universal (trim-to-fit)' },
        { key: 'Feature', value: 'Self-healing surface' },
      ],
    },
    {
      title: 'Curved Edge Full Glue Tempered Glass',
      description: 'Edge-to-edge tempered glass with UV-cured full glue for a seamless, bubble-free fit on curved-screen phones.',
      price: 599,
      stock: 34,
      images: ['https://images.pexels.com/photos/8490075/pexels-photo-8490075.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Hardness', value: '9H' },
        { key: 'Coverage', value: 'Full curved edge' },
        { key: 'Adhesive', value: 'UV full glue' },
      ],
    },
    {
      title: 'Blue Light Filter Screen Protector',
      description: 'Tempered glass protector that filters harmful blue light to reduce eye strain during long screen sessions.',
      price: 449,
      stock: 28,
      images: ['https://images.pexels.com/photos/5843446/pexels-photo-5843446.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Hardness', value: '9H' },
        { key: 'Filter', value: 'Anti blue-light coating' },
        { key: 'Coverage', value: 'Edge-to-edge' },
      ],
    },
    {
      title: 'Anti-Shatter Shock Absorption Film',
      description: 'Flexible polymer film engineered to absorb impact and prevent shattering, ideal for drop-prone users.',
      price: 199,
      stock: 55,
      images: ['https://images.pexels.com/photos/248512/pexels-photo-248512.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Material', value: 'PET anti-shatter film' },
        { key: 'Feature', value: 'Shock absorption' },
        { key: 'Coverage', value: 'Full screen' },
      ],
    },
    {
      title: 'Front + Back Tempered Glass Combo Pack',
      description: 'Twin-pack of 9H tempered glass for both front screen and rear panel, giving your phone all-round protection.',
      price: 599,
      stock: 21,
      images: ['https://images.pexels.com/photos/8829444/pexels-photo-8829444.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Hardness', value: '9H' },
        { key: 'Pack', value: 'Front + Back (2 pcs)' },
        { key: 'Coverage', value: 'Full front and rear' },
      ],
    },
    {
      title: '10-inch Tablet Screen Protector',
      description: 'Crystal-clear tempered glass sized for 10-inch tablets, keeping the display scratch-free with smooth touch response.',
      price: 699,
      stock: 17,
      images: ['https://images.pexels.com/photos/6712477/pexels-photo-6712477.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Hardness', value: '9H' },
        { key: 'Compatibility', value: '10-inch tablets' },
        { key: 'Touch sensitivity', value: 'Full response' },
      ],
    },
    {
      title: 'Smartwatch Screen Protector (3-Pack)',
      description: 'Set of 3 flexible film protectors sized for popular smartwatch displays, guarding against scuffs and scratches.',
      price: 179,
      stock: 48,
      images: ['https://images.pexels.com/photos/5081914/pexels-photo-5081914.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Material', value: 'Flexible TPU film' },
        { key: 'Pack', value: '3 pieces' },
        { key: 'Compatibility', value: 'Round & square watch faces' },
      ],
    },
    {
      title: 'Ceramic Flexible Screen Protector',
      description: 'Nano-ceramic film that combines glass-like clarity with flexible, shatterproof durability for everyday drops.',
      price: 399,
      stock: 5,
      images: ['https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Material', value: 'Nano-ceramic' },
        { key: 'Hardness', value: 'Shatterproof' },
        { key: 'Coverage', value: 'Full screen' },
      ],
    },
    {
      title: 'Full Cover Privacy Glass with Applicator Kit',
      description: 'Anti-spy tempered glass with a built-in dust-free applicator tray for a perfect, bubble-free install every time.',
      price: 549,
      stock: 3,
      images: ['https://images.pexels.com/photos/7568299/pexels-photo-7568299.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Hardness', value: '9H' },
        { key: 'Privacy angle', value: '±28 degrees' },
        { key: 'Kit', value: 'Includes applicator tray' },
      ],
    },
    {
      title: 'Nano Liquid Screen Protector Kit',
      description: 'Invisible liquid nano-coating that bonds to the screen for scratch resistance without adding any bulk or glare.',
      price: 349,
      stock: 39,
      images: ['https://images.pexels.com/photos/13826750/pexels-photo-13826750.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Type', value: 'Liquid nano coating' },
        { key: 'Compatibility', value: 'Universal, all devices' },
        { key: 'Finish', value: 'Invisible, glare-free' },
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
    {
      title: 'USB-C Braided Cable 2m',
      description: 'Extra-long nylon braided USB-C cable built for tangle-free daily charging and fast data transfer.',
      price: 449,
      stock: 58,
      images: ['https://images.pexels.com/photos/4219867/pexels-photo-4219867.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Length', value: '2m' },
        { key: 'Connector', value: 'USB-C to USB-A' },
        { key: 'Fast charging', value: 'Up to 18W' },
        { key: 'Build', value: 'Nylon braided' },
      ],
    },
    {
      title: 'HDMI Cable 1.5m',
      description: 'High-speed HDMI cable for crisp 4K video and audio between laptops, consoles, and TVs.',
      price: 599,
      stock: 24,
      images: ['https://images.pexels.com/photos/12997230/pexels-photo-12997230.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Length', value: '1.5m' },
        { key: 'Resolution support', value: 'Up to 4K@30Hz' },
        { key: 'Connector', value: 'HDMI to HDMI' },
      ],
    },
    {
      title: '3-in-1 Keychain Charging Cable',
      description: 'Compact keyring cable with Lightning, USB-C, and Micro USB tips so you are always ready to charge on the go.',
      price: 349,
      stock: 45,
      images: ['https://images.pexels.com/photos/4219862/pexels-photo-4219862.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Length', value: '12cm' },
        { key: 'Connector', value: 'Lightning + USB-C + Micro USB' },
        { key: 'Portability', value: 'Keychain clip' },
      ],
    },
    {
      title: 'USB-C to USB-C Cable 0.5m',
      description: 'Short, sturdy USB-C to USB-C cable ideal for power banks, car chargers, and tight desk setups.',
      price: 249,
      stock: 66,
      images: ['https://images.pexels.com/photos/3921630/pexels-photo-3921630.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Length', value: '0.5m' },
        { key: 'Connector', value: 'USB-C to USB-C' },
        { key: 'Fast charging', value: 'Up to 60W PD' },
      ],
    },
    {
      title: 'Type-C OTG Adapter',
      description: 'Plug-and-play USB-C OTG adapter that lets you connect flash drives, mice, and keyboards to your phone or tablet.',
      price: 199,
      stock: 52,
      images: ['https://images.pexels.com/photos/10336136/pexels-photo-10336136.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Connector', value: 'USB-C to USB-A' },
        { key: 'Compatibility', value: 'OTG-enabled Android devices' },
        { key: 'Data transfer', value: 'USB 3.0' },
      ],
    },
    {
      title: 'USB Extension Cable 1.5m',
      description: 'USB-A extension cable that lengthens the reach of your printer, webcam, or USB hub without signal loss.',
      price: 299,
      stock: 31,
      images: ['https://images.pexels.com/photos/12266914/pexels-photo-12266914.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Length', value: '1.5m' },
        { key: 'Connector', value: 'USB-A Male to USB-A Female' },
        { key: 'Data transfer', value: 'USB 2.0' },
      ],
    },
    {
      title: 'Aux Audio Cable 1m (3.5mm)',
      description: 'Reliable 3.5mm aux cable for clean stereo audio between your phone and car stereo or speakers.',
      price: 179,
      stock: 4,
      images: ['https://images.pexels.com/photos/4089492/pexels-photo-4089492.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Length', value: '1m' },
        { key: 'Connector', value: '3.5mm to 3.5mm' },
        { key: 'Audio', value: 'Stereo, gold-plated jack' },
      ],
    },
    {
      title: 'Lightning Braided Cable 2m',
      description: 'Long-length braided Lightning cable that survives daily bends and delivers fast, stable charging for iPhones.',
      price: 499,
      stock: 40,
      images: ['https://images.pexels.com/photos/1643753/pexels-photo-1643753.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Length', value: '2m' },
        { key: 'Connector', value: 'Lightning to USB-A' },
        { key: 'Build', value: 'Nylon braided' },
        { key: 'Fast charging', value: 'Supported' },
      ],
    },
    {
      title: 'Micro USB to USB-C Adapter',
      description: 'Small plug-in adapter that converts any Micro USB cable into a USB-C connector for older device compatibility.',
      price: 149,
      stock: 5,
      images: ['https://images.pexels.com/photos/4097206/pexels-photo-4097206.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Connector', value: 'Micro USB (F) to USB-C (M)' },
        { key: 'Compatibility', value: 'Universal Android devices' },
        { key: 'Data transfer', value: 'Supported' },
      ],
    },
    {
      title: 'USB-C to HDMI Cable',
      description: 'Direct USB-C to HDMI cable that mirrors your laptop or phone screen to a TV or monitor in sharp 4K.',
      price: 899,
      stock: 14,
      images: ['https://images.pexels.com/photos/4480525/pexels-photo-4480525.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Length', value: '1.8m' },
        { key: 'Connector', value: 'USB-C to HDMI' },
        { key: 'Resolution support', value: 'Up to 4K@30Hz' },
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
    {
      title: 'Rugged Armor Shockproof Case',
      description: 'Military-grade dual-layer armor case that absorbs drops and knocks while keeping your phone slim enough for everyday carry.',
      price: 1099,
      stock: 42,
      images: ['https://images.pexels.com/photos/19557532/pexels-photo-19557532.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Material', value: 'TPU bumper with polycarbonate hard back' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
        { key: 'Protection', value: 'Military-grade drop protection up to 1.8m' },
      ],
    },
    {
      title: 'Multi-Slot Wallet Card Case',
      description: 'A folio-style wallet case with three card slots and a cash pocket so you can leave your wallet at home.',
      price: 1450,
      stock: 27,
      images: ['https://images.pexels.com/photos/13706809/pexels-photo-13706809.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Material', value: 'PU leather with soft microfiber lining' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
        { key: 'Features', value: '3 card slots, 1 cash pocket, magnetic closure' },
      ],
    },
    {
      title: 'Ring Holder Kickstand Case',
      description: 'A slim protective case with a built-in 360-degree rotating ring holder that doubles as a hands-free kickstand.',
      price: 650,
      stock: 58,
      images: ['https://images.pexels.com/photos/3392232/pexels-photo-3392232.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Material', value: 'Soft-touch TPU with metal ring mount' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
        { key: 'Features', value: '360-degree ring holder, adjustable kickstand' },
      ],
    },
    {
      title: 'Marble Pattern Glossy Case',
      description: 'A glossy marble-print case that gives your phone a polished, premium look without adding bulk.',
      price: 550,
      stock: 65,
      images: ['https://images.pexels.com/photos/28077969/pexels-photo-28077969.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Material', value: 'Hybrid soft TPU with glossy hard-coat print' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
        { key: 'Features', value: 'Scratch-resistant glossy marble finish' },
      ],
    },
    {
      title: 'MagSafe-Compatible Clear Case',
      description: 'A crystal-clear case with built-in magnets for snap-on wireless chargers and MagSafe accessories.',
      price: 1350,
      stock: 4,
      images: ['https://images.pexels.com/photos/18403793/pexels-photo-18403793.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Material', value: 'Anti-yellowing clear TPU with built-in magnet ring' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
        { key: 'Features', value: 'MagSafe-compatible magnetic ring, wireless charging pass-through' },
      ],
    },
    {
      title: 'Waterproof Pouch Case',
      description: 'A fully sealed waterproof pouch that protects your phone at the pool, beach, or in the rain while keeping the touchscreen usable.',
      price: 450,
      stock: 73,
      images: ['https://images.pexels.com/photos/8481934/pexels-photo-8481934.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Material', value: 'PVC waterproof film with sealed strip lock' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
        { key: 'Protection', value: 'IPX8 waterproof up to 30 minutes submerged' },
      ],
    },
    {
      title: 'Carbon Fiber Texture Case',
      description: 'A slim case with a woven carbon-fiber-look finish that gives a sporty, technical edge and a non-slip grip.',
      price: 750,
      stock: 31,
      images: ['https://images.pexels.com/photos/19784109/pexels-photo-19784109.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Material', value: 'TPU with woven carbon-fiber texture finish' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
        { key: 'Features', value: 'Non-slip textured grip, raised camera bezel' },
      ],
    },
    {
      title: 'Embossed 3D Pattern Case',
      description: 'A soft silicone case with a raised embossed pattern that adds texture and grip while standing out from plain covers.',
      price: 600,
      stock: 39,
      images: ['https://images.pexels.com/photos/374117/pexels-photo-374117.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Material', value: 'Soft-touch silicone with embossed relief print' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
        { key: 'Features', value: 'Raised 3D textured pattern, anti-slip sides' },
      ],
    },
    {
      title: 'Selfie Ring Light Case',
      description: 'A case with a built-in rechargeable LED ring light around the rear camera for perfectly lit selfies and video calls.',
      price: 1650,
      stock: 12,
      images: ['https://images.pexels.com/photos/12199411/pexels-photo-12199411.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Material', value: 'Polycarbonate shell with built-in LED ring' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
        { key: 'Features', value: 'USB-rechargeable LED ring light, 3 brightness levels' },
      ],
    },
    {
      title: 'Minimalist Ultra-Thin Case',
      description: 'A featherlight 0.5mm case that adds almost no bulk while covering the back and edges from everyday scuffs.',
      price: 350,
      stock: 84,
      images: ['https://images.pexels.com/photos/7742554/pexels-photo-7742554.jpeg?auto=compress&cs=tinysrgb&w=800'],
      specs: [
        { key: 'Material', value: 'Ultra-thin matte polypropylene' },
        { key: 'Compatibility', value: 'Universal (specify model at checkout note)' },
        { key: 'Features', value: '0.5mm slim profile, precise cutouts' },
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
      name: 'SnapCell Admin',
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
