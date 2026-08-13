const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const generateToken = require('../utils/generateToken');
const User = require('../models/User');

// @route POST /api/v1/auth/register
// @access Public
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email and password are required');
  }

  if (typeof password !== 'string' || password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long');
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(400, 'A user with this email already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email: normalizedEmail,
    phone,
    passwordHash,
  });

  const token = generateToken(user._id);

  res.status(201).json({ token, user: user.toSafeObject() });
});

// @route POST /api/v1/auth/login
// @access Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = generateToken(user._id);

  res.status(200).json({ token, user: user.toSafeObject() });
});

// @route GET /api/v1/auth/me
// @access Private
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ user: req.user.toSafeObject() });
});

module.exports = { register, login, getMe };
