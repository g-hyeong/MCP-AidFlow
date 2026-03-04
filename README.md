# aidflow

Session-based development workflow MCP server for Claude Code.

Every development task gets its own session with a plan, progress tracking, and archiving. Claude Code automatically resumes where you left off, even in new conversations.

## Installation

```bash
npm install -g aidflow
```

Add to your Claude Code MCP configuration (`~/.claude/settings.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "aidflow": {
      "command": "aidflow",
      "env": {
        "DEVPILOT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

Or run with npx (no install):

```json
{
  "mcpServers": {
    "aidflow": {
      "command": "npx",
      "args": ["-y", "aidflow"],
      "env": {
        "DEVPILOT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

> `DEVPILOT_ROOT` defaults to `process.cwd()` if not set.

## What It Does

aidflow structures your Claude Code workflow into **sessions** - isolated units of work with plans, progress tracking, and completion reports.

### Development Cycle

```
init -> /spec -> session create -> plan create -> work -> /review -> session complete -> /report
```

1. **`init`** - Set up `.devpilot/` directory and configuration
2. **`/spec`** - Define project engineering foundations (SPEC.md)
3. **`session create`** - Start a new work session
4. **`plan create`** - Structured planning with multi-round requirements gathering
5. **Work** - Implement using Claude Code's native tools, following the plan
6. **`/review`** - Quality gate before completing
7. **`session complete`** - Archive the session to history
8. **`/report`** - Generate a completion report

### Context Recovery

When you start a new conversation, aidflow automatically detects active sessions and resumes where you left off - reading the plan, checking progress, and continuing work without losing context.

### Git Worktree Support

Each session can optionally create a git worktree, giving you an isolated branch for the work. Useful for parallel tasks.

## Tools

| Tool | Actions | Description |
|------|---------|-------------|
| `init` | - | Initialize aidflow in a project |
| `session` | create, list, status, complete | Manage development sessions |
| `plan` | create, get | Create and track work plans |
| `guide` | list, read | Access project-specific guide documents |

## Skills

Installed to `.claude/commands/` during init:

| Skill | Description |
|-------|-------------|
| `/spec` | Create or update SPEC.md (project conventions) |
| `/review` | Quality review before session complete |
| `/report` | Generate completion report after archiving |

## Project Structure

After `init`, your project gets:

```
your-project/
  SPEC.md                    # Project engineering foundations (via /spec)
  .devpilot/
    config.yaml              # Configuration
    README.md                # Internal documentation
    sessions/                # Active sessions
      {name}/
        meta.json            # Session metadata
        plan.md              # Work plan (optional)
    history/                 # Archived sessions
      YYMMDD_{name}/
        meta.json
        plan.md
        report.md
    guides/                  # Project-specific guides
    worktrees/               # Git worktrees (gitignored)
  .claude/
    commands/                # Claude Code skills
      spec.md
      review.md
      report.md
```

## Configuration

`.devpilot/config.yaml`:

```yaml
version: 1

worktree:
  auto: false                # Auto-create worktree per session
  path: ".devpilot/worktrees"
  branch_prefix: ""          # e.g., "feature/", "fix/"

session:
  history_path: ".devpilot/history"
  date_format: "YYMMDD"     # or "YYYYMMDD"

guides:
  path: ".devpilot/guides"
```

## Requirements

- Node.js >= 22
- Claude Code (or any MCP-compatible AI client)

## License

MIT
