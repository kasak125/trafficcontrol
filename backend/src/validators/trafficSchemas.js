import { z } from "zod";

const numberFromQuery = z.preprocess((value) => {
  if (value === undefined || value === "") {
    return undefined;
  }
  return Number(value);
}, z.number().int().positive());

const baseDateRangeQuery = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// reusable refine
const withDateValidation = (schema) =>
  schema.refine(
    (value) => {
      if (!value.from || !value.to) return true;
      return new Date(value.from) <= new Date(value.to);
    },
    {
      message: "`from` must be earlier than or equal to `to`.",
      path: ["from"],
    }
  );

export const summaryQuerySchema = z.object({
  query: withDateValidation(baseDateRangeQuery),
});

export const trendsQuerySchema = z.object({
  query: withDateValidation(
    baseDateRangeQuery.extend({
      intersectionId: numberFromQuery.optional(),
      interval: z.enum(["hour", "day"]).default("hour"),
    })
  ),
});

export const waitTimesQuerySchema = z.object({
  query: withDateValidation(
    baseDateRangeQuery.extend({
      intersectionId: numberFromQuery.optional(),
      limit: z.preprocess((value) => {
        if (value === undefined || value === "") {
          return 6;
        }
        return Number(value);
      }, z.number().int().positive().max(20)),
    })
  ),
});

export const liveTrafficQuerySchema = z.object({
  query: z.object({}),
});

export const trafficIncidentsQuerySchema = z.object({
  query: z.object({}),
});
