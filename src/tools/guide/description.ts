export const description = `Access project guide documents. (list/read)

- **list**: Show available guides (excludes \`_\`-prefixed required guides).
- **read**: Read a specific guide by topic name.

**Required guides** (\`_plan.md\`, \`_session_*.md\`, etc.) are auto-loaded by corresponding tools.
**Regular guides**: When a guide name matches the current task context, proactively read it without waiting for the user to ask.`;
