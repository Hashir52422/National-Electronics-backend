// Wraps an async route/controller function and forwards any rejected
// promise/thrown error to Express's error-handling middleware, so we
// don't need try/catch blocks in every controller.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
