# devpilot

Session-based development workflow manager for Claude Code.

## Directory Structure

```
.devpilot/
  config.yaml     # Configuration
  sessions/       # Active sessions
    {name}/
      meta.json   # Session metadata
      plan.md     # Work plan (optional)
  history/        # Archived sessions
    YYMMDD_{name}/
      meta.json
      plan.md
  guides/         # Project-specific guides
    *.md
  worktrees/      # Git worktrees (gitignored)
```

---

## config.yaml

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `version` | number | `1` | Config version |
| `worktree.auto` | boolean | `false` | Auto-create worktree on session create |
| `worktree.path` | string | `".devpilot/worktrees"` | Worktree storage path |
| `worktree.branch_prefix` | string | `""` | Branch name prefix (e.g., `"feature/"`, `"fix/"`) |
| `session.history_path` | string | `".devpilot/history"` | Archive destination |
| `session.date_format` | string | `"YYMMDD"` | Date format for archive names (`YYMMDD` or `YYYYMMDD`) |
| `guides.path` | string | `".devpilot/guides"` | Guide documents path |

---

## meta.json

Session metadata. Automatically managed by devpilot.

```json
{
  "name": "fix-auth-bug",
  "created_at": "2026-03-04T10:00:00.000Z",
  "status": "active",
  "worktree": {
    "enabled": true,
    "path": ".devpilot/worktrees/fix-auth-bug",
    "branch": "fix-auth-bug"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Session name |
| `created_at` | string (ISO 8601) | Creation timestamp |
| `status` | `"active"` \| `"completed"` | Session state |
| `completed_at` | string (ISO 8601) | Completion timestamp (set on `session complete`) |
| `worktree.enabled` | boolean | Whether worktree is attached |
| `worktree.path` | string | Worktree directory path |
| `worktree.branch` | string | Git branch name |
| `changed_files` | string[] | Files changed during session (set on `session complete`) |

---

## plan.md

Optional work plan. Created via `plan create`. Structure:

```markdown
# {Title}

## Background
{Context and motivation}

## Objective
{Clear, measurable goal}

## Requirements

### Functional Requirements
- FR-1: {requirement}

### Non-Functional Requirements
- NFR-1: {requirement}

## Out of Scope
- {Excluded items}

## Technical Approach
{Architecture, patterns, key decisions}

### Affected Files
- `path/to/file.ts` - {changes}

## Implementation Items
- [ ] Item 1
- [ ] Item 2

## Acceptance Criteria
- [ ] AC-1: {condition}

## Notes
{Constraints, assumptions, references}
```

Progress is tracked via checkboxes. `session status` reports completion rate.

---

## Guides

Markdown files in `.devpilot/guides/`. Used for project-specific knowledge injection.

- First line = title, second line = description
- Use `guide list` to see available guides
- Use `guide read` to load a specific guide

---

## Skills

Claude Code skills installed to `.claude/commands/`:

| Skill | Description |
|-------|-------------|
| `/spec` | Create or update project SPEC.md |
| `/report` | Generate session completion report |

---

## Workflow

```
session create -> (plan create) -> work -> session complete -> /report
```

1. **session create**: Start a new session (optionally with worktree)
2. **plan create** (optional): Structured planning for medium/large tasks
3. **Work**: Implement using Claude Code's native tools
4. **session status**: Check progress anytime
5. **session complete**: Archive session to history
6. **/report**: Generate completion report
