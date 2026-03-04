import { z } from "zod";

export const SessionInputSchema = z.object({
  action: z
    .enum(["create", "list", "status", "complete"])
    .describe("Session action"),
  name: z
    .string()
    .optional()
    .describe("Session name (for create, status, complete)"),
  worktree: z
    .boolean()
    .optional()
    .describe("Create git worktree for this session (create only). Defaults to config.worktree.auto"),
  force: z
    .boolean()
    .optional()
    .default(false)
    .describe("Force archive incomplete session (complete only)"),
});

export type SessionInput = z.infer<typeof SessionInputSchema>;
