import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setWorkspaceRoot } from "../src/context/workspace.js";
import {
  discoverServices,
  bindService,
  getBinding,
  unbindService,
  selectGlobal,
  getGlobalSelection,
  getService,
  isServiceSelected,
  clearAll,
  listBindings,
} from "../src/context/service.js";

let testRoot: string;

beforeEach(() => {
  testRoot = join(tmpdir(), `aidflow-svc-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testRoot, { recursive: true });
  setWorkspaceRoot(testRoot);
  clearAll();
});

afterEach(() => {
  rmSync(testRoot, { recursive: true, force: true });
  clearAll();
});

describe("discoverServices", () => {
  it("returns empty when no .aidflow exists", () => {
    const services = discoverServices();
    expect(services).toEqual([]);
  });

  it("finds root .aidflow", () => {
    mkdirSync(join(testRoot, ".aidflow"));
    const services = discoverServices();
    expect(services).toHaveLength(1);
    expect(services[0].serviceName).toBe("(root)");
    expect(services[0].aidflowPath).toBe(join(testRoot, ".aidflow"));
  });

  it("finds .aidflow in subdirectories", () => {
    mkdirSync(join(testRoot, "service-a", ".aidflow"), { recursive: true });
    mkdirSync(join(testRoot, "service-b", ".aidflow"), { recursive: true });
    const services = discoverServices();
    expect(services).toHaveLength(2);
    const names = services.map((s) => s.serviceName).sort();
    expect(names).toEqual(["service-a", "service-b"]);
  });

  it("finds both root and subdirectory services", () => {
    mkdirSync(join(testRoot, ".aidflow"));
    mkdirSync(join(testRoot, "api", ".aidflow"), { recursive: true });
    const services = discoverServices();
    expect(services).toHaveLength(2);
    expect(services[0].serviceName).toBe("(root)");
    expect(services[1].serviceName).toBe("api");
  });

  it("skips node_modules and hidden directories", () => {
    mkdirSync(join(testRoot, "node_modules", "pkg", ".aidflow"), { recursive: true });
    mkdirSync(join(testRoot, ".hidden", ".aidflow"), { recursive: true });
    const services = discoverServices();
    expect(services).toHaveLength(0);
  });

  it("respects maxDepth", () => {
    mkdirSync(join(testRoot, "a", "b", "c", "d", ".aidflow"), { recursive: true });
    // maxDepth=3: a(0) -> b(1) -> c(2) -> d(3, skipped)
    const shallow = discoverServices(undefined, 3);
    expect(shallow).toHaveLength(0);

    const deep = discoverServices(undefined, 5);
    expect(deep).toHaveLength(1);
  });

  it("accepts explicit baseDir", () => {
    const subDir = join(testRoot, "workspace");
    mkdirSync(join(subDir, ".aidflow"), { recursive: true });
    const services = discoverServices(subDir);
    expect(services).toHaveLength(1);
    expect(services[0].serviceName).toBe("(root)");
  });
});

describe("session binding", () => {
  const svcA = { serviceName: "api", aidflowPath: "/path/to/api/.aidflow" };
  const svcB = { serviceName: "web", aidflowPath: "/path/to/web/.aidflow" };

  it("binds and retrieves service for a session", () => {
    bindService("session-1", svcA);
    expect(getBinding("session-1")).toEqual(svcA);
  });

  it("returns null for unbound session", () => {
    expect(getBinding("nonexistent")).toBeNull();
  });

  it("supports multiple sessions with different services", () => {
    bindService("session-1", svcA);
    bindService("session-2", svcB);
    expect(getBinding("session-1")).toEqual(svcA);
    expect(getBinding("session-2")).toEqual(svcB);
  });

  it("unbinds service from session", () => {
    bindService("session-1", svcA);
    unbindService("session-1");
    expect(getBinding("session-1")).toBeNull();
  });

  it("lists all bindings", () => {
    bindService("session-1", svcA);
    bindService("session-2", svcB);
    const bindings = listBindings();
    expect(bindings).toHaveLength(2);
  });
});

describe("global selection", () => {
  const svc = { serviceName: "api", aidflowPath: "/path/.aidflow" };

  it("selects and retrieves global service", () => {
    selectGlobal(svc);
    expect(getGlobalSelection()).toEqual(svc);
  });

  it("returns null when no global selection", () => {
    expect(getGlobalSelection()).toBeNull();
  });
});

describe("getService (priority)", () => {
  const globalSvc = { serviceName: "global", aidflowPath: "/global/.aidflow" };
  const sessionSvc = { serviceName: "session", aidflowPath: "/session/.aidflow" };

  it("returns session binding when available", () => {
    selectGlobal(globalSvc);
    bindService("s1", sessionSvc);
    expect(getService("s1")).toEqual(sessionSvc);
  });

  it("falls back to global when session has no binding", () => {
    selectGlobal(globalSvc);
    expect(getService("s1")).toEqual(globalSvc);
  });

  it("returns global when no session specified", () => {
    selectGlobal(globalSvc);
    expect(getService()).toEqual(globalSvc);
  });

  it("returns null when nothing selected", () => {
    expect(getService("s1")).toBeNull();
    expect(getService()).toBeNull();
  });
});

describe("isServiceSelected", () => {
  it("returns false when nothing selected", () => {
    expect(isServiceSelected()).toBe(false);
  });

  it("returns true with global selection", () => {
    selectGlobal({ serviceName: "x", aidflowPath: "/x" });
    expect(isServiceSelected()).toBe(true);
  });

  it("returns true with session binding", () => {
    bindService("s1", { serviceName: "x", aidflowPath: "/x" });
    expect(isServiceSelected("s1")).toBe(true);
  });
});

describe("clearAll", () => {
  it("clears all bindings and global selection", () => {
    selectGlobal({ serviceName: "g", aidflowPath: "/g" });
    bindService("s1", { serviceName: "a", aidflowPath: "/a" });
    clearAll();
    expect(getGlobalSelection()).toBeNull();
    expect(getBinding("s1")).toBeNull();
    expect(listBindings()).toHaveLength(0);
  });
});
