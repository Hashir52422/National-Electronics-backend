const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const Product = require('../models/Product');

// @route GET /api/v1/wishlist
// @access Private
const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist');

  // Silently drop any refs to products that no longer exist rather than
  // erroring — populate() leaves those entries as null.
  const products = (user.wishlist || []).filter(Boolean);

  res.status(200).json({ products });
});

// @route POST /api/v1/wishlist/:productId
// @access Private
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'Invalid product id');
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { wishlist: productId } },
    { new: true }
  );

  res.status(200).json({ productIds: user.wishlist.map((id) => String(id)) });
});

// @route DELETE /api/v1/wishlist/:productId
// @access Private
const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'Invalid product id');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { wishlist: productId } },
    { new: true }
  );

  res.status(200).json({ productIds: user.wishlist.map((id) => String(id)) });
});

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
