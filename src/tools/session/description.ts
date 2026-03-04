export const description = `Manage development sessions. (create/list/status/complete)

- **create**: Start a new session. Optionally creates a git worktree for isolation.
- **list**: Show all active sessions with their status.
- **status**: Get session progress (changed files, plan progress, next suggestion).
- **complete**: Archive session to history. Prompts for worktree cleanup.

Start with \`create\` when beginning work, end with \`complete\` when done.`;
