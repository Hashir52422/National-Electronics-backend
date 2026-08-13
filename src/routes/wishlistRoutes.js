const express = require('express');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getWishlist);
router.post('/:productId', protect, addToWishlist);
router.delete('/:productId', protect, removeFromWishlist);

module.exports = router;
