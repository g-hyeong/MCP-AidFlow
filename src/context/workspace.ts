import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "./yaml.js";

export interface DevpilotConfig {
  version: number;
  worktree: {
    auto: boolean;
    path: string;
    branch_prefix: string;
  };
  session: {
    history_path: string;
    date_format: string;
  };
  guides: {
    path: string;
  };
}

const DEFAULT_CONFIG: DevpilotConfig = {
  version: 1,
  worktree: {
    auto: false,
    path: ".devpilot/worktrees",
    branch_prefix: "",
  },
  session: {
    history_path: ".devpilot/history",
    date_format: "YYMMDD",
  },
  guides: {
    path: ".devpilot/guides",
  },
};

let workspaceRoot: string | null = null;
let cachedConfig: DevpilotConfig | null = null;

export function setWorkspaceRoot(root: string): void {
  workspaceRoot = root;
  cachedConfig = null;
}

export function getWorkspaceRoot(): string {
  if (!workspaceRoot) {
    throw new Error("Workspace root not set. MCP roots/list may not have been received.");
  }
  return workspaceRoot;
}

export function isInitialized(): boolean {
  try {
    const root = getWorkspaceRoot();
    return existsSync(join(root, ".devpilot"));
  } catch {
    return false;
  }
}

export function getConfig(): DevpilotConfig {
  if (cachedConfig) return cachedConfig;

  const root = getWorkspaceRoot();
  const configPath = join(root, ".devpilot", "config.yaml");

  if (!existsSync(configPath)) {
    cachedConfig = DEFAULT_CONFIG;
    return cachedConfig;
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = parseYaml(raw);
    cachedConfig = deepMerge(
      structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>,
      parsed,
    ) as unknown as DevpilotConfig;
    return cachedConfig;
  } catch {
    cachedConfig = DEFAULT_CONFIG;
    return cachedConfig;
  }
}

export function resolve(...segments: string[]): string {
  return join(getWorkspaceRoot(), ...segments);
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object"
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>,
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
