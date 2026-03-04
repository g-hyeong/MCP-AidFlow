import { describe, it, expect } from "vitest";
import { parse, stringify } from "../src/context/yaml.js";

describe("YAML parser", () => {
  it("parses simple key-value pairs", () => {
    const result = parse("name: devpilot\nversion: 1");
    expect(result).toEqual({ name: "devpilot", version: 1 });
  });

  it("parses nested objects", () => {
    const yaml = `worktree:
  auto: false
  path: ".devpilot/worktrees"
  branch_prefix: ""`;
    const result = parse(yaml);
    expect(result).toEqual({
      worktree: {
        auto: false,
        path: ".devpilot/worktrees",
        branch_prefix: "",
      },
    });
  });

  it("parses boolean values", () => {
    const result = parse("enabled: true\ndisabled: false");
    expect(result).toEqual({ enabled: true, disabled: false });
  });

  it("parses null values", () => {
    const result = parse("value: null");
    expect(result).toEqual({ value: null });
  });

  it("parses quoted strings", () => {
    const result = parse(`single: 'hello'\ndouble: "world"`);
    expect(result).toEqual({ single: "hello", double: "world" });
  });

  it("parses numeric values", () => {
    const result = parse("count: 42\npi: 3.14");
    expect(result).toEqual({ count: 42, pi: 3.14 });
  });

  it("ignores comments", () => {
    const result = parse("# comment\nkey: value\n# another comment");
    expect(result).toEqual({ key: "value" });
  });

  it("ignores empty lines", () => {
    const result = parse("a: 1\n\n\nb: 2");
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("parses deeply nested objects", () => {
    const yaml = `level1:
  level2:
    level3: deep`;
    const result = parse(yaml);
    expect(result).toEqual({
      level1: { level2: { level3: "deep" } },
    });
  });

  it("parses multiple top-level sections", () => {
    const yaml = `worktree:
  auto: false
session:
  history_path: ".devpilot/history"
  date_format: "YYMMDD"`;
    const result = parse(yaml);
    expect(result).toEqual({
      worktree: { auto: false },
      session: {
        history_path: ".devpilot/history",
        date_format: "YYMMDD",
      },
    });
  });

  it("handles empty string values (quoted)", () => {
    const result = parse(`prefix: ""`);
    expect(result).toEqual({ prefix: "" });
  });
});

describe("YAML stringify", () => {
  it("stringifies simple key-value pairs", () => {
    const result = stringify({ name: "devpilot", version: 1 });
    expect(result).toContain('name: "devpilot"');
    expect(result).toContain("version: 1");
  });

  it("stringifies nested objects with indentation", () => {
    const result = stringify({
      worktree: { auto: false, path: ".devpilot/worktrees" },
    });
    expect(result).toContain("worktree:");
    expect(result).toContain('  path: ".devpilot/worktrees"');
    expect(result).toContain("  auto: false");
  });

  it("roundtrips simple config", () => {
    const original = {
      version: 1,
      worktree: { auto: false, path: ".devpilot/worktrees" },
    };
    const yaml = stringify(original);
    const parsed = parse(yaml);
    expect(parsed).toEqual(original);
  });
});
