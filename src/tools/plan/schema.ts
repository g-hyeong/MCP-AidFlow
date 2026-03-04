import { z } from "zod";

export const PlanInputSchema = z.object({
  action: z
    .enum(["create", "get"])
    .default("create")
    .describe("create: start planning, get: read existing plan"),
  session: z
    .string()
    .optional()
    .describe("Session name. Auto-detects if only one active session exists"),
});

export type PlanInput = z.infer<typeof PlanInputSchema>;
