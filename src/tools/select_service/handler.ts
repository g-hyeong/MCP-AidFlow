import {
  discoverServices,
  selectGlobal,
  bindService,
  getService,
  isServiceSelected,
  listBindings,
} from "../../context/service.js";
import type { SelectServiceInput } from "./schema.js";

export async function handleSelectService(input: SelectServiceInput): Promise<string> {
  switch (input.action) {
    case "list":
      return handleList(input);
    case "select":
      return handleSelect(input);
    case "status":
      return handleStatus(input);
  }
}

function handleList(input: SelectServiceInput): string {
  const services = discoverServices(input.workspacePath);

  if (services.length === 0) {
    return [
      "# No .aidflow directories found",
      "",
      "No `.aidflow/` directory found in workspace.",
      "",
      "Run `init` to initialize aidflow, or create `.aidflow/` in service subdirectories for multi-service setup:",
      "```",
      "workspace/",
      "  service-a/.aidflow/",
      "  service-b/.aidflow/",
      "```",
    ].join("\n");
  }

  // 단일 서비스: 자동 선택
  if (services.length === 1) {
    const svc = services[0];

    if (input.session) {
      bindService(input.session, svc);
    } else {
      selectGlobal(svc);
    }

    return [
      "# Service auto-selected",
      "",
      `**Service**: ${svc.serviceName}`,
      `**Path**: ${svc.aidflowPath}`,
      input.session ? `**Bound to session**: ${input.session}` : "**Scope**: global",
    ].join("\n");
  }

  // 멀티 서비스: 목록 반환
  const listText = services
    .map((svc, idx) => `${idx + 1}. **${svc.serviceName}** - ${svc.aidflowPath}`)
    .join("\n");

  const currentService = getService(input.session);
  const currentStatus = currentService
    ? `\n**Currently selected**: ${currentService.serviceName}`
    : "";

  return [
    `# Services found (${services.length})`,
    "",
    listText,
    currentStatus,
    "",
    "---",
    "Next: Confirm target service with the user, then call `select_service(action: \"select\", service: \"name\")`.",
  ].join("\n");
}

function handleSelect(input: SelectServiceInput): string {
  if (!input.service) {
    return 'Error: `service` parameter is required for select action.';
  }

  const services = discoverServices(input.workspacePath);
  const found = services.find((svc) => svc.serviceName === input.service);

  if (!found) {
    const available = services.map((s) => s.serviceName).join(", ");
    return [
      `Error: Service "${input.service}" not found.`,
      "",
      `Available services: ${available || "none"}`,
      "Run `select_service(action: \"list\")` to discover services.",
    ].join("\n");
  }

  if (input.session) {
    bindService(input.session, found);
  } else {
    selectGlobal(found);
  }

  return [
    "# Service selected",
    "",
    `**Service**: ${found.serviceName}`,
    `**Path**: ${found.aidflowPath}`,
    input.session ? `**Bound to session**: ${input.session}` : "**Scope**: global",
  ].join("\n");
}

function handleStatus(input: SelectServiceInput): string {
  const service = getService(input.session);

  if (!service) {
    return [
      "# No service selected",
      "",
      "Run `select_service(action: \"list\")` to discover and select a service.",
    ].join("\n");
  }

  const lines = [
    "# Current service",
    "",
    `**Service**: ${service.serviceName}`,
    `**Path**: ${service.aidflowPath}`,
  ];

  if (input.session) {
    lines.push(`**Session**: ${input.session}`);
  }

  // 다른 세션 바인딩 상태 표시
  const allBindings = listBindings();
  if (allBindings.length > 0) {
    lines.push("", "**Session bindings**:");
    for (const b of allBindings) {
      lines.push(`- ${b.sessionName} -> ${b.service.serviceName}`);
    }
  }

  return lines.join("\n");
}
