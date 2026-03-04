---
name: review
description: Review session work before completing. Run before session complete.
allowed-tools: Read, Glob, Grep, Bash, WebSearch
---

Perform a thorough review of the current session's work before archiving.
This is a quality gate - find issues NOW while they can still be fixed.

## Steps

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
   - Are new features covered by tests?
   - Run existing tests: `npm test` (or project-specific command)
   - If tests fail, flag them as issues

5. **Plan Completion Audit**
   - Check each Implementation Item in plan.md
   - Check each Acceptance Criteria
   - Flag any unchecked items with reasons

6. **Present Findings**
   Use AskUserQuestion to present the review results:

   **If issues found:**
   ```
   Review found {N} issue(s):
   1. {issue description}
   2. {issue description}

   Options:
   - Fix issues now (recommended)
   - Proceed to complete anyway
   - Cancel and continue working
   ```

   **If no issues:**
   ```
   Review passed. No issues found.
   - {N} files changed
   - {N}/{M} plan items completed
   - Tests: passing/failing/none

   Ready to run `session complete`.
   ```

## Notes
- Be thorough but practical - flag real issues, not style nitpicks
- If the project has a linter/formatter, run it
- Focus on correctness and completeness over perfection
