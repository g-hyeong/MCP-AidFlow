import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "./yaml.js";
import { getService } from "./service.js";

export interface AidflowConfig {
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

const DEFAULT_CONFIG: AidflowConfig = {
  version: 1,
  worktree: {
    auto: false,
    path: ".aidflow/worktrees",
    branch_prefix: "",
  },
  session: {
    history_path: ".aidflow/history",
    date_format: "YYMMDD",
  },
  guides: {
    path: ".aidflow/guides",
  },
};

let workspaceRoot: string | null = null;
let cachedConfig: AidflowConfig | null = null;

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
    return existsSync(getAidflowRoot());
  } catch {
    return false;
  }
}

export function getConfig(): AidflowConfig {
  if (cachedConfig) return cachedConfig;

  const root = getWorkspaceRoot();
  const configPath = join(root, ".aidflow", "config.yaml");

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
    ) as unknown as AidflowConfig;
    return cachedConfig;
  } catch {
    cachedConfig = DEFAULT_CONFIG;
    return cachedConfig;
  }
}

export function resolve(...segments: string[]): string {
  return join(getWorkspaceRoot(), ...segments);
}

/**
 * 서비스가 선택된 경우 해당 서비스의 .aidflow/ 경로 반환
 * 미선택 시 워크스페이스 루트의 .aidflow/ 반환
 */
export function getAidflowRoot(sessionName?: string): string {
  const service = getService(sessionName);
  if (service) {
    return service.aidflowPath;
  }
  return join(getWorkspaceRoot(), ".aidflow");
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
