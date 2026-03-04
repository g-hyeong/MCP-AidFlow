import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setWorkspaceRoot } from "../src/context/workspace.js";
import { clearAll, getService, getGlobalSelection, getBinding } from "../src/context/service.js";
import { handleSelectService } from "../src/tools/select_service/handler.js";

let testRoot: string;

beforeEach(() => {
  testRoot = join(tmpdir(), `aidflow-sel-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testRoot, { recursive: true });
  setWorkspaceRoot(testRoot);
  clearAll();
});

afterEach(() => {
  rmSync(testRoot, { recursive: true, force: true });
  clearAll();
});

describe("handleSelectService - list", () => {
  it("returns no-services message when empty", async () => {
    const result = await handleSelectService({ action: "list" });
    expect(result).toContain("No .aidflow directories found");
  });

  it("auto-selects single service globally", async () => {
    mkdirSync(join(testRoot, ".aidflow"));
    const result = await handleSelectService({ action: "list" });
    expect(result).toContain("auto-selected");
    expect(result).toContain("(root)");
    expect(getGlobalSelection()?.serviceName).toBe("(root)");
  });

  it("auto-selects and binds to session when specified", async () => {
    mkdirSync(join(testRoot, ".aidflow"));
    const result = await handleSelectService({ action: "list", session: "my-session" });
    expect(result).toContain("auto-selected");
    expect(result).toContain("my-session");
    expect(getBinding("my-session")?.serviceName).toBe("(root)");
  });

  it("returns list for multiple services", async () => {
    mkdirSync(join(testRoot, "api", ".aidflow"), { recursive: true });
    mkdirSync(join(testRoot, "web", ".aidflow"), { recursive: true });
    const result = await handleSelectService({ action: "list" });
    expect(result).toContain("Services found (2)");
    expect(result).toContain("api");
    expect(result).toContain("web");
  });
});

describe("handleSelectService - select", () => {
  it("returns error when service param missing", async () => {
    const result = await handleSelectService({ action: "select" });
    expect(result).toContain("Error");
    expect(result).toContain("service");
  });

  it("returns error for non-existent service", async () => {
    mkdirSync(join(testRoot, "api", ".aidflow"), { recursive: true });
    const result = await handleSelectService({ action: "select", service: "nonexistent" });
    expect(result).toContain("Error");
    expect(result).toContain("not found");
  });

  it("selects service globally", async () => {
    mkdirSync(join(testRoot, "api", ".aidflow"), { recursive: true });
    const result = await handleSelectService({ action: "select", service: "api" });
    expect(result).toContain("Service selected");
    expect(result).toContain("api");
    expect(getGlobalSelection()?.serviceName).toBe("api");
  });

  it("binds service to session", async () => {
    mkdirSync(join(testRoot, "api", ".aidflow"), { recursive: true });
    const result = await handleSelectService({ action: "select", service: "api", session: "s1" });
    expect(result).toContain("Bound to session");
    expect(getBinding("s1")?.serviceName).toBe("api");
  });
});

describe("handleSelectService - status", () => {
  it("returns no-selection message when nothing selected", async () => {
    const result = await handleSelectService({ action: "status" });
    expect(result).toContain("No service selected");
  });

  it("returns current global selection", async () => {
    mkdirSync(join(testRoot, "api", ".aidflow"), { recursive: true });
    await handleSelectService({ action: "select", service: "api" });
    const result = await handleSelectService({ action: "status" });
    expect(result).toContain("Current service");
    expect(result).toContain("api");
  });

  it("returns session-specific binding", async () => {
    mkdirSync(join(testRoot, "api", ".aidflow"), { recursive: true });
    await handleSelectService({ action: "select", service: "api", session: "s1" });
    const result = await handleSelectService({ action: "status", session: "s1" });
    expect(result).toContain("api");
    expect(result).toContain("s1");
  });
});
