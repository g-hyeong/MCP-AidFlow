---
name: report
description: Generate a session completion report. Call after session complete.
allowed-tools: Read, Write, Bash, Glob, Grep
user-invokable: true
argument-hint: "[session-name]"
---

Generate a completion report for the most recently archived session.

## Steps

1. Find the latest directory in `.devpilot/history/` (sorted by name, newest first)
2. Read `meta.json` from that directory to get session metadata
3. Read `plan.md` from that directory (if exists)
4. Gather git commits for the session period:
   - Use `created_at` and `completed_at` from meta.json as the time range
   - Run: `git log --oneline --after="{created_at}" --before="{completed_at}"`
   - If no completed_at, use current time as the end
5. Read the changed files listed in meta.json and briefly review each
6. Write `report.md` in the history directory

## report.md Format

```markdown
# {Session Name} - Report

## Summary
{1-2 line summary of what was accomplished}

## Plan Completion
{Plan items and their completion status, if plan existed}

## Changed Files
| File | Change Type | Description |
|------|-------------|-------------|
| path/to/file | modified/new/deleted | Brief description |

## Key Decisions
{Important technical decisions made during the work}

## Issues & Observations
{Any issues found, edge cases discovered, or observations for future reference}

## Duration
- Started: {created_at}
- Completed: {completed_at}
- Commits: {number of commits in range}
```

## Notes
- If the history directory is empty, inform the user to run `session complete` first
- Focus on factual reporting, not speculation
- Keep descriptions concise but informative
