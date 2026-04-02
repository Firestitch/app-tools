## CRITICAL: Before ANY Code Changes or Analysis

You MUST follow this process before writing code, modifying code, OR analyzing the codebase:

1. **Identify topics**: Determine which areas your task touches (e.g., handler, model, API, signals, RxJS, database, schema, relationships)
2. **Read index**: Read `standards/index.json` to find the relevant standard files for those topics
3. **Read standards**: Read each relevant standard file (e.g., `standards/php/handler.md`)
4. **Apply standards**: Implement following the patterns in those files, OR use them to correctly interpret the codebase

Do NOT skip this process. Do NOT assume you know the standards without reading them.

### What "read standards" means (non-negotiable)

- Reading **only** `standards/index.json` does **not** count as having read the standards. The index is a map; you must read the **full** referenced `.md` files (at least those that match the topics you identified).
- Use the Read tool (or equivalent) on each relevant file **before** your first edit to application/framework code in that task. Prior conversations and training are not a substitute.
- **Typical topic → file mapping** (always confirm paths in `standards/index.json`):
  - Angular data / `*Data` services / API params → `standards/angular/data-services.md`
  - Angular components, method order, size → `standards/angular/code-structure.md`
  - Angular forms, filters, autocomplete → `standards/angular/forms.md`
  - RxJS usage in Angular → `standards/angular/rxjs.md`
  - PHP handlers, queries, filters → `standards/php/handler.md`
  - PHP API views, params, GET/POST → `standards/php/api.md`
- If you genuinely believe **no** standard applies (e.g., pure typo in a user-visible string), say that in one sentence and proceed—do not use that to skip standards on real feature or bugfix work.

### For the team (how to enforce this across tools)

This file (`CLAUDE.md`) is the **single source of truth** for project-level AI instructions. Depending on which tool you use, it may be loaded automatically or require additional setup:

- **Claude Code (CLI, VS Code extension, Desktop app):** `CLAUDE.md` is loaded automatically — no extra configuration needed.
- **Cursor:** Project rules live in `.cursorrules` or `.cursor/rules/`. These must be kept in sync with `CLAUDE.md` manually. If they drift, one tool will follow different rules than the other.

**To keep rules consistent across tools:**

1. Treat `CLAUDE.md` as the primary source. Write and update rules here first.
2. Copy or mirror the relevant rules into `.cursorrules` (or whichever file your tool requires). Do not maintain independent rules in tool-specific files.
3. If your tool has user-level settings (e.g., Cursor Settings > Rules for AI, or `~/.claude/CLAUDE.md`), use those only for personal preferences — not for project rules that the whole team should follow.

**What each layer does:**

| Layer | Scope | Where it lives | Who sees it |
|-------|-------|----------------|-------------|
| Project rules | This repo | `CLAUDE.md` (+ `.cursorrules` for Cursor) | Everyone on the team |
| User rules | All repos for one person | Tool-specific (see below) | Only that user |
| Memory | Conversation history for one person | `~/.claude/projects/*/memory/` (Claude Code only) | Only that user's Claude Code sessions |

**Enforcing rules across all your projects (not just this repo):**

If you want the "read full `.md` files before editing code" rule enforced on **every** project you work on, add it to your **user-level** settings:
- **Claude Code:** `~/.claude/CLAUDE.md`
- **Cursor:** Cursor Settings > Rules for AI

This way the rule follows you regardless of whether a specific repo's `CLAUDE.md` or `.cursorrules` includes it.

**There is no automated sync between tools.** If someone updates `CLAUDE.md`, Cursor users won't see the change until `.cursorrules` is also updated. Consider keeping `.cursorrules` minimal with a note pointing to `CLAUDE.md` as the canonical version.

## Understanding the Codebase (Database, Schema, Relationships)

When asked to analyze, describe, or map the database structure, schema, entities, relationships, or architecture:

1. **FIRST** read `standards/php/architecture.md` — this explains how to interpret the framework's code
2. Follow its instructions to find tables (DBO classes), columns (Column definitions), relationships (Handler mapChild/mapChildren), and providers
3. Do NOT try to reconstruct the schema from SQL files or upgrade scripts alone — DBO classes are the source of truth for current schema

This framework uses a specific code structure (DBO/DBQ/Model/Handler layers) that is NOT obvious without reading the architecture standard first.

## Adding to Standards

When asked to "add to standards", "add this as a standard", or similar:
1. First read `standards/META.md` for rules on organizing and formatting
2. Follow the META.md rules exactly when adding the new standard
3. Update `standards/index.json` if adding a new topic

## Quick Reference

- Standards location: `standards/`
- Topic index: `standards/index.json`
- Meta-rules: `standards/META.md`
- Framework architecture: `standards/php/architecture.md`
- PHP standards: `standards/php/*.md`
- Angular standards: `standards/angular/*.md`
