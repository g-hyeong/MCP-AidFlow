import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setWorkspaceRoot } from "../src/context/workspace.js";
import { selectGlobal, bindService, clearAll } from "../src/context/service.js";
import { handleGuide } from "../src/tools/guide/handler.js";

let testRoot: string;

beforeEach(() => {
  testRoot = join(tmpdir(), `aidflow-guide-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testRoot, { recursive: true });
  mkdirSync(join(testRoot, ".aidflow"));
  setWorkspaceRoot(testRoot);
  clearAll();
});

afterEach(() => {
  rmSync(testRoot, { recursive: true, force: true });
  clearAll();
});

describe("guide - no service selected (default)", () => {
  it("returns empty when no guides exist", async () => {
    const result = await handleGuide({ action: "list" });
    expect(result).toContain("No guides found");
  });

  it("lists guides from workspace root .aidflow/guides/", async () => {
    const guidesDir = join(testRoot, ".aidflow", "guides");
    mkdirSync(guidesDir, { recursive: true });
    writeFileSync(join(guidesDir, "setup.md"), "# Setup Guide\nHow to set up the project");

    const result = await handleGuide({ action: "list" });
    expect(result).toContain("setup");
    expect(result).toContain("Setup Guide");
  });

  it("reads guide content from workspace root", async () => {
    const guidesDir = join(testRoot, ".aidflow", "guides");
    mkdirSync(guidesDir, { recursive: true });
    writeFileSync(join(guidesDir, "api.md"), "# API Guide\nEndpoint documentation\n\n## GET /users");

    const result = await handleGuide({ action: "read", topic: "api" });
    expect(result).toContain("Guide: api");
    expect(result).toContain("GET /users");
  });
});

describe("guide - with service selected", () => {
  it("reads guides from selected service's .aidflow/guides/", async () => {
    // 루트에는 가이드 없음
    mkdirSync(join(testRoot, ".aidflow", "guides"), { recursive: true });

    // 서비스에만 가이드 존재
    const svcAidflow = join(testRoot, "api-service", ".aidflow");
    const svcGuides = join(svcAidflow, "guides");
    mkdirSync(svcGuides, { recursive: true });
    writeFileSync(join(svcGuides, "deploy.md"), "# Deploy\nDeployment instructions");

    selectGlobal({ serviceName: "api-service", aidflowPath: svcAidflow });

    const result = await handleGuide({ action: "list" });
    expect(result).toContain("deploy");
    expect(result).toContain("Deploy");
  });

  it("reads specific guide from selected service", async () => {
    const svcAidflow = join(testRoot, "web", ".aidflow");
    const svcGuides = join(svcAidflow, "guides");
    mkdirSync(svcGuides, { recursive: true });
    writeFileSync(join(svcGuides, "styling.md"), "# Styling\nCSS conventions\n\n## Colors");

    selectGlobal({ serviceName: "web", aidflowPath: svcAidflow });

    const result = await handleGuide({ action: "read", topic: "styling" });
    expect(result).toContain("Guide: styling");
    expect(result).toContain("Colors");
  });

  it("does not see root guides when service is selected", async () => {
    // 루트에 가이드 존재
    const rootGuides = join(testRoot, ".aidflow", "guides");
    mkdirSync(rootGuides, { recursive: true });
    writeFileSync(join(rootGuides, "root-guide.md"), "# Root Guide\nShould not appear");

    // 서비스에는 가이드 없음
    const svcAidflow = join(testRoot, "svc", ".aidflow");
    mkdirSync(svcAidflow, { recursive: true });

    selectGlobal({ serviceName: "svc", aidflowPath: svcAidflow });

    const result = await handleGuide({ action: "list" });
    expect(result).toContain("No guides found");
  });

  it("returns not found for guide in wrong service", async () => {
    const svcAidflow = join(testRoot, "svc", ".aidflow");
    mkdirSync(join(svcAidflow, "guides"), { recursive: true });

    selectGlobal({ serviceName: "svc", aidflowPath: svcAidflow });

    const result = await handleGuide({ action: "read", topic: "nonexistent" });
    expect(result).toContain("not found");
  });
});

describe("guide - session binding (parallel work)", () => {
  it("reads guides from session-bound service, not global", async () => {
    // 글로벌: api 서비스
    const apiAidflow = join(testRoot, "api", ".aidflow");
    mkdirSync(join(apiAidflow, "guides"), { recursive: true });
    writeFileSync(join(apiAidflow, "guides", "api-guide.md"), "# API Guide\nAPI docs");
    selectGlobal({ serviceName: "api", aidflowPath: apiAidflow });

    // 세션 바인딩: web 서비스
    const webAidflow = join(testRoot, "web", ".aidflow");
    mkdirSync(join(webAidflow, "guides"), { recursive: true });
    writeFileSync(join(webAidflow, "guides", "web-guide.md"), "# Web Guide\nWeb docs");
    bindService("session-web", { serviceName: "web", aidflowPath: webAidflow });

    // session 파라미터로 세션 바인딩 서비스의 가이드를 읽어야 함
    const result = await handleGuide({ action: "list", session: "session-web" });
    expect(result).toContain("web-guide");
    expect(result).not.toContain("api-guide");
  });

  it("falls back to global when session has no binding", async () => {
    const apiAidflow = join(testRoot, "api", ".aidflow");
    mkdirSync(join(apiAidflow, "guides"), { recursive: true });
    writeFileSync(join(apiAidflow, "guides", "api-guide.md"), "# API Guide\nAPI docs");
    selectGlobal({ serviceName: "api", aidflowPath: apiAidflow });

    // session-unknown은 바인딩 없음 -> 글로벌 폴백
    const result = await handleGuide({ action: "list", session: "session-unknown" });
    expect(result).toContain("api-guide");
  });

  it("reads specific guide from session-bound service", async () => {
    const webAidflow = join(testRoot, "web", ".aidflow");
    mkdirSync(join(webAidflow, "guides"), { recursive: true });
    writeFileSync(join(webAidflow, "guides", "components.md"), "# Components\nReact component patterns\n\n## Button");
    bindService("s1", { serviceName: "web", aidflowPath: webAidflow });

    const result = await handleGuide({ action: "read", topic: "components", session: "s1" });
    expect(result).toContain("Guide: components");
    expect(result).toContain("Button");
  });
});
