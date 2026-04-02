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

### For the human (how to enforce this in Cursor)

- Keep this file **and** `CLAUDE.md` in sync, or delete one source of truth—duplicate rules help nothing if they drift.
- Add the same "Critical / read full .md files" block to **Cursor Settings → Rules for AI** (user rules) if you want it on **every** project, not only this repo.
- There is no CI hook that proves an LLM "read" a file; clarity in rules + user rules is the practical lever.

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
