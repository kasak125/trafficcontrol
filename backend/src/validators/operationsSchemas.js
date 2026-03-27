import { z } from "zod";

export const aiDecisionQuerySchema = z.object({
  query: z.object({}),
});

export const parkingAvailabilityQuerySchema = z.object({
  query: z.object({}),
});

export const parkingRouteQuerySchema = z.object({
  query: z.object({
    lat: z.preprocess((value) => Number(value), z.number().min(-90).max(90)),
    lng: z.preprocess((value) => Number(value), z.number().min(-180).max(180)),
  }),
});
