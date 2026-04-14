const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${err.stack}`);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
};

module.exports = errorHandler;
