import { isInitialized, resolve, getWorkspaceRoot } from "../../context/workspace.js";
import {
  findActiveSession,
  getMeta,
  getPlanProgress,
  getPlanContent,
  sessionExists,
} from "../../context/session.js";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { PlanInput } from "./schema.js";

export async function handlePlan(input: PlanInput): Promise<string> {
  if (!isInitialized()) {
    return "devpilot is not initialized. Run `init` first.";
  }

  const sessionName = resolveSession(input.session);
  if (!sessionName) {
    return "No session found. Create one with `session create` first, or specify a session name.";
  }

  switch (input.action) {
    case "create":
      return handleCreate(sessionName);
    case "get":
      return handleGet(sessionName);
  }
}

function resolveSession(name?: string): string | null {
  if (name) {
    return sessionExists(name) ? name : null;
  }
  const active = findActiveSession();
  return active?.name ?? null;
}

function handleCreate(sessionName: string): string {
  const planPath = resolve(".devpilot", "sessions", sessionName, "plan.md");

  if (existsSync(planPath)) {
    return [
      `Session "${sessionName}" already has a plan.`,
      "Use `plan get` to view it, or overwrite by writing a new plan.md.",
    ].join("\n");
  }

  const hasSpec = existsSync(join(getWorkspaceRoot(), "SPEC.md"));

  const lines: string[] = [
    `Planning session "${sessionName}".`,
    "",
  ];

  // Step 0: SPEC.md context
  if (hasSpec) {
    lines.push(
      "## Step 0: Load Project Context",
      "",
      "Read SPEC.md at the project root FIRST.",
      "The plan must follow SPEC.md conventions (architecture, error handling, testing, naming, etc.).",
      "Only add task-specific technical decisions that SPEC.md does not cover.",
      "",
    );
  } else {
    lines.push(
      "## Step 0: Project Context",
      "",
      "**No SPEC.md found.** Use AskUserQuestion to ask the user:",
      "\"SPEC.md (project engineering foundations) does not exist yet. Run /spec first to define it, or proceed without it?\"",
      "If proceeding without SPEC.md, include relevant engineering decisions directly in the plan's Technical Approach.",
      "",
    );
  }

  lines.push(
    "## Step 1: Requirements Gathering (HITL)",
    "",
    "Use AskUserQuestion **multiple rounds** to thoroughly analyze requirements.",
    "Do NOT skip this step. Ask until requirements are fully clear.",
    "",
    "**Important: For each round, always include an 'AI auto-research' option.**",
    "When the user is unsure or unfamiliar with the tech stack, offer:",
    "- \"I'm not sure / Let AI research best practices\"",
    "If selected, use WebSearch to find latest stable best practices for the relevant",
    "technology, synthesize into concrete recommendations, and present for confirmation.",
    "",
    "**Round 1 - Core Intent**:",
    "- What is the goal? What problem does this solve?",
    "- Who is the user/consumer of this feature?",
    "- What does success look like?",
    "",
    "**Round 2 - Scope & Constraints**:",
    "- What is explicitly OUT of scope?",
    "- Are there technical constraints (library, pattern, compatibility)?",
    "- Are there dependencies on other systems or features?",
    "- What is the expected timeline/priority?",
    "",
    "**Round 3 - Details & Edge Cases**:",
    "- What are the specific behaviors/scenarios?",
    "- How should errors be handled?",
    "- Are tests required? What level (unit/integration/e2e)?",
    "- Any UI/UX requirements?",
    "",
    "## Step 2: Codebase Research",
    "",
    "Before writing the plan, investigate the codebase:",
    "- Use Glob/Grep/Read to understand existing code structure",
    "- Identify files that will be created/modified",
    "- Understand existing patterns and conventions",
    "- Check for reusable code or potential conflicts",
    "",
    "## Step 3: Write Plan",
    "",
    `Write to: .devpilot/sessions/${sessionName}/plan.md`,
    "",
    "Plan format (PRD + Implementation Plan):",
    "```markdown",
    "# {Title}",
    "",
    "## Background",
    "{Why this task exists. Context and motivation. 2-3 sentences.}",
    "",
    "## Objective",
    "{What we're building/changing. Clear, measurable goal. 1-2 sentences.}",
    "",
    "## Requirements",
    "",
    "### Functional Requirements",
    "- FR-1: {specific, testable requirement}",
    "- FR-2: ...",
    "",
    "### Non-Functional Requirements (if applicable)",
    "- NFR-1: {performance, security, etc.}",
    "",
    "## Out of Scope",
    "- {Explicitly excluded items to prevent scope creep}",
    "",
    "## Technical Approach",
    "{How to implement. Key decisions, patterns, architecture.}",
    "",
    "### Affected Files",
    "- `path/to/file.ts` - {what changes}",
    "- `path/to/new-file.ts` - {new, purpose}",
    "",
    "## Implementation Items",
    "- [ ] Item 1: {specific, actionable task}",
    "- [ ] Item 2: ...",
    "- [ ] Item N: Tests / Verification",
    "",
    "## Acceptance Criteria",
    "- [ ] AC-1: {specific, verifiable condition}",
    "- [ ] AC-2: ...",
    "",
    "## Notes",
    "{Constraints, assumptions, open decisions, references}",
    "```",
    "",
    "## Step 4: User Review",
    "",
    "Present the complete plan and ask the user to review.",
    "Use AskUserQuestion: confirm, request changes, or approve.",
    "Do NOT proceed to implementation until the user approves the plan.",
  );

  return lines.join("\n");
}

function handleGet(sessionName: string): string {
  const content = getPlanContent(sessionName);

  if (!content) {
    return [
      `No plan found for session "${sessionName}".`,
      "Use `plan create` to start planning.",
    ].join("\n");
  }

  const progress = getPlanProgress(sessionName);

  return [
    `Plan for "${sessionName}" (${progress.completed}/${progress.total} completed):`,
    "",
    content,
  ].join("\n");
}
