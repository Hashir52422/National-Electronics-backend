# SnapCell — Backend API

REST API for SnapCell, a single-vendor electronics e-commerce MVP. Built with Node.js, Express, and MongoDB (Mongoose). Auth uses JWT bearer tokens; passwords are hashed with bcrypt.

## Setup

1. Install dependencies:
   ```
   cd backend
   npm install
   ```

2. Create your `.env` file from the example and fill in real values:
   ```
   cp .env.example .env
   ```

   | Variable | Description |
   |---|---|
   | `MONGODB_URI` | MongoDB connection string (local or MongoDB Atlas) |
   | `JWT_SECRET` | Long random secret used to sign JWTs |
   | `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
   | `PORT` | Port the API listens on (default `5000`) |
   | `CLIENT_URL` | Frontend origin, used for CORS (e.g. `http://localhost:3000`) |

3. Run in development (auto-restart via nodemon):
   ```
   npm run dev
   ```

4. Run in production:
   ```
   npm start
   ```

The API is versioned under `/api/v1`. A `GET /health` endpoint is available for uptime checks.

### Creating an admin user

There is no seed script in the MVP. To promote a user to `admin`, register normally via `POST /api/v1/auth/register` and then manually update that user's `role` field to `"admin"` directly in MongoDB (e.g. via `mongosh` or MongoDB Compass).

## Project structure

```
backend/
  src/
    config/db.js           MongoDB connection
    models/                 Mongoose schemas: User, Category, Product, Order, Review
    middleware/              auth (protect/adminOnly/optionalAuth), errorHandler
    controllers/             route handlers
    routes/                  Express routers
    utils/                   asyncHandler, generateToken, slugify, ApiError
    app.js                   Express app (middleware + route mounting)
    server.js                entry point (connects to Mongo, starts the server)
```

## Authentication

Send `Authorization: Bearer <token>` on any request that requires a logged-in user. Tokens are issued on register/login and contain the user's id.

Roles: `customer` (default) and `admin`. Admin-only routes require both a valid token and `role: "admin"` on the user.

## Error format

All error responses are JSON in the shape:
```json
{ "message": "Human-readable error message" }
```
with an appropriate HTTP status code (400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 500 server error).

## API Endpoints

Base URL: `/api/v1`

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Body: `{ name, email, phone, password }` → `201 { token, user }` |
| POST | `/auth/login` | Public | Body: `{ email, password }` → `200 { token, user }` |
| GET | `/auth/me` | Bearer token | → `200 { user }` |

### Categories

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/categories` | Public | → `{ categories }` |
| POST | `/categories` | Admin | Body: `{ name, parentCategory? }` → `201 { category }` |
| PUT | `/categories/:id` | Admin | Body: `{ name?, parentCategory? }` → `{ category }` |
| DELETE | `/categories/:id` | Admin | → `{ message }` (fails if it has subcategories) |

### Products

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/products` | Public | Query: `category` (id or slug), `search`, `minPrice`, `maxPrice`, `sort` (`price_asc`\|`price_desc`\|`newest`), `page`, `limit` → `{ products, total, page, pages }`. Only returns active products. |
| GET | `/products/:slug` | Public | → `{ product }` |
| POST | `/products` | Admin | Body: `{ title, description, price, category, images[], specs[] or {}, stock, isActive }` → `201 { product }` |
| PUT | `/products/:id` | Admin | Partial update, same fields as create → `{ product }` |
| DELETE | `/products/:id` | Admin | → `{ message }` |

`specs` may be sent either as an array of `{ key, value }` objects or as a plain `{ key: value }` object — both are normalized to `[{ key, value }]` internally.

Products also carry denormalized `averageRating` and `numReviews` fields (recomputed automatically whenever a review is created, updated, or deleted — see Reviews below), returned as-is on `GET /products` and `GET /products/:slug`.

### Reviews

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/products/:productId/reviews` | Public | → `{ reviews: [{ _id, user: { _id, name }, rating, comment, createdAt }], averageRating, numReviews }`. Newest first. |
| POST | `/products/:productId/reviews` | Bearer token | Body: `{ rating (1-5 integer), comment? }` → `201`/`200` `{ review, averageRating, numReviews }`. Upsert: one review per user per product — resubmitting updates the existing review instead of creating a duplicate. Recomputes and persists the product's `averageRating`/`numReviews` (rounded to 1 decimal) after every write. |
| DELETE | `/products/:productId/reviews/:reviewId` | Bearer token (owner or admin) | → `{ success: true, averageRating, numReviews }`. |

### Wishlist

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/wishlist` | Bearer token | → `{ products }` — the logged-in user's wishlisted products (refs to deleted products are silently dropped). |
| POST | `/wishlist/:productId` | Bearer token | Adds the product if not already present → `{ productIds: string[] }`. 404 if the product doesn't exist. |
| DELETE | `/wishlist/:productId` | Bearer token | Removes the product → `{ productIds: string[] }`. |

### Orders

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/orders` | Public (guest) or Bearer token (logged-in) | Body: `{ items: [{ product, quantity }], shippingAddress: { line1, city, phone }, contactName, contactPhone, contactEmail? }` → `201 { order }`. Validates stock, computes `totalAmount` from current server-side product prices, atomically decrements stock, rejects the whole order if any item is out of stock. |
| GET | `/orders/my` | Bearer token | → `{ orders }` for the logged-in user |
| GET | `/orders/:id` | Bearer token (owner or admin) | → `{ order }` |
| GET | `/orders` | Admin | Query: `status`, `page`, `limit` → `{ orders, total, page, pages }` |
| PATCH | `/orders/:id/status` | Admin | Body: `{ status }` (`placed`\|`confirmed`\|`shipped`\|`delivered`\|`cancelled`) → `{ order }`. Cancelling restores stock. |

## Notes on implementation choices

- **Stock decrement without a Mongo replica set:** True multi-document transactions require a MongoDB replica set, which isn't guaranteed in every deployment target. Instead, stock is decremented with a single atomic conditional update per item (`findOneAndUpdate({ stock: { $gte: quantity } }, { $inc: { stock: -quantity } })`), which is race-safe on its own. If any item in a multi-item order fails this check (or order creation itself fails), previously-decremented items in the same request are rolled back before returning an error, so an order is never left half-applied under normal operation.
- **Guest vs. registered orders:** Every order stores `shippingAddress`, `contactName`, `contactPhone`, and optional `contactEmail` regardless of guest/registered status (per the "simplest" guidance in the spec). `guestInfo` is additionally populated for orders with no `user`, and `user` is set from the JWT when present (`optionalAuth` middleware — attaches `req.user` if a valid Bearer token is provided, without requiring one).
- **Category delete guard:** Deleting a category that still has subcategories is rejected (400) rather than silently orphaning them or cascading deletes, since the spec doesn't define cascade behavior.
- **Validation:** Kept to manual, explicit checks in controllers rather than adding a validation library, to keep dependencies minimal as requested.
- **Password reset (FR14) and saved-address management endpoints (FR16)** from the PRD are not implemented in this backend cut — the task's explicit API contract only specifies register/login/me for auth, and addresses are modeled on `User.addresses` for future use but have no dedicated CRUD routes yet. Flagging this as a known gap vs. the full PRD, not an oversight.
