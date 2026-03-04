import { existsSync, mkdirSync, writeFileSync, copyFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolve, isInitialized, getWorkspaceRoot } from "../../context/workspace.js";
import type { InitInput } from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function templatesDir(): string {
  // In dist: dist/tools/init/handler.js -> need to go up to dist/, then to templates/
  // Templates are at package root: templates/
  return join(__dirname, "..", "..", "..", "templates");
}

function copyTemplateDir(srcDir: string, destDir: string): string[] {
  const created: string[] = [];
  if (!existsSync(srcDir)) return created;

  mkdirSync(destDir, { recursive: true });

  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);

    if (entry.isDirectory()) {
      created.push(...copyTemplateDir(srcPath, destPath));
    } else {
      if (!existsSync(destPath)) {
        copyFileSync(srcPath, destPath);
        created.push(destPath);
      }
    }
  }

  return created;
}

export async function handleInit(input: InitInput): Promise<string> {
  const root = getWorkspaceRoot();

  if (isInitialized() && !input.force) {
    return [
      "devpilot is already initialized in this project.",
      "",
      "Directory: .devpilot/",
      "Use `force: true` to overwrite existing configuration.",
    ].join("\n");
  }

  const created: string[] = [];
  const tplDir = templatesDir();

  // 1. Create .devpilot/ structure
  const dirs = [
    ".devpilot",
    ".devpilot/sessions",
    ".devpilot/history",
    ".devpilot/guides",
  ];
  for (const dir of dirs) {
    const full = resolve(dir);
    if (!existsSync(full)) {
      mkdirSync(full, { recursive: true });
      created.push(dir + "/");
    }
  }

  // 2. Copy config.yaml
  const configDest = resolve(".devpilot", "config.yaml");
  const configSrc = join(tplDir, "config.yaml");
  if ((!existsSync(configDest) || input.force) && existsSync(configSrc)) {
    copyFileSync(configSrc, configDest);
    created.push(".devpilot/config.yaml");
  }

  // 3. Copy README.md
  const readmeDest = resolve(".devpilot", "README.md");
  const readmeSrc = join(tplDir, "README.md");
  if ((!existsSync(readmeDest) || input.force) && existsSync(readmeSrc)) {
    copyFileSync(readmeSrc, readmeDest);
    created.push(".devpilot/README.md");
  }

  // 4. Copy guide templates
  const guidesSrc = join(tplDir, "guides");
  if (existsSync(guidesSrc)) {
    const guideFiles = copyTemplateDir(guidesSrc, resolve(".devpilot", "guides"));
    created.push(...guideFiles.map((f) => f.replace(root + "/", "")));
  }

  // 5. Copy skills to .claude/skills/
  const skillsSrc = join(tplDir, "skills");
  if (existsSync(skillsSrc)) {
    const skillsDest = resolve(".claude", "skills");
    mkdirSync(skillsDest, { recursive: true });
    const skillFiles = copyTemplateDir(skillsSrc, skillsDest);
    created.push(...skillFiles.map((f) => f.replace(root + "/", "")));
  }

  // 6. Add .devpilot/worktrees to .gitignore if needed
  const gitignorePath = resolve(".gitignore");
  const worktreeEntry = ".devpilot/worktrees/";
  if (existsSync(gitignorePath)) {
    const content = await import("node:fs").then((fs) =>
      fs.readFileSync(gitignorePath, "utf-8"),
    );
    if (!content.includes(worktreeEntry)) {
      writeFileSync(
        gitignorePath,
        content.trimEnd() + "\n\n# devpilot worktrees\n" + worktreeEntry + "\n",
      );
      created.push(".gitignore (updated)");
    }
  } else {
    writeFileSync(gitignorePath, "# devpilot worktrees\n" + worktreeEntry + "\n");
    created.push(".gitignore (created)");
  }

  return [
    "devpilot initialized successfully.",
    "",
    "Created files:",
    ...created.map((f) => `  - ${f}`),
    "",
    "Next steps:",
    "1. Run `/spec` to define project-level engineering foundations (SPEC.md). This is essential for consistent development.",
    "2. Add project-specific guides to .devpilot/guides/",
    "3. Review .devpilot/config.yaml for worktree settings",
    "4. Start working with `session create`",
    "",
    "Read .devpilot/README.md for detailed documentation.",
  ].join("\n");
}
