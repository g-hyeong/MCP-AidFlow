import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setWorkspaceRoot } from "../src/context/workspace.js";
import { handleSession } from "../src/tools/session/handler.js";
import { handlePlan } from "../src/tools/plan/handler.js";

let testRoot: string;

function setupWorkspace() {
  testRoot = join(tmpdir(), `devpilot-handler-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(join(testRoot, ".devpilot", "sessions"), { recursive: true });
  mkdirSync(join(testRoot, ".devpilot", "history"), { recursive: true });
  writeFileSync(
    join(testRoot, ".devpilot", "config.yaml"),
    `version: 1
session:
  history_path: ".devpilot/history"
  date_format: "YYMMDD"`,
  );
  setWorkspaceRoot(testRoot);
}

beforeEach(() => {
  setupWorkspace();
});

afterEach(() => {
  rmSync(testRoot, { recursive: true, force: true });
});

describe("session handler - create", () => {
  it("creates session successfully", async () => {
    const result = await handleSession({ action: "create", name: "test", force: false });
    expect(result).toContain('Session "test" created.');
    expect(result).toContain("Path: .devpilot/sessions/test/");
  });

  it("rejects duplicate session name", async () => {
    await handleSession({ action: "create", name: "dup", force: false });
    const result = await handleSession({ action: "create", name: "dup", force: false });
    expect(result).toContain("already exists");
  });

  it("requires name for create", async () => {
    const result = await handleSession({ action: "create", force: false });
    expect(result).toContain("name is required");
  });

  it("shows SPEC.md warning when not present", async () => {
    const result = await handleSession({ action: "create", name: "no-spec", force: false });
    expect(result).toContain("No SPEC.md found");
    expect(result).toContain("AskUserQuestion");
  });

  it("shows SPEC.md read instruction when present", async () => {
    writeFileSync(join(testRoot, "SPEC.md"), "# Project Spec");
    const result = await handleSession({ action: "create", name: "with-spec", force: false });
    expect(result).toContain("Read SPEC.md first");
  });

  it("creates session even when worktree fails (non-git repo)", async () => {
    const result = await handleSession({
      action: "create",
      name: "wt-fail",
      worktree: true,
      force: false,
    });
    // Should still create session, just warn about worktree
    expect(result).toContain('Session "wt-fail" created.');
    expect(result).toContain("Warning:");
  });
});

describe("session handler - list", () => {
  it("returns empty message when no sessions", async () => {
    const result = await handleSession({ action: "list", force: false });
    expect(result).toContain("No active sessions");
  });

  it("lists created sessions", async () => {
    await handleSession({ action: "create", name: "s1", force: false });
    await handleSession({ action: "create", name: "s2", force: false });
    const result = await handleSession({ action: "list", force: false });
    expect(result).toContain("s1");
    expect(result).toContain("s2");
    expect(result).toContain("[active]");
  });

  it("shows resume hint for active sessions", async () => {
    await handleSession({ action: "create", name: "active-one", force: false });
    const result = await handleSession({ action: "list", force: false });
    expect(result).toContain("resume");
  });
});

describe("session handler - status", () => {
  it("auto-detects single active session", async () => {
    await handleSession({ action: "create", name: "auto", force: false });
    const result = await handleSession({ action: "status", force: false });
    expect(result).toContain("Session: **auto**");
    expect(result).toContain("Status: active");
  });

  it("shows plan progress when plan exists", async () => {
    await handleSession({ action: "create", name: "planned", force: false });
    writeFileSync(
      join(testRoot, ".devpilot", "sessions", "planned", "plan.md"),
      "- [x] Done\n- [ ] Pending",
    );
    const result = await handleSession({ action: "status", name: "planned", force: false });
    expect(result).toContain("Plan: 1/2 items completed");
    expect(result).toContain("plan.md (read for full context)");
  });

  it("shows no plan message when plan does not exist", async () => {
    await handleSession({ action: "create", name: "no-plan", force: false });
    const result = await handleSession({ action: "status", name: "no-plan", force: false });
    expect(result).toContain("No plan found");
  });

  it("shows next suggested item from remaining unchecked items", async () => {
    await handleSession({ action: "create", name: "next-item", force: false });
    writeFileSync(
      join(testRoot, ".devpilot", "sessions", "next-item", "plan.md"),
      "- [x] First\n- [ ] Second\n- [ ] Third",
    );
    const result = await handleSession({ action: "status", name: "next-item", force: false });
    expect(result).toContain('Next suggested item: "Second"');
  });

  it("suggests complete when all items done", async () => {
    await handleSession({ action: "create", name: "all-done", force: false });
    writeFileSync(
      join(testRoot, ".devpilot", "sessions", "all-done", "plan.md"),
      "- [x] Item 1\n- [x] Item 2",
    );
    const result = await handleSession({ action: "status", name: "all-done", force: false });
    expect(result).toContain("All plan items completed");
    expect(result).toContain("session complete");
  });

  it("handles multiple active sessions without name", async () => {
    await handleSession({ action: "create", name: "a", force: false });
    await handleSession({ action: "create", name: "b", force: false });
    const result = await handleSession({ action: "status", force: false });
    expect(result).toContain("Multiple active sessions");
  });
});

describe("session handler - complete", () => {
  it("archives session successfully", async () => {
    await handleSession({ action: "create", name: "done", force: false });
    const result = await handleSession({ action: "complete", name: "done", force: false });
    expect(result).toContain('Session "done" archived.');
    // Session should be moved
    expect(existsSync(join(testRoot, ".devpilot", "sessions", "done"))).toBe(false);
  });

  it("blocks completion with incomplete plan (no force)", async () => {
    await handleSession({ action: "create", name: "incomplete", force: false });
    writeFileSync(
      join(testRoot, ".devpilot", "sessions", "incomplete", "plan.md"),
      "- [x] Done\n- [ ] Not done",
    );
    const result = await handleSession({ action: "complete", name: "incomplete", force: false });
    expect(result).toContain("incomplete plan items");
    expect(result).toContain("force: true");
    // Session should still exist
    expect(existsSync(join(testRoot, ".devpilot", "sessions", "incomplete"))).toBe(true);
  });

  it("allows force completion of incomplete session", async () => {
    await handleSession({ action: "create", name: "force-it", force: false });
    writeFileSync(
      join(testRoot, ".devpilot", "sessions", "force-it", "plan.md"),
      "- [ ] Pending",
    );
    const result = await handleSession({ action: "complete", name: "force-it", force: true });
    expect(result).toContain("archived");
  });

  it("includes post-completion actions", async () => {
    await handleSession({ action: "create", name: "post", force: false });
    const result = await handleSession({ action: "complete", name: "post", force: false });
    expect(result).toContain("/report");
    expect(result).toContain("SPEC.md");
  });
});

describe("plan handler", () => {
  it("returns error when not initialized", async () => {
    setWorkspaceRoot(join(tmpdir(), "nonexistent-" + Date.now()));
    const result = await handlePlan({ action: "create" });
    expect(result).toContain("not initialized");
  });

  it("returns error when no active session", async () => {
    const result = await handlePlan({ action: "create" });
    expect(result).toContain("No session found");
  });

  it("returns planning instructions for valid session", async () => {
    await handleSession({ action: "create", name: "plan-test", force: false });
    const result = await handlePlan({ action: "create", session: "plan-test" });
    expect(result).toContain('Planning session "plan-test"');
    expect(result).toContain("Step 1: Requirements Gathering");
    expect(result).toContain("Step 2: Codebase Research");
    expect(result).toContain("Step 3: Write Plan");
    expect(result).toContain("Step 4: User Review");
  });

  it("includes SPEC.md check in plan instructions", async () => {
    await handleSession({ action: "create", name: "spec-check", force: false });
    const result = await handlePlan({ action: "create", session: "spec-check" });
    // No SPEC.md exists
    expect(result).toContain("No SPEC.md found");
  });

  it("references SPEC.md when it exists", async () => {
    writeFileSync(join(testRoot, "SPEC.md"), "# Spec");
    await handleSession({ action: "create", name: "has-spec", force: false });
    const result = await handlePlan({ action: "create", session: "has-spec" });
    expect(result).toContain("Read SPEC.md");
    expect(result).toContain("SPEC.md conventions");
  });

  it("includes AI auto-research option", async () => {
    await handleSession({ action: "create", name: "auto-research", force: false });
    const result = await handlePlan({ action: "create", session: "auto-research" });
    expect(result).toContain("AI auto-research");
    expect(result).toContain("WebSearch");
  });

  it("returns plan content for get action", async () => {
    await handleSession({ action: "create", name: "get-plan", force: false });
    writeFileSync(
      join(testRoot, ".devpilot", "sessions", "get-plan", "plan.md"),
      "# My Plan\n- [x] Done\n- [ ] Pending",
    );
    const result = await handlePlan({ action: "get", session: "get-plan" });
    expect(result).toContain("1/2 completed");
    expect(result).toContain("# My Plan");
  });

  it("returns error for get when no plan exists", async () => {
    await handleSession({ action: "create", name: "no-plan", force: false });
    const result = await handlePlan({ action: "get", session: "no-plan" });
    expect(result).toContain("No plan found");
  });

  it("warns when plan already exists for create", async () => {
    await handleSession({ action: "create", name: "has-plan", force: false });
    writeFileSync(
      join(testRoot, ".devpilot", "sessions", "has-plan", "plan.md"),
      "# Existing Plan",
    );
    const result = await handlePlan({ action: "create", session: "has-plan" });
    expect(result).toContain("already has a plan");
  });
});
