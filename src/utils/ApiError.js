// Lightweight custom error class carrying an HTTP status code, so the
// global error handler can respond with the right status + JSON message.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
