import { existsSync } from "node:fs";
import { join } from "node:path";
import { isInitialized, getConfig, getWorkspaceRoot } from "../../context/workspace.js";
import {
  createSession,
  listSessions,
  getMeta,
  archiveSession,
  findActiveSession,
  getPlanProgress,
  sessionExists,
} from "../../context/session.js";
import { createWorktree, getChangedFiles, getGitDiffStat } from "../../worktree/manager.js";
import { getRequiredGuides, formatRequiredGuides } from "../guide/handler.js";
import type { SessionInput } from "./schema.js";

export async function handleSession(input: SessionInput): Promise<string> {
  if (!isInitialized()) {
    return "aidflow is not initialized. Run `init` first.";
  }

  switch (input.action) {
    case "create":
      return handleCreate(input);
    case "list":
      return handleList();
    case "status":
      return handleStatus(input);
    case "complete":
      return handleComplete(input);
  }
}

function handleCreate(input: SessionInput): string {
  if (!input.name) {
    return "Session name is required for create action.";
  }

  if (sessionExists(input.name)) {
    return `Session "${input.name}" already exists. Choose a different name or complete the existing one.`;
  }

  const config = getConfig();
  const useWorktree = input.worktree ?? config.worktree.auto;
  let worktreeInfo: { path: string; branch: string } | undefined;

  let worktreeWarning: string | undefined;

  if (useWorktree) {
    try {
      worktreeInfo = createWorktree(input.name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      worktreeWarning = `Worktree creation failed: ${msg}`;
    }
  }

  const meta = createSession(input.name, worktreeInfo);

  const lines = [
    `Session "${meta.name}" created.`,
    `Path: .aidflow/sessions/${meta.name}/`,
  ];

  if (worktreeWarning) {
    lines.push(`Warning: ${worktreeWarning} (proceeding without worktree)`);
  } else if (worktreeInfo) {
    lines.push(`Worktree: ${worktreeInfo.path} (branch: ${worktreeInfo.branch})`);
  }

  const hasSpec = existsSync(join(getWorkspaceRoot(), "SPEC.md"));

  lines.push("");
  if (hasSpec) {
    lines.push("Read SPEC.md first for project conventions and engineering foundations.");
  } else {
    lines.push(
      "**No SPEC.md found.** Use AskUserQuestion to ask the user:",
      "\"SPEC.md (project engineering foundations) does not exist yet. Run /spec first, or proceed without it?\"",
    );
  }
  lines.push(
    "Use `plan create` if you need upfront planning.",
    "Run `session complete` when done.",
  );

  // 필독 가이드 자동 로드 (_session.md, _session_*.md)
  const requiredGuides = getRequiredGuides("session");
  const requiredSection = formatRequiredGuides(requiredGuides);
  if (requiredSection) {
    lines.push("", "---", "", requiredSection);
  }

  return lines.join("\n");
}

function handleList(): string {
  const sessions = listSessions();

  if (sessions.length === 0) {
    return "No active sessions. Create one with `session create`.";
  }

  const activeSessions = sessions.filter((s) => s.status === "active");
  const lines = [`Sessions (${sessions.length} total, ${activeSessions.length} active):\n`];

  for (const session of sessions) {
    const plan = getPlanProgress(session.name);
    const wt = session.worktree?.enabled ? " (worktree)" : "";
    const status = session.status === "active" ? "[active]" : "[completed]";

    lines.push(`- **${session.name}** ${status}${wt}`);
    lines.push(`  Created: ${session.created_at}`);
    if (plan.exists) {
      lines.push(`  Plan: ${plan.completed}/${plan.total} items`);
    }
    lines.push("");
  }

  if (activeSessions.length > 0) {
    lines.push("To resume an active session, run `session status` to see full details and continue working.");
  }

  return lines.join("\n");
}

function handleStatus(input: SessionInput): string {
  let name = input.name;

  if (!name) {
    const active = findActiveSession();
    if (!active) {
      const sessions = listSessions();
      if (sessions.length === 0) {
        return "No active sessions.";
      }
      return `Multiple active sessions found. Specify a name:\n${sessions.map((s) => `- ${s.name}`).join("\n")}`;
    }
    name = active.name;
  }

  const meta = getMeta(name);
  const plan = getPlanProgress(name);
  const changedFiles = getChangedFiles(name);
  const diffStat = getGitDiffStat(name);

  const lines = [
    `Session: **${meta.name}**`,
    `Status: ${meta.status}`,
    `Created: ${meta.created_at}`,
  ];

  if (meta.worktree?.enabled) {
    lines.push(`Worktree: ${meta.worktree.path} (${meta.worktree.branch})`);
  }

  if (plan.exists) {
    lines.push(`\nPlan: ${plan.completed}/${plan.total} items completed`);
    lines.push(`Plan file: .aidflow/sessions/${name}/plan.md (read for full context)`);
    const remaining = plan.items.filter((item) => !item.completed);
    if (remaining.length > 0) {
      lines.push("Remaining:");
      remaining.slice(0, 5).forEach((item) => lines.push(`  - ${item.text}`));
      if (remaining.length > 5) {
        lines.push(`  ... and ${remaining.length - 5} more`);
      }
    }
  } else {
    lines.push("\nNo plan found. Use `plan create` if needed, or continue working directly.");
  }

  if (changedFiles.length > 0) {
    lines.push(`\nChanged files (${changedFiles.length}):`);
    changedFiles.slice(0, 10).forEach((f) => lines.push(`  - ${f}`));
    if (changedFiles.length > 10) {
      lines.push(`  ... and ${changedFiles.length - 10} more`);
    }
    if (diffStat) {
      lines.push(`\n${diffStat}`);
    }
  }

  // Suggestion
  lines.push("");
  if (!plan.exists) {
    // plan 미존재 메시지는 위에서 이미 출력됨
  } else if (plan.completed < plan.total) {
    const nextItem = plan.items.find((item) => !item.completed);
    if (nextItem) {
      lines.push(`Next suggested item: "${nextItem.text}"`);
    }
  } else {
    lines.push("All plan items completed. Run `session complete` to archive.");
  }

  return lines.join("\n");
}

function handleComplete(input: SessionInput): string {
  let name = input.name;

  if (!name) {
    const active = findActiveSession();
    if (!active) {
      return "Specify a session name to complete.";
    }
    name = active.name;
  }

  const meta = getMeta(name);
  const plan = getPlanProgress(name);

  if (plan.exists && plan.completed < plan.total && !input.force) {
    return [
      `Session "${name}" has incomplete plan items (${plan.completed}/${plan.total}).`,
      "Use `force: true` to archive anyway.",
      "",
      "Remaining items:",
      ...plan.items.filter((item) => !item.completed).map((item) => `  - ${item.text}`),
    ].join("\n");
  }

  const changedFiles = getChangedFiles(name);
  const archivePath = archiveSession(name, changedFiles);

  const lines = [
    `Session "${name}" archived.`,
    `Location: ${archivePath.split("/").slice(-2).join("/")}`,
    `Changed files: ${changedFiles.length}`,
  ];

  if (meta.worktree?.enabled) {
    lines.push(
      "",
      "Worktree cleanup needed. Ask the user with AskUserQuestion:",
      `- Merge branch "${meta.worktree.branch}" into main?`,
      "- Remove the worktree?",
    );
  }

  lines.push(
    "",
    "Post-completion actions:",
    "1. Run /report to generate a completion report.",
    "2. Ask the user with AskUserQuestion: \"Did this session introduce new patterns, conventions, or architectural changes that should be reflected in SPEC.md?\"",
    "   If yes, run /spec to update.",
  );

  return lines.join("\n");
}
