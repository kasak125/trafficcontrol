import { AppError } from "./AppError.js";

function parseDate(value, fieldName) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${fieldName} value`, 400, "INVALID_DATE_RANGE");
  }

  return parsed;
}

export function buildDateRange(
  { from, to },
  { fallbackHours = 24, startOfCurrentDay = false } = {},
) {
  const end = to ? parseDate(to, "to") : new Date();
  let start;

  if (from) {
    start = parseDate(from, "from");
  } else if (startOfCurrentDay) {
    start = new Date(end);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date(end.getTime() - fallbackHours * 60 * 60 * 1000);
  }

  if (start > end) {
    throw new AppError("`from` must be earlier than `to`.", 400, "INVALID_DATE_RANGE");
  }

  return { from: start, to: end };
}
