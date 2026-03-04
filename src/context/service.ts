import { existsSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { getWorkspaceRoot } from "./workspace.js";

export interface ServiceInfo {
  serviceName: string;
  aidflowPath: string;
}

/**
 * 멀티 서비스 환경에서 .aidflow 디렉토리 탐색 및 세션별 서비스 바인딩 관리
 */

// 세션별 서비스 바인딩 (세션 이름 -> 서비스 정보)
const bindings = new Map<string, ServiceInfo>();

// 글로벌 선택 (세션 없이 사용하는 경우용)
let globalSelection: ServiceInfo | null = null;

/**
 * 워크스페이스에서 모든 .aidflow 디렉토리 탐색
 */
export function discoverServices(baseDir?: string, maxDepth = 3): ServiceInfo[] {
  const root = baseDir ?? getWorkspaceRoot();
  const services: ServiceInfo[] = [];

  // 루트에 .aidflow가 있는지 확인
  const rootAidflow = join(root, ".aidflow");
  if (existsSync(rootAidflow)) {
    services.push({ serviceName: "(root)", aidflowPath: rootAidflow });
  }

  // 하위 디렉토리 탐색
  scanDirectory(root, services, 0, maxDepth);

  return services;
}

function scanDirectory(
  dir: string,
  services: ServiceInfo[],
  currentDepth: number,
  maxDepth: number,
): void {
  if (currentDepth >= maxDepth) return;

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") {
      continue;
    }

    if (entry.isDirectory()) {
      const subDir = join(dir, entry.name);
      const aidflowPath = join(subDir, ".aidflow");

      if (existsSync(aidflowPath)) {
        services.push({ serviceName: entry.name, aidflowPath });
      }

      scanDirectory(subDir, services, currentDepth + 1, maxDepth);
    }
  }
}

/**
 * 세션에 서비스 바인딩
 */
export function bindService(sessionName: string, service: ServiceInfo): void {
  bindings.set(sessionName, service);
}

/**
 * 세션의 바인딩된 서비스 조회
 */
export function getBinding(sessionName: string): ServiceInfo | null {
  return bindings.get(sessionName) ?? null;
}

/**
 * 세션 바인딩 해제
 */
export function unbindService(sessionName: string): void {
  bindings.delete(sessionName);
}

/**
 * 글로벌 서비스 선택 (세션 없이 사용 시)
 */
export function selectGlobal(service: ServiceInfo): void {
  globalSelection = service;
}

/**
 * 글로벌 선택된 서비스 조회
 */
export function getGlobalSelection(): ServiceInfo | null {
  return globalSelection;
}

/**
 * 서비스 조회 (세션 바인딩 우선, 글로벌 폴백)
 */
export function getService(sessionName?: string): ServiceInfo | null {
  if (sessionName) {
    const binding = bindings.get(sessionName);
    if (binding) return binding;
  }
  return globalSelection;
}

/**
 * 서비스 선택 여부 확인
 */
export function isServiceSelected(sessionName?: string): boolean {
  return getService(sessionName) !== null;
}

/**
 * 모든 바인딩 초기화
 */
export function clearAll(): void {
  bindings.clear();
  globalSelection = null;
}

/**
 * 현재 바인딩 상태 조회
 */
export function listBindings(): Array<{ sessionName: string; service: ServiceInfo }> {
  return Array.from(bindings.entries()).map(([sessionName, service]) => ({
    sessionName,
    service,
  }));
}
