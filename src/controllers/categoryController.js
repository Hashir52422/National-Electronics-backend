const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const slugify = require('../utils/slugify');
const Category = require('../models/Category');

// @route GET /api/v1/categories
// @access Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().populate('parentCategory', 'name slug').sort({ name: 1 });
  res.status(200).json({ categories });
});

// @route POST /api/v1/categories
// @access Admin
const createCategory = asyncHandler(async (req, res) => {
  const { name, parentCategory } = req.body;

  if (!name || !String(name).trim()) {
    throw new ApiError(400, 'Category name is required');
  }

  if (parentCategory) {
    const parent = await Category.findById(parentCategory);
    if (!parent) {
      throw new ApiError(400, 'parentCategory does not exist');
    }
  }

  const slug = slugify(name);

  const existing = await Category.findOne({ slug });
  if (existing) {
    throw new ApiError(400, 'A category with this name/slug already exists');
  }

  const category = await Category.create({
    name: name.trim(),
    slug,
    parentCategory: parentCategory || null,
  });

  res.status(201).json({ category });
});

// @route PUT /api/v1/categories/:id
// @access Admin
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, parentCategory } = req.body;

  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  if (parentCategory) {
    if (String(parentCategory) === String(id)) {
      throw new ApiError(400, 'A category cannot be its own parent');
    }
    const parent = await Category.findById(parentCategory);
    if (!parent) {
      throw new ApiError(400, 'parentCategory does not exist');
    }
    category.parentCategory = parentCategory;
  } else if (parentCategory === null) {
    category.parentCategory = null;
  }

  if (name && String(name).trim()) {
    const newSlug = slugify(name);
    if (newSlug !== category.slug) {
      const existing = await Category.findOne({ slug: newSlug, _id: { $ne: id } });
      if (existing) {
        throw new ApiError(400, 'A category with this name/slug already exists');
      }
      category.slug = newSlug;
    }
    category.name = name.trim();
  }

  await category.save();

  res.status(200).json({ category });
});

// @route DELETE /api/v1/categories/:id
// @access Admin
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const childCount = await Category.countDocuments({ parentCategory: id });
  if (childCount > 0) {
    throw new ApiError(400, 'Cannot delete a category that has subcategories');
  }

  await category.deleteOne();

  res.status(200).json({ message: 'Category deleted successfully' });
});

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
