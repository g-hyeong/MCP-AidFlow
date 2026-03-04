import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, renameSync } from "node:fs";
import { join, basename } from "node:path";
import { getConfig, resolve } from "./workspace.js";

export interface SessionMeta {
  name: string;
  created_at: string;
  status: "active" | "completed";
  completed_at?: string;
  worktree?: {
    enabled: boolean;
    path: string;
    branch: string;
  };
  changed_files?: string[];
}

export interface PlanProgressItem {
  text: string;
  completed: boolean;
}

export interface PlanProgress {
  exists: boolean;
  total: number;
  completed: number;
  items: PlanProgressItem[];
}

function sessionsDir(): string {
  return resolve(".aidflow", "sessions");
}

function sessionDir(name: string): string {
  return join(sessionsDir(), name);
}

function metaPath(name: string): string {
  return join(sessionDir(name), "meta.json");
}

export function sessionExists(name: string): boolean {
  return existsSync(metaPath(name));
}

export function createSession(name: string, worktreeInfo?: { path: string; branch: string }): SessionMeta {
  const dir = sessionDir(name);
  if (existsSync(dir)) {
    throw new Error(`Session "${name}" already exists.`);
  }

  mkdirSync(dir, { recursive: true });

  const meta: SessionMeta = {
    name,
    created_at: new Date().toISOString(),
    status: "active",
  };

  if (worktreeInfo) {
    meta.worktree = {
      enabled: true,
      path: worktreeInfo.path,
      branch: worktreeInfo.branch,
    };
  }

  writeFileSync(metaPath(name), JSON.stringify(meta, null, 2));
  return meta;
}

export function getMeta(name: string): SessionMeta {
  const path = metaPath(name);
  if (!existsSync(path)) {
    throw new Error(`Session "${name}" not found.`);
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function updateMeta(name: string, updates: Partial<SessionMeta>): SessionMeta {
  const meta = getMeta(name);
  const updated = { ...meta, ...updates };
  writeFileSync(metaPath(name), JSON.stringify(updated, null, 2));
  return updated;
}

export function listSessions(): SessionMeta[] {
  const dir = sessionsDir();
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "meta.json")))
    .map((d) => getMeta(d.name))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function findActiveSession(): SessionMeta | null {
  const sessions = listSessions().filter((s) => s.status === "active");
  return sessions.length === 1 ? sessions[0] : null;
}

export function archiveSession(name: string, changedFiles?: string[]): string {
  const config = getConfig();
  const srcDir = sessionDir(name);

  // 완료 정보를 한 번에 업데이트
  updateMeta(name, {
    status: "completed",
    completed_at: new Date().toISOString(),
    ...(changedFiles ? { changed_files: changedFiles } : {}),
  });

  // Generate archive directory name
  const now = new Date();
  const dateStr = formatDate(now, config.session.date_format);
  const archiveName = `${dateStr}_${name}`;
  const historyDir = resolve(config.session.history_path);
  const destDir = join(historyDir, archiveName);

  mkdirSync(historyDir, { recursive: true });
  renameSync(srcDir, destDir);

  return destDir;
}

export function getPlanProgress(name: string): PlanProgress {
  const planPath = join(sessionDir(name), "plan.md");
  if (!existsSync(planPath)) {
    return { exists: false, total: 0, completed: 0, items: [] };
  }

  const content = readFileSync(planPath, "utf-8");
  const checkboxes = content.match(/- \[[ x]\] .+/g) ?? [];
  const items: PlanProgressItem[] = checkboxes.map((line) => ({
    text: line.replace(/- \[[ x]\] /, ""),
    completed: line.startsWith("- [x]"),
  }));
  const completed = items.filter((item) => item.completed).length;

  return {
    exists: true,
    total: checkboxes.length,
    completed,
    items,
  };
}

export function getPlanContent(name: string): string | null {
  const planPath = join(sessionDir(name), "plan.md");
  if (!existsSync(planPath)) return null;
  return readFileSync(planPath, "utf-8");
}

function formatDate(date: Date, format: string): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  switch (format) {
    case "YYMMDD":
      return `${yy}${mm}${dd}`;
    case "YYYYMMDD":
      return `${date.getFullYear()}${mm}${dd}`;
    default:
      return `${yy}${mm}${dd}`;
  }
}
