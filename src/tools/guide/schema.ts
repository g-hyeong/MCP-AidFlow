import { z } from "zod";

export const GuideInputSchema = z.object({
  action: z
    .enum(["list", "read"])
    .default("list")
    .describe("list: show available guides, read: read a specific guide"),
  topic: z
    .string()
    .optional()
    .describe("Guide name to read (without .md extension)"),
});

export type GuideInput = z.infer<typeof GuideInputSchema>;
