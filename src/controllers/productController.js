const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const slugify = require('../utils/slugify');
const Product = require('../models/Product');
const Category = require('../models/Category');

// Normalizes the `specs` field from the request body into the
// [{ key, value }] shape expected by the schema. Accepts either an
// array of {key,value} objects or a plain object map.
function normalizeSpecs(specs) {
  if (specs === undefined || specs === null) return undefined;

  if (Array.isArray(specs)) {
    return specs
      .filter((s) => s && s.key !== undefined && s.value !== undefined)
      .map((s) => ({ key: String(s.key), value: String(s.value) }));
  }

  if (typeof specs === 'object') {
    return Object.entries(specs).map(([key, value]) => ({ key, value: String(value) }));
  }

  return undefined;
}

// @route GET /api/v1/products
// @access Public
const getProducts = asyncHandler(async (req, res) => {
  const { category, search, minPrice, maxPrice, sort, page = 1, limit = 20 } = req.query;

  const filter = { isActive: true };

  if (category) {
    // Accept either a category ObjectId or a category slug.
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(category);
    if (isObjectId) {
      filter.category = category;
    } else {
      const categoryDoc = await Category.findOne({ slug: category });
      filter.category = categoryDoc ? categoryDoc._id : null;
    }
  }

  if (search) {
    // Regex partial match (rather than $text) so results appear while the
    // user is still typing, not only once a full word is entered.
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'i');
    filter.$or = [{ title: pattern }, { description: pattern }];
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  let sortOption = { createdAt: -1 }; // newest by default
  if (sort === 'price_asc') sortOption = { price: 1 };
  else if (sort === 'price_desc') sortOption = { price: -1 };
  else if (sort === 'newest') sortOption = { createdAt: -1 };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    products,
    total,
    page: pageNum,
    pages: Math.max(1, Math.ceil(total / limitNum)),
  });
});

// @route GET /api/v1/products/:slug
// @access Public
const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true }).populate(
    'category',
    'name slug'
  );

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  res.status(200).json({ product });
});

// @route POST /api/v1/products
// @access Admin
const createProduct = asyncHandler(async (req, res) => {
  const { title, description, price, category, images, specs, stock, isActive } = req.body;

  if (!title || !String(title).trim()) {
    throw new ApiError(400, 'Product title is required');
  }
  if (price === undefined || Number.isNaN(Number(price)) || Number(price) < 0) {
    throw new ApiError(400, 'A valid, non-negative price is required');
  }
  if (!category) {
    throw new ApiError(400, 'Category is required');
  }

  const categoryDoc = await Category.findById(category);
  if (!categoryDoc) {
    throw new ApiError(400, 'Category does not exist');
  }

  const slug = slugify(title);
  const existing = await Product.findOne({ slug });
  if (existing) {
    throw new ApiError(400, 'A product with this title/slug already exists');
  }

  const product = await Product.create({
    title: title.trim(),
    slug,
    description: description || '',
    price: Number(price),
    category,
    images: Array.isArray(images) ? images : [],
    specs: normalizeSpecs(specs) || [],
    stock: stock !== undefined ? Number(stock) : 0,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  res.status(201).json({ product });
});

// @route PUT /api/v1/products/:id
// @access Admin
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, price, category, images, specs, stock, isActive } = req.body;

  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (category) {
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      throw new ApiError(400, 'Category does not exist');
    }
    product.category = category;
  }

  if (title && String(title).trim()) {
    const newSlug = slugify(title);
    if (newSlug !== product.slug) {
      const existing = await Product.findOne({ slug: newSlug, _id: { $ne: id } });
      if (existing) {
        throw new ApiError(400, 'A product with this title/slug already exists');
      }
      product.slug = newSlug;
    }
    product.title = title.trim();
  }

  if (description !== undefined) product.description = description;

  if (price !== undefined) {
    if (Number.isNaN(Number(price)) || Number(price) < 0) {
      throw new ApiError(400, 'Price must be a valid, non-negative number');
    }
    product.price = Number(price);
  }

  if (images !== undefined) {
    if (!Array.isArray(images)) {
      throw new ApiError(400, 'images must be an array of strings');
    }
    product.images = images;
  }

  if (specs !== undefined) {
    product.specs = normalizeSpecs(specs) || [];
  }

  if (stock !== undefined) {
    if (Number.isNaN(Number(stock)) || Number(stock) < 0) {
      throw new ApiError(400, 'Stock must be a valid, non-negative number');
    }
    product.stock = Number(stock);
  }

  if (isActive !== undefined) {
    product.isActive = Boolean(isActive);
  }

  await product.save();

  res.status(200).json({ product });
});

// @route DELETE /api/v1/products/:id
// @access Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  await product.deleteOne();

  res.status(200).json({ message: 'Product deleted successfully' });
});

module.exports = {
  getProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
};
