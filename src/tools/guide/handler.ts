import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isInitialized, getConfig, resolve } from "../../context/workspace.js";
import type { GuideInput } from "./schema.js";

interface GuideInfo {
  name: string;
  title: string;
  description: string;
}

function getGuidesDir(): string {
  const config = getConfig();
  return resolve(config.guides.path);
}

function listGuides(): GuideInfo[] {
  const dir = getGuidesDir();
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
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

export async function handleGuide(input: GuideInput): Promise<string> {
  if (!isInitialized()) {
    return "aidflow is not initialized. Run `init` first.";
  }

  switch (input.action) {
    case "list":
      return handleList();
    case "read":
      return handleRead(input.topic);
  }
}

function handleList(): string {
  const guides = listGuides();

  if (guides.length === 0) {
    return [
      "No guides found.",
      "Add markdown files to .aidflow/guides/ to create project guides.",
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

function handleRead(topic?: string): string {
  if (!topic) {
    return "Specify a guide topic to read. Use `guide list` to see available guides.";
  }

  const guidePath = join(getGuidesDir(), `${topic}.md`);
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
