---
name: finish
description: Complete session - review, archive, report, and commit in one step.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch
user-invokable: true
---

Complete the current session by running review, archive, report, and commit sequentially.
Stop immediately at any step if a blocking issue is found.

## Step 1: Review

1. **Identify the active session**
   - Use `session status` to find the current session and its changed files
   - Read plan.md to understand what was intended

2. **Code Review - Changed Files**
   Read EVERY changed file and check:
   - Does the implementation match plan.md requirements?
   - Are there any incomplete TODOs or FIXMEs?
   - Error handling: are edge cases covered?
   - If SPEC.md exists, do changes follow its conventions?
   - Are there any hardcoded values that should be configurable?
   - Security: no exposed secrets, no injection vulnerabilities?

3. **Consistency Check**
   - Naming conventions consistent across new/modified code?
   - Import patterns match existing codebase style?
   - No duplicate logic that should be extracted?
   - No dead code or unused imports left behind?

4. **Test Coverage**
   - Run existing tests: `npm test` (or project-specific command from SPEC.md)
   - If tests fail, STOP here and report failures to the user

5. **Plan Completion Audit**
   - Check each Implementation Item and Acceptance Criteria in plan.md
   - Ensure all `- [ ]` items are checked `- [x]` if completed
   - Flag any genuinely unchecked items

6. **Review Gate**
   - If blocking issues found: present them with AskUserQuestion, offer "Fix now" / "Proceed anyway" / "Cancel"
   - If "Fix now": fix issues, then restart from Step 1
   - If "Cancel": stop entirely
   - If no issues or "Proceed anyway": continue to Step 2

## Step 2: Archive Session

Run `session complete` to archive the session.
- If it fails due to incomplete plan items, use `force: true`

## Step 3: Generate Report

1. Find the latest directory in `.aidflow/history/` (sorted by name, newest first)
2. Read `meta.json` from that directory to get session metadata
3. Read `plan.md` from that directory (if exists)
4. Gather git commits for the session period:
   - Use `created_at` and `completed_at` from meta.json as the time range
   - Run: `git log --oneline --after="{created_at}" --before="{completed_at}"`
5. Read the changed files listed in meta.json and briefly review each
6. Write `report.md` in the history directory with this format:

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
{Any issues found, edge cases, or observations for future reference}

## Duration
- Started: {created_at}
- Completed: {completed_at}
- Commits: {number}
```

## Step 4: Git Commit

1. Run `git status` and `git diff` to see all changes
2. Stage relevant files (avoid .env, credentials, etc.)
3. Draft a commit message following project conventions:
   - Message in Korean
   - NO Co-Authored-By or AI traces
   - Format: short title + blank line + bullet point details (if needed)
4. Present the commit message to the user with AskUserQuestion for approval
5. Create the commit after approval

## Step 5: SPEC.md Check

Ask the user with AskUserQuestion:
"This session introduced changes. Should SPEC.md be updated to reflect new patterns or conventions?"
- If yes: run `/spec` to update
- If no: done

## Notes
- Be thorough but practical in review - flag real issues, not style nitpicks
- If the project has a linter/formatter, run it during review
- Focus on correctness and completeness over perfection
- Keep report descriptions concise but informative
