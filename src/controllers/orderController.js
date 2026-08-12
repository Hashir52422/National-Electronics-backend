const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Order = require('../models/Order');
const Product = require('../models/Product');

const VALID_STATUSES = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];

// Atomically decrements stock for a single product, only succeeding if
// enough stock is currently available. Returns the updated product, or
// null if there wasn't enough stock (prevents overselling under
// concurrent orders without requiring a multi-document transaction).
async function decrementStock(productId, quantity) {
  return Product.findOneAndUpdate(
    { _id: productId, isActive: true, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { new: true }
  );
}

async function restoreStock(productId, quantity) {
  await Product.updateOne({ _id: productId }, { $inc: { stock: quantity } });
}

// @route POST /api/v1/orders
// @access Public (guest) / Private (logged-in, via optionalAuth)
const createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, contactName, contactPhone, contactEmail } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Order must include at least one item');
  }

  for (const item of items) {
    if (!item.product || !mongoose.Types.ObjectId.isValid(item.product)) {
      throw new ApiError(400, 'Each item must reference a valid product id');
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new ApiError(400, 'Each item must have a quantity of at least 1');
    }
  }

  if (
    !shippingAddress ||
    !shippingAddress.line1 ||
    !shippingAddress.city ||
    !shippingAddress.phone
  ) {
    throw new ApiError(400, 'shippingAddress with line1, city and phone is required');
  }

  if (!contactName || !contactPhone) {
    throw new ApiError(400, 'contactName and contactPhone are required');
  }

  // Fetch current product state (never trust client-supplied price).
  const productIds = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productsById = new Map(products.map((p) => [String(p._id), p]));

  const orderItems = [];
  let totalAmount = 0;

  for (const item of items) {
    const product = productsById.get(String(item.product));

    if (!product || !product.isActive) {
      throw new ApiError(400, `Product ${item.product} is not available`);
    }
    if (product.stock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for "${product.title}"`);
    }

    orderItems.push({
      product: product._id,
      title: product.title,
      price: product.price,
      quantity: item.quantity,
    });

    totalAmount += product.price * item.quantity;
  }

  // Decrement stock atomically per item. If any item fails (e.g. lost a
  // race to another concurrent order), roll back everything already
  // decremented and reject the whole order.
  const decremented = [];
  for (const item of orderItems) {
    const updated = await decrementStock(item.product, item.quantity);
    if (!updated) {
      for (const done of decremented) {
        await restoreStock(done.product, done.quantity);
      }
      throw new ApiError(400, `Insufficient stock for "${item.title}"`);
    }
    decremented.push(item);
  }

  let order;
  try {
    order = await Order.create({
      user: req.user ? req.user._id : null,
      guestInfo: req.user
        ? undefined
        : { name: contactName, phone: contactPhone, address: shippingAddress.line1 },
      shippingAddress: {
        line1: shippingAddress.line1,
        city: shippingAddress.city,
        phone: shippingAddress.phone,
      },
      contactName,
      contactPhone,
      contactEmail,
      items: orderItems,
      totalAmount,
      paymentMethod: 'COD',
      status: 'placed',
    });
  } catch (err) {
    // Order creation failed after stock was already decremented — roll back.
    for (const done of decremented) {
      await restoreStock(done.product, done.quantity);
    }
    throw err;
  }

  res.status(201).json({ order });
});

// @route GET /api/v1/orders/my
// @access Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ orders });
});

// @route GET /api/v1/orders/:id
// @access Private (owner or admin)
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid order id');
  }

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const isOwner = order.user && String(order.user) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'Not authorized to view this order');
  }

  res.status(200).json({ order });
});

// @route GET /api/v1/orders
// @access Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      throw new ApiError(400, `status must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    filter.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    orders,
    total,
    page: pageNum,
    pages: Math.max(1, Math.ceil(total / limitNum)),
  });
});

// @route PATCH /api/v1/orders/:id/status
// @access Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid order id');
  }

  if (!status || !VALID_STATUSES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // If an order is being cancelled (and wasn't already), restock items.
  if (status === 'cancelled' && order.status !== 'cancelled') {
    for (const item of order.items) {
      await restoreStock(item.product, item.quantity);
    }
  }

  order.status = status;
  await order.save();

  res.status(200).json({ order });
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
};
