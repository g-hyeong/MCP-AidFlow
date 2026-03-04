import { z } from "zod";

export const InitInputSchema = z.object({
  force: z
    .boolean()
    .optional()
    .default(false)
    .describe("Overwrite existing configuration"),
});

export type InitInput = z.infer<typeof InitInputSchema>;
