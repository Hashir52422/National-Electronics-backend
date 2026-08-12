const express = require('express');
const { listReviews, upsertReview, deleteReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

// mergeParams so :productId from the parent router (productRoutes) is
// available on req.params here.
const router = express.Router({ mergeParams: true });

router.get('/', listReviews);
router.post('/', protect, upsertReview);
router.delete('/:reviewId', protect, deleteReview);

module.exports = router;
