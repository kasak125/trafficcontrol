import { z } from "zod";

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  label: z.string().optional(),
});

export const emergencyStartSchema = z.object({
  body: z.object({
    type: z.enum(["AMBULANCE", "POLICE", "FIRE"]),
    currentLocation: locationSchema,
    destination: locationSchema.extend({
      label: z.string().min(2),
    }),
    speed: z.number().positive().max(45).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const emergencyHistoryQuerySchema = z.object({
  query: z.object({
    limit: z.preprocess((value) => {
      if (value === undefined || value === "") {
        return 20;
      }

      return Number(value);
    }, z.number().int().positive().max(100)),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const emergencyActiveQuerySchema = z.object({
  query: z.object({}),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});
