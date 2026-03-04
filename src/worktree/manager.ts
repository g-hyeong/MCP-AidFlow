import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getConfig, getWorkspaceRoot, resolve } from "../context/workspace.js";

export interface WorktreeInfo {
  path: string;
  branch: string;
}

function isGitRepo(): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", {
      cwd: getWorkspaceRoot(),
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

export function createWorktree(sessionName: string): WorktreeInfo {
  if (!isGitRepo()) {
    throw new Error("Not a git repository. Worktree requires git.");
  }

  const config = getConfig();
  const worktreesDir = resolve(config.worktree.path);
  const worktreePath = join(worktreesDir, sessionName);
  const branch = `${config.worktree.branch_prefix}${sessionName}`;

  if (existsSync(worktreePath)) {
    throw new Error(`Worktree already exists at ${worktreePath}`);
  }

  mkdirSync(worktreesDir, { recursive: true });

  try {
    execSync(`git worktree add -b "${branch}" "${worktreePath}"`, {
      cwd: getWorkspaceRoot(),
      stdio: "pipe",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to create worktree: ${msg}`);
  }

  return { path: worktreePath, branch };
}

export function removeWorktree(sessionName: string): void {
  const config = getConfig();
  const worktreePath = join(resolve(config.worktree.path), sessionName);

  if (!existsSync(worktreePath)) return;

  try {
    execSync(`git worktree remove "${worktreePath}" --force`, {
      cwd: getWorkspaceRoot(),
      stdio: "pipe",
    });
  } catch {
    // Ignore cleanup errors
  }
}

export function getChangedFiles(sessionName: string): string[] {
  const config = getConfig();
  const worktreePath = join(resolve(config.worktree.path), sessionName);
  const cwd = existsSync(worktreePath) ? worktreePath : getWorkspaceRoot();

  try {
    const output = execSync("git diff --name-only HEAD", {
      cwd,
      stdio: "pipe",
      encoding: "utf-8",
    });
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export function getGitDiffStat(sessionName?: string): string {
  const config = getConfig();
  let cwd = getWorkspaceRoot();

  if (sessionName) {
    const worktreePath = join(resolve(config.worktree.path), sessionName);
    if (existsSync(worktreePath)) {
      cwd = worktreePath;
    }
  }

  try {
    return execSync("git diff --stat HEAD", {
      cwd,
      stdio: "pipe",
      encoding: "utf-8",
    }).trim();
  } catch {
    return "";
  }
}
