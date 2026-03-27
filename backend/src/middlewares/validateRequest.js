import { AppError } from "../utils/AppError.js";

export function validateRequest(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      query: req.query,
      params: req.params,
      body: req.body,
    });

    if (!result.success) {
      return next(
        new AppError("Validation failed", 400, "VALIDATION_ERROR", result.error.flatten()),
      );
    }

    req.validated = result.data;
    return next();
  };
}
