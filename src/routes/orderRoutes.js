const express = require('express');
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
} = require('../controllers/orderController');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Works for both guest and logged-in checkout: optionalAuth attaches
// req.user only if a valid Bearer token is present.
router.post('/', optionalAuth, createOrder);

// IMPORTANT: /my and /:id must be declared before admin-only GET / to
// avoid route-matching conflicts, and /my must precede /:id.
router.get('/my', protect, getMyOrders);
router.get('/', protect, adminOnly, getAllOrders);
router.get('/:id', protect, getOrderById);
router.patch('/:id/status', protect, adminOnly, updateOrderStatus);

module.exports = router;
