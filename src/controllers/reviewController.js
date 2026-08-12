const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Review = require('../models/Review');
const Product = require('../models/Product');

// Recomputes and persists a product's averageRating/numReviews from its
// current set of reviews. Returns the { averageRating, numReviews } used.
async function recomputeProductRating(productId) {
  const [stats] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  const averageRating = stats ? Math.round(stats.averageRating * 10) / 10 : 0;
  const numReviews = stats ? stats.numReviews : 0;

  await Product.findByIdAndUpdate(productId, { averageRating, numReviews });

  return { averageRating, numReviews };
}

// @route GET /api/v1/products/:productId/reviews
// @access Public
const listReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'Invalid product id');
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const reviews = await Review.find({ product: productId })
    .sort({ createdAt: -1 })
    .populate('user', 'name');

  res.status(200).json({
    reviews,
    averageRating: product.averageRating,
    numReviews: product.numReviews,
  });
});

// @route POST /api/v1/products/:productId/reviews
// @access Private
const upsertReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'Invalid product id');
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, 'rating must be an integer between 1 and 5');
  }

  const existing = await Review.findOne({ product: productId, user: req.user._id });

  let review;
  let statusCode;

  if (existing) {
    existing.rating = rating;
    existing.comment = comment !== undefined ? comment : existing.comment;
    review = await existing.save();
    statusCode = 200;
  } else {
    review = await Review.create({
      product: productId,
      user: req.user._id,
      rating,
      comment: comment || '',
    });
    statusCode = 201;
  }

  const { averageRating, numReviews } = await recomputeProductRating(productId);

  await review.populate('user', 'name');

  res.status(statusCode).json({ review, averageRating, numReviews });
});

// @route DELETE /api/v1/products/:productId/reviews/:reviewId
// @access Private (owner or admin)
const deleteReview = asyncHandler(async (req, res) => {
  const { productId, reviewId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(reviewId)) {
    throw new ApiError(400, 'Invalid product or review id');
  }

  const review = await Review.findOne({ _id: reviewId, product: productId });
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  const isOwner = String(review.user) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'Not authorized to delete this review');
  }

  await review.deleteOne();

  const { averageRating, numReviews } = await recomputeProductRating(productId);

  res.status(200).json({ success: true, averageRating, numReviews });
});

module.exports = {
  listReviews,
  upsertReview,
  deleteReview,
};
