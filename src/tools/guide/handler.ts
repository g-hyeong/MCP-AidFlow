import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isInitialized, getConfig, resolve } from "../../context/workspace.js";
import { getService } from "../../context/service.js";
import type { GuideInput } from "./schema.js";

interface GuideInfo {
  name: string;
  title: string;
  description: string;
}

function getGuidesDir(sessionName?: string): string {
  // 서비스가 선택된 경우 해당 서비스의 guides/ 사용
  const service = getService(sessionName);
  if (service) {
    return join(service.aidflowPath, "guides");
  }
  const config = getConfig();
  return resolve(config.guides.path);
}

function listGuides(sessionName?: string): GuideInfo[] {
  const dir = getGuidesDir(sessionName);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => {
      const name = f.replace(/\.md$/, "");
      const content = readFileSync(join(dir, f), "utf-8");
      const lines = content.split("\n").filter((l) => l.trim());

      // First line as title (strip # prefix), second as description
      const title = (lines[0] ?? name).replace(/^#+\s*/, "");
      const description = lines[1] ?? "";

      return { name, title, description };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * 특정 도구의 필독 가이드 조회
 * _{toolName}.md 또는 _{toolName}_*.md 패턴 매칭
 * 다른 도구 핸들러에서 import하여 사용
 */
export function getRequiredGuides(toolName: string, sessionName?: string): Array<{ name: string; content: string }> {
  const dir = getGuidesDir(sessionName);
  if (!existsSync(dir)) return [];

  const prefix = `_${toolName}`;

  return readdirSync(dir)
    .filter((f) => {
      if (!f.endsWith(".md")) return false;
      const name = f.replace(/\.md$/, "");
      return name === prefix || name.startsWith(`${prefix}_`);
    })
    .map((f) => {
      const name = f.replace(/\.md$/, "");
      const content = readFileSync(join(dir, f), "utf-8").trim();
      return { name, content };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * 필독 가이드를 마크다운 섹션으로 포맷
 */
export function formatRequiredGuides(guides: Array<{ name: string; content: string }>): string {
  if (guides.length === 0) return "";

  const sections = guides
    .map((g) => `### ${g.name}\n\n${g.content}`)
    .join("\n\n---\n\n");

  return `## Required Guides (auto-loaded)\n\n${sections}`;
}

export async function handleGuide(input: GuideInput): Promise<string> {
  if (!isInitialized()) {
    return "aidflow is not initialized. Run `init` first.";
  }

  switch (input.action) {
    case "list":
      return handleList(input.session);
    case "read":
      return handleRead(input.topic, input.session);
  }
}

function handleList(sessionName?: string): string {
  const guides = listGuides(sessionName);

  if (guides.length === 0) {
    return [
      "No guides found.",
      "Add markdown files to .aidflow/guides/ to create project guides.",
      "",
      "Tip: Files prefixed with `_` (e.g., `_plan.md`, `_plan_api.md`) are auto-loaded",
      "when the corresponding tool is called, and excluded from this list.",
    ].join("\n");
  }

  const lines = [
    `Available guides (${guides.length}):\n`,
    ...guides.map(
      (g, i) => `${i + 1}. **${g.name}** - ${g.title}${g.description ? `\n   ${g.description}` : ""}`,
    ),
    "",
    "Ask the user which guide to read using AskUserQuestion.",
    "Do not auto-select guides.",
  ];

  return lines.join("\n");
}

function handleRead(topic?: string, sessionName?: string): string {
  if (!topic) {
    return "Specify a guide topic to read. Use `guide list` to see available guides.";
  }

  const guidePath = join(getGuidesDir(sessionName), `${topic}.md`);
  if (!existsSync(guidePath)) {
    return `Guide "${topic}" not found. Use \`guide list\` to see available guides.`;
  }

  const content = readFileSync(guidePath, "utf-8");
  return [
    `Guide: ${topic}`,
    "---",
    content,
  ].join("\n");
}
