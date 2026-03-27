import { logger } from "../config/logger.js";

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const code = error.code || "INTERNAL_SERVER_ERROR";

  if (statusCode >= 500) {
    logger.error(error.message, { stack: error.stack });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: error.message || "Something went wrong.",
      details: error.details || null,
    },
  });
}
