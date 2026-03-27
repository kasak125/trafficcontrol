export function notFound(_req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested resource could not be found.",
    },
  });
}
