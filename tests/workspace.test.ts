import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  setWorkspaceRoot,
  getWorkspaceRoot,
  isInitialized,
  getConfig,
  resolve,
} from "../src/context/workspace.js";

let testRoot: string;

beforeEach(() => {
  testRoot = join(tmpdir(), `aidflow-ws-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testRoot, { recursive: true });
});

afterEach(() => {
  rmSync(testRoot, { recursive: true, force: true });
});

describe("setWorkspaceRoot / getWorkspaceRoot", () => {
  it("sets and gets workspace root", () => {
    setWorkspaceRoot(testRoot);
    expect(getWorkspaceRoot()).toBe(testRoot);
  });
});

describe("isInitialized", () => {
  it("returns false when .aidflow does not exist", () => {
    setWorkspaceRoot(testRoot);
    expect(isInitialized()).toBe(false);
  });

  it("returns true when .aidflow exists", () => {
    mkdirSync(join(testRoot, ".aidflow"));
    setWorkspaceRoot(testRoot);
    expect(isInitialized()).toBe(true);
  });
});

describe("getConfig", () => {
  it("returns default config when no config.yaml", () => {
    mkdirSync(join(testRoot, ".aidflow"));
    setWorkspaceRoot(testRoot);
    const config = getConfig();
    expect(config.version).toBe(1);
    expect(config.worktree.auto).toBe(false);
    expect(config.worktree.path).toBe(".aidflow/worktrees");
    expect(config.worktree.branch_prefix).toBe("");
    expect(config.session.history_path).toBe(".aidflow/history");
    expect(config.session.date_format).toBe("YYMMDD");
    expect(config.guides.path).toBe(".aidflow/guides");
  });

  it("merges partial config with defaults", () => {
    mkdirSync(join(testRoot, ".aidflow"));
    writeFileSync(
      join(testRoot, ".aidflow", "config.yaml"),
      `worktree:
  auto: true
  branch_prefix: "feature/"`,
    );
    setWorkspaceRoot(testRoot);
    const config = getConfig();
    // Overridden values
    expect(config.worktree.auto).toBe(true);
    expect(config.worktree.branch_prefix).toBe("feature/");
    // Default values preserved
    expect(config.worktree.path).toBe(".aidflow/worktrees");
    expect(config.session.date_format).toBe("YYMMDD");
  });

  it("uses full custom config", () => {
    mkdirSync(join(testRoot, ".aidflow"));
    writeFileSync(
      join(testRoot, ".aidflow", "config.yaml"),
      `version: 2
worktree:
  auto: true
  path: "custom/worktrees"
  branch_prefix: "dev/"
session:
  history_path: "custom/history"
  date_format: "YYYYMMDD"
guides:
  path: "custom/guides"`,
    );
    setWorkspaceRoot(testRoot);
    const config = getConfig();
    expect(config.version).toBe(2);
    expect(config.worktree.path).toBe("custom/worktrees");
    expect(config.session.date_format).toBe("YYYYMMDD");
    expect(config.guides.path).toBe("custom/guides");
  });

  it("returns default config for invalid yaml", () => {
    mkdirSync(join(testRoot, ".aidflow"));
    writeFileSync(join(testRoot, ".aidflow", "config.yaml"), "{{invalid yaml}}");
    setWorkspaceRoot(testRoot);
    // Should not throw, falls back to default
    const config = getConfig();
    expect(config.version).toBe(1);
  });
});

describe("resolve", () => {
  it("resolves paths relative to workspace root", () => {
    setWorkspaceRoot(testRoot);
    expect(resolve("src", "index.ts")).toBe(join(testRoot, "src", "index.ts"));
  });

  it("resolves .aidflow paths", () => {
    setWorkspaceRoot(testRoot);
    expect(resolve(".aidflow", "config.yaml")).toBe(
      join(testRoot, ".aidflow", "config.yaml"),
    );
  });
});
