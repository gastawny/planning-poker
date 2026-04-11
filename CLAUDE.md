# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# General Guidelines

- Always open `specs.md` before working.
- Always update **MVP Milestones** after you finish a milestone.
- Always update db schemas, update seeds.
- Always tick the corresponding milestone once it is complete.
  - Await confirmation from the user if it can be considered done or not

---

# Commands

All commands run from the **repo root** unless noted. Package manager is **Bun** — never use npm or yarn.

---

# Subagent System

Use subagents to delegate tasks to specialized agents.

## Agent Selection Guide

- **Pure Typescript**: `typescript-pro`
- **React**: `react-specialist`
- **UI/UX**: `ui-designer`
- **Security**: `security-engineer`
- **Complex Workflow**: `multi-agent-coordinator`
- **Code Review**: `code-reviewer`

## Invoking Subagents

Claude Code auto-selects agents based on context. You can also request explicitly:

```
Have the code-reviewer analyze my latest commits
Ask security-engineer to audit the auth middleware
```

---

# Code Conventions

## TypeScript

- Strict mode enabled
- Avoid `any`
- Prefer explicit types
- Prefer `satisfies` over `as` for constraining object shapes; avoid `as` type assertions unless there is no safer alternative.

## Naming

- Files: kebab-case
- Classes: PascalCase
- Functions/variables: camelCase

## Comments

- Do not use comments to explain the code, use code to explain the code.

## Environment Variables

- Each app/package reads `process.env` only in its own `src/env.ts`; all other files import from there
- Every app/package must have `.env.example` and `.env` in its own directory

---
