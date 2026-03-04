/**
 * Minimal YAML parser for config.yaml.
 * Handles simple key-value pairs and nested objects (indent-based).
 * No external dependency needed for our simple config format.
 */
export function parse(yaml: string): Record<string, unknown> {
  const lines = yaml.split("\n");
  const result: Record<string, unknown> = {};
  const stack: { indent: number; obj: Record<string, unknown> }[] = [
    { indent: -1, obj: result },
  ];

  for (const line of lines) {
    const trimmed = line.replace(/\s+$/, "");
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.length - line.trimStart().length;
    const match = trimmed.match(/^(\s*)([^:]+):\s*(.*)?$/);
    if (!match) continue;

    const key = match[2].trim();
    const rawValue = (match[3] ?? "").trim();

    // Pop stack to find parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].obj;

    if (!rawValue) {
      // Nested object
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
    } else {
      // Scalar value
      parent[key] = parseValue(rawValue);
    }
  }

  return result;
}

function parseValue(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;

  // Remove quotes
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }

  const num = Number(raw);
  if (!isNaN(num) && raw !== "") return num;

  return raw;
}

export function stringify(obj: Record<string, unknown>, indent = 0): string {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      lines.push(`${prefix}${key}:`);
      lines.push(stringify(value as Record<string, unknown>, indent + 1));
    } else if (typeof value === "string") {
      lines.push(`${prefix}${key}: "${value}"`);
    } else {
      lines.push(`${prefix}${key}: ${value}`);
    }
  }

  return lines.join("\n");
}
