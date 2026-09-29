---
name: focused-code-edit
description: Make targeted code changes without reading the entire repository. Use when modifying an existing project, especially frontend/UI work.
---

# Focused Code Editing

## Core Rule

DO NOT read the entire repository.

Never recursively read every source file, every component, every page, or every configuration file.

Only inspect files that are directly relevant to the user's requested change.

## Workflow

### 1. Start with structure only

First inspect:

- package.json
- top-level directory structure
- relevant app/src directory structure

Do NOT open every file.

### 2. Identify the smallest relevant file set

Before reading files, determine which files are likely involved.

For a frontend UI request, prioritize:

- relevant page
- relevant layout
- relevant components
- relevant styles
- relevant hooks
- relevant API/client file if required

Do NOT inspect unrelated:

- backend files
- database files
- blockchain contracts
- deployment configuration
- unrelated components
- tests
- documentation

unless the requested change requires them.

### 3. Read incrementally

Read one relevant file at a time.

After reading each file, decide whether another file is actually required.

Do not proactively open additional files just because they exist.

### 4. Preserve existing architecture

Before changing code, understand only the minimum necessary:

- framework
- routing
- component structure
- styling system
- state management
- API usage
- wallet/blockchain integration

Do not redesign the architecture unless explicitly requested.

### 5. Protect unrelated functionality

Never modify:

- smart contracts
- blockchain transaction logic
- wallet connection logic
- backend APIs
- database schemas
- authentication
- environment variables

unless the user explicitly asks for those changes or the requested feature genuinely requires them.

### 6. For UI improvements

If the user asks to improve UI:

1. Find the relevant page.
2. Find only components used by that page.
3. Find the styling system.
4. Make the UI changes.
5. Run/build/test only the relevant application area.
6. Check for TypeScript/build errors.
7. Stop.

Do not perform a repository-wide redesign.

### 7. Before reading a new file

Ask internally:

"Is this file necessary to complete the requested task?"

If NO → do not read it.

If YES → read it.

## Important

Do not say that you inspected the whole repository unless you actually did.

Prefer:

"Based on the relevant files..."

rather than:

"I reviewed the entire codebase."

## Goal

Minimize unnecessary file reads while still producing correct changes.

Accuracy comes from targeted inspection, not repository-wide reading.
