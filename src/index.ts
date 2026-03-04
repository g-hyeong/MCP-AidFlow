#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setWorkspaceRoot } from "./context/workspace.js";
import { InitInputSchema, handleInit, description as initDesc } from "./tools/init/index.js";
import { SessionInputSchema, handleSession, description as sessionDesc } from "./tools/session/index.js";
import { PlanInputSchema, handlePlan, description as planDesc } from "./tools/plan/index.js";
import { GuideInputSchema, handleGuide, description as guideDesc } from "./tools/guide/index.js";

const INSTRUCTIONS = `# aidflow

Session-based development workflow manager.

## On Every New Conversation (CRITICAL)
Before doing ANYTHING, check for existing context:
1. Run \`session list\` to check for active sessions.
2. If active session exists:
   - Run \`session status\` to understand current progress.
   - Read the session's plan.md for full task context.
   - Read SPEC.md for project conventions.
   - Inform the user: "Found active session '{name}'. Resuming where you left off."
   - Continue work from where it was left off.
3. If no active session:
   - Check if aidflow is initialized (.aidflow/ exists). If not, run \`init\` first.
   - Proceed with normal workflow below.

This ensures seamless context recovery across conversation sessions.

## First-time Setup
1. \`init\` to create .aidflow/ directory and configuration.
2. \`/spec\` to define project-level engineering foundations (SPEC.md).

## Development Cycle
1. \`session create\` to start work. Read SPEC.md for project conventions.
2. \`plan create\` for medium/large tasks. Plan references SPEC.md, only adds task-specific decisions.
3. Work using Claude Code's native tools. Follow plan.md as the execution spec.
4. When work is done, run \`/finish\` to complete the session (review, archive, report, commit in one step).

## Rules
- **All development work MUST go through aidflow**. Always use \`session create\` before coding.
- Always confirm with the user before proceeding (use AskUserQuestion).
- **When a plan item is completed, immediately update plan.md**: change \`- [ ]\` to \`- [x]\` for the corresponding item. This keeps plan progress accurate.
- Use \`guide list\` to find relevant guides, then let the user choose.
- For parallel work, create multiple sessions with worktrees and use Subagents.

## User Expertise Support
- When gathering requirements (plan, /spec), always offer "Let AI research best practices" as an option.
- If the user is unfamiliar with the tech stack, use WebSearch to find latest stable best practices and present recommendations.
- Never assume the user knows framework-specific conventions. Explain and offer choices.

## External Tool Collaboration
- aidflow manages the development workflow (session, plan, spec). Actual coding uses the AI client's native tools.
- Other MCP servers, skills, and plugins are encouraged for information gathering, code analysis, and specialized tasks.
- Use the best tool for each job: aidflow for structure, native tools for implementation, external tools for everything else.`;

const server = new McpServer(
  { name: "aidflow", version: "1.0.0" },
  {
    capabilities: {
      tools: {},
    },
    instructions: INSTRUCTIONS,
  },
);

// Register tools using registerTool (non-deprecated API)
server.registerTool("init", {
  description: initDesc,
  inputSchema: InitInputSchema,
}, async (params) => {
  const input = InitInputSchema.parse(params);
  const result = await handleInit(input);
  return { content: [{ type: "text", text: result }] };
});

server.registerTool("session", {
  description: sessionDesc,
  inputSchema: SessionInputSchema,
}, async (params) => {
  const input = SessionInputSchema.parse(params);
  const result = await handleSession(input);
  return { content: [{ type: "text", text: result }] };
});

server.registerTool("plan", {
  description: planDesc,
  inputSchema: PlanInputSchema,
}, async (params) => {
  const input = PlanInputSchema.parse(params);
  const result = await handlePlan(input);
  return { content: [{ type: "text", text: result }] };
});

server.registerTool("guide", {
  description: guideDesc,
  inputSchema: GuideInputSchema,
}, async (params) => {
  const input = GuideInputSchema.parse(params);
  const result = await handleGuide(input);
  return { content: [{ type: "text", text: result }] };
});

async function main() {
  const transport = new StdioServerTransport();

  // Workspace root from environment or cwd
  const root = process.env.AIDFLOW_ROOT ?? process.cwd();
  setWorkspaceRoot(root);

  await server.connect(transport);
}

main().catch((err) => {
  console.error("Failed to start aidflow MCP server:", err);
  process.exit(1);
});
