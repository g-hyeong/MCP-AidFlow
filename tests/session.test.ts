import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setWorkspaceRoot } from "../src/context/workspace.js";
import {
  createSession,
  getMeta,
  updateMeta,
  listSessions,
  findActiveSession,
  archiveSession,
  sessionExists,
  getPlanProgress,
  getPlanContent,
} from "../src/context/session.js";

let testRoot: string;

beforeEach(() => {
  testRoot = join(tmpdir(), `devpilot-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(join(testRoot, ".devpilot", "sessions"), { recursive: true });
  mkdirSync(join(testRoot, ".devpilot", "history"), { recursive: true });

  // config.yaml 생성 (기본값 사용을 위해)
  writeFileSync(
    join(testRoot, ".devpilot", "config.yaml"),
    `version: 1
session:
  history_path: ".devpilot/history"
  date_format: "YYMMDD"`,
  );

  setWorkspaceRoot(testRoot);
});

afterEach(() => {
  rmSync(testRoot, { recursive: true, force: true });
});

describe("createSession", () => {
  it("creates a session with meta.json", () => {
    const meta = createSession("test-session");
    expect(meta.name).toBe("test-session");
    expect(meta.status).toBe("active");
    expect(meta.created_at).toBeTruthy();
    expect(meta.worktree).toBeUndefined();
  });

  it("creates a session with worktree info", () => {
    const meta = createSession("wt-session", {
      path: "/tmp/wt",
      branch: "wt-session",
    });
    expect(meta.worktree).toEqual({
      enabled: true,
      path: "/tmp/wt",
      branch: "wt-session",
    });
  });

  it("throws on duplicate session", () => {
    createSession("dup");
    expect(() => createSession("dup")).toThrow('Session "dup" already exists.');
  });

  it("writes meta.json to disk", () => {
    createSession("disk-check");
    const metaPath = join(testRoot, ".devpilot", "sessions", "disk-check", "meta.json");
    expect(existsSync(metaPath)).toBe(true);
    const content = JSON.parse(readFileSync(metaPath, "utf-8"));
    expect(content.name).toBe("disk-check");
  });
});

describe("sessionExists", () => {
  it("returns false for non-existent session", () => {
    expect(sessionExists("nope")).toBe(false);
  });

  it("returns true for existing session", () => {
    createSession("exists");
    expect(sessionExists("exists")).toBe(true);
  });
});

describe("getMeta / updateMeta", () => {
  it("reads session metadata", () => {
    createSession("read-meta");
    const meta = getMeta("read-meta");
    expect(meta.name).toBe("read-meta");
    expect(meta.status).toBe("active");
  });

  it("throws for non-existent session", () => {
    expect(() => getMeta("ghost")).toThrow('Session "ghost" not found.');
  });

  it("updates metadata partially", () => {
    createSession("update-test");
    const updated = updateMeta("update-test", { status: "completed" });
    expect(updated.status).toBe("completed");
    expect(updated.name).toBe("update-test");
    // created_at should be preserved
    expect(updated.created_at).toBeTruthy();
  });

  it("updates changed_files", () => {
    createSession("files-test");
    updateMeta("files-test", { changed_files: ["a.ts", "b.ts"] });
    const meta = getMeta("files-test");
    expect(meta.changed_files).toEqual(["a.ts", "b.ts"]);
  });
});

describe("listSessions", () => {
  it("returns empty array when no sessions", () => {
    expect(listSessions()).toEqual([]);
  });

  it("lists all sessions sorted by creation date (newest first)", () => {
    createSession("first");
    // 같은 밀리초에 생성될 수 있으므로 수동으로 시간 조정
    updateMeta("first", { created_at: "2026-01-01T00:00:00.000Z" });
    createSession("second");
    updateMeta("second", { created_at: "2026-01-02T00:00:00.000Z" });
    const list = listSessions();
    expect(list.length).toBe(2);
    // newest first
    expect(list[0].name).toBe("second");
    expect(list[1].name).toBe("first");
  });
});

describe("findActiveSession", () => {
  it("returns null when no sessions", () => {
    expect(findActiveSession()).toBeNull();
  });

  it("returns the session when exactly one active", () => {
    createSession("only-one");
    const active = findActiveSession();
    expect(active?.name).toBe("only-one");
  });

  it("returns null when multiple active sessions", () => {
    createSession("a");
    createSession("b");
    expect(findActiveSession()).toBeNull();
  });
});

describe("archiveSession", () => {
  it("moves session to history", () => {
    createSession("archive-me");
    const archivePath = archiveSession("archive-me", ["file.ts"]);
    expect(archivePath).toContain("archive-me");
    expect(existsSync(archivePath)).toBe(true);
    // Original session dir should be gone
    expect(existsSync(join(testRoot, ".devpilot", "sessions", "archive-me"))).toBe(false);
  });

  it("sets completed status and timestamp", () => {
    createSession("complete-test");
    const archivePath = archiveSession("complete-test", []);
    const meta = JSON.parse(readFileSync(join(archivePath, "meta.json"), "utf-8"));
    expect(meta.status).toBe("completed");
    expect(meta.completed_at).toBeTruthy();
  });

  it("saves changed files list", () => {
    createSession("files-archive");
    const archivePath = archiveSession("files-archive", ["a.ts", "b.ts"]);
    const meta = JSON.parse(readFileSync(join(archivePath, "meta.json"), "utf-8"));
    expect(meta.changed_files).toEqual(["a.ts", "b.ts"]);
  });

  it("archives without changed files", () => {
    createSession("no-files");
    const archivePath = archiveSession("no-files");
    const meta = JSON.parse(readFileSync(join(archivePath, "meta.json"), "utf-8"));
    expect(meta.status).toBe("completed");
    expect(meta.changed_files).toBeUndefined();
  });
});

describe("getPlanProgress", () => {
  it("returns exists=false when no plan.md", () => {
    createSession("no-plan");
    const progress = getPlanProgress("no-plan");
    expect(progress.exists).toBe(false);
    expect(progress.total).toBe(0);
    expect(progress.completed).toBe(0);
  });

  it("parses checkboxes from plan.md", () => {
    createSession("with-plan");
    const planPath = join(testRoot, ".devpilot", "sessions", "with-plan", "plan.md");
    writeFileSync(
      planPath,
      `# Test Plan
## Implementation Items
- [x] Item 1: Done
- [ ] Item 2: Pending
- [x] Item 3: Also done
## Acceptance Criteria
- [ ] AC-1: Not done
`,
    );
    const progress = getPlanProgress("with-plan");
    expect(progress.exists).toBe(true);
    expect(progress.total).toBe(4);
    expect(progress.completed).toBe(2);
    expect(progress.items.length).toBe(4);
  });

  it("handles non-sequential checkbox completion", () => {
    createSession("non-seq");
    const planPath = join(testRoot, ".devpilot", "sessions", "non-seq", "plan.md");
    writeFileSync(
      planPath,
      `- [ ] First: not done
- [x] Second: done
- [ ] Third: not done
- [x] Fourth: done`,
    );
    const progress = getPlanProgress("non-seq");
    expect(progress.completed).toBe(2);
    // items should preserve completion state
    expect(progress.items[0].completed).toBe(false);
    expect(progress.items[1].completed).toBe(true);
    expect(progress.items[2].completed).toBe(false);
    expect(progress.items[3].completed).toBe(true);

    // remaining items should be the unchecked ones
    const remaining = progress.items.filter((i) => !i.completed);
    expect(remaining.map((i) => i.text)).toEqual([
      "First: not done",
      "Third: not done",
    ]);
  });

  it("returns empty items when plan has no checkboxes", () => {
    createSession("no-checkboxes");
    const planPath = join(testRoot, ".devpilot", "sessions", "no-checkboxes", "plan.md");
    writeFileSync(planPath, "# Plan\nJust some text, no checkboxes.");
    const progress = getPlanProgress("no-checkboxes");
    expect(progress.exists).toBe(true);
    expect(progress.total).toBe(0);
    expect(progress.items).toEqual([]);
  });
});

describe("getPlanContent", () => {
  it("returns null when no plan", () => {
    createSession("no-content");
    expect(getPlanContent("no-content")).toBeNull();
  });

  it("returns plan content", () => {
    createSession("has-content");
    const planPath = join(testRoot, ".devpilot", "sessions", "has-content", "plan.md");
    writeFileSync(planPath, "# My Plan\n\nSome content.");
    expect(getPlanContent("has-content")).toBe("# My Plan\n\nSome content.");
  });
});
