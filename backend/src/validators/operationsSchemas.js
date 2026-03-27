import { z } from "zod";

export const aiDecisionQuerySchema = z.object({
  query: z.object({}),
});

export const parkingAvailabilityQuerySchema = z.object({
  query: z.object({}),
});
