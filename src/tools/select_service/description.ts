export const description = `Select target service in multi-service workspace. (list/select/status)

- **list**: Discover all .aidflow directories in workspace. Auto-selects if only one found.
- **select**: Select a specific service by name. Optionally bind to a session for parallel work.
- **status**: Show current service selection (session-bound or global).

Call this before other tools (session, plan, guide) when working in a multi-service workspace.
Single-service projects are auto-selected on \`list\`.`;
