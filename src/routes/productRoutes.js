const express = require('express');
const {
  getProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');
const reviewRoutes = require('./reviewRoutes');

const router = express.Router();

// Nested under /:productId so review controllers get productId via
// mergeParams. Declared before /:slug so "/:productId/reviews" isn't
// swallowed by the single-segment slug route.
router.use('/:productId/reviews', reviewRoutes);

router.get('/', getProducts);
router.get('/:slug', getProductBySlug);
router.post('/', protect, adminOnly, createProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;
