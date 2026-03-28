import { z } from "zod";

const requiredCountFromBody = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return value;
  }

  return Number(value);
}, z.number().int().nonnegative().max(300));

const optionalCountFromBody = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return Number(value);
}, z.number().int().nonnegative().max(300).optional());

export const cvDensityCreateSchema = z.object({
  query: z.object({}),
  params: z.object({}),
  body: z.object({
    direction: z.enum(["North", "South", "East", "West"]),
    vehiclesWaiting: requiredCountFromBody,
    capturedAt: z.string().datetime().optional(),
    detectedCounts: z
      .object({
        car: optionalCountFromBody,
        truck: optionalCountFromBody,
        bus: optionalCountFromBody,
        motorcycle: optionalCountFromBody,
      })
      .optional(),
  }),
});

export const cvDensityQuerySchema = z.object({
  query: z.object({}),
  params: z.object({}),
  body: z.object({}).optional(),
});
