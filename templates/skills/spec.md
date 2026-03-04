---
name: spec
description: Define or update project SPEC.md - engineering foundations and conventions.
allowed-tools: Read, Write, Edit, AskUserQuestion, Glob, Grep, WebSearch
---

Manage the project SPEC.md file - the single source of truth for project-level engineering decisions.

## If SPEC.md does not exist (Initial Setup)

### Phase 1: Project Analysis
1. Scan the codebase to understand current state:
   - `package.json` / `pyproject.toml` / build configs
   - Directory structure and module organization
   - Key source files and entry points
   - Existing tests, CI/CD, linting configs

### Phase 2: Requirements Gathering (HITL)
Use AskUserQuestion in **multiple rounds**. Do NOT skip or merge rounds.

**Important: "Auto-research" Option**
For EVERY round, always include this option in AskUserQuestion:
- "I'm not sure / Let AI research best practices" (or similar)

When the user selects this option:
1. Use WebSearch to find the **latest stable best practices** for the detected tech stack
2. Search for: "{framework/language} project structure best practices {year}"
3. Search for: "{framework/language} conventions recommended {year}"
4. Synthesize findings into concrete recommendations
5. Present the recommendations to the user for confirmation before applying

This is essential for users who are unfamiliar with the language/framework.

**Round 1 - Project Identity**:
- What is this project? Who uses it?
- What is the tech stack and why?
- What are the main features / responsibilities?
- (Option: "I'm not sure, research best practices for this stack")

**Round 2 - Architecture**:
- What is the module/directory structure philosophy? (by feature, by layer, etc.)
- What are the key abstractions and interfaces?
- How do modules communicate? (imports, events, APIs, etc.)
- What external dependencies are critical and why?
- (Option: "Research recommended architecture for this stack")

**Round 3 - Engineering Conventions**:
- Error handling strategy: where to catch, how to propagate, what to expose to users?
- Logging and observability approach?
- Testing strategy: what level (unit/integration/e2e), coverage expectations, test location?
- Naming conventions (files, functions, variables, branches)?
- Code style rules beyond linter (patterns to follow, patterns to avoid)?
- (Option: "Research standard conventions for this stack")

**Round 4 - Boundaries & Constraints**:
- Performance requirements or constraints?
- Security considerations?
- Compatibility requirements (browsers, Node versions, APIs)?
- What should NEVER be done in this project? (anti-patterns, forbidden approaches)
- (Option: "Research common pitfalls and constraints for this stack")

### Phase 3: Write SPEC.md
Write to the project root as `SPEC.md` using this structure:

```markdown
# {Project Name}

## Overview
{What this project is, who it's for, core value proposition. 2-3 sentences.}

## Tech Stack
| Category | Choice | Rationale |
|----------|--------|-----------|
| Runtime | ... | ... |
| Framework | ... | ... |
| ... | ... | ... |

## Architecture

### Directory Structure
{Module organization philosophy and actual structure}

### Key Abstractions
{Core interfaces, base classes, shared types - the backbone of the system}

### Module Boundaries
{How modules interact, dependency direction rules}

## Conventions

### Error Handling
{Strategy: where errors are caught, how they propagate, user-facing vs internal}

### Testing
{Strategy: test types, location, naming, coverage expectations}

### Naming
{Files, functions, variables, branches - with examples}

### Patterns
{Patterns to follow and patterns to explicitly avoid, with rationale}

## Constraints
{Performance, security, compatibility requirements. Things that must NEVER be done.}
```

### Phase 4: User Review
Present the complete SPEC.md for review. Use AskUserQuestion to confirm or request changes.

---

## If SPEC.md exists (Update)

1. Read current SPEC.md
2. Use AskUserQuestion to understand what triggered the update:
   - New architectural pattern introduced?
   - Convention changed?
   - New constraint discovered?
3. Update ONLY the relevant sections, preserving everything else
4. Show the diff and ask for confirmation before saving
