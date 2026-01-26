---
argument-hint: <extension requirements> | <target module name>
---

# Extend Module Command

Orchestrates extending an existing module by running specialized agents in phases. Adds new endpoints, fields, or capabilities to a module that already exists.

## Arguments

- `$ARGUMENTS` - Extension requirements and target module

## Format

```
/extend-module <extension requirements> | <target module name>
```

**Examples:**

- `/extend-module Add soft-delete and restore endpoints | documents`
- `/extend-module Add a GET endpoint to list by category with filtering | reimbursement`
- `/extend-module Add bulk update endpoint and new "priority" field | documents`
- `/extend-module Add file upload endpoint with S3 integration | documents`

## Instructions

### Step 0: Validate Input

Check if `$ARGUMENTS` is empty, missing the `|` separator, or incomplete.

**If arguments are missing or malformed**, do NOT proceed. Instead, ask the user to provide input using this prompt:

```
To extend a module, please provide:

/extend-module <what to add or change> | <existing module name>

Examples:
  /extend-module Add soft-delete and restore endpoints | documents
  /extend-module Add GET endpoint to list by category with filtering | reimbursement
  /extend-module Add bulk update endpoint and new "priority" field | documents
  /extend-module Add file upload endpoint with S3 integration | documents

Format:
  - Before the "|": Describe the new endpoints, fields, or capabilities to add
  - After the "|": The existing module name in kebab-case (e.g., documents, incoming-email)
```

**If only the module name is missing** (no `|` found), ask: "Which existing module should I extend? Please re-run with the format: `/extend-module <requirements> | <module-name>`"

**If arguments are valid**, parse by splitting on `|`:

1. **Extension requirements** (before `|`) - What needs to be added or changed
2. **Target module** (after `|`) - The existing module name (kebab-case, trimmed)

### Step 1: Read Existing Module

**CRITICAL:** Before anything else, read ALL files in the target module to understand its current state. Use the Read tool to read each file:

```
src/modules/<module>/<module>.route.ts
src/modules/<module>/<module>.controller.ts
src/modules/<module>/<module>.service.ts
src/modules/<module>/<module>.dto.ts
src/modules/<module>/<module>.validator.ts
```

Also read:

- `prisma/models/<module>.prisma` (if it exists) for the current database schema
- `tests/unit/modules/<module>/<module>.service.test.ts` (if it exists)
- `tests/integration/routes/<module>.test.ts` (if it exists)

**Fail fast:** If the module directory doesn't exist, inform the user and suggest `/create-module` instead.

### Step 2: Analyze Extension Requirements

With the existing code in hand, determine what changes are needed:

- **New endpoints** - What HTTP methods and paths?
- **Schema changes** - New Prisma fields, relations, or models?
- **New validators** - Request body/params/query schemas for new endpoints?
- **New DTOs** - Response schemas for new endpoints?
- **New service methods** - Business logic for new endpoints?
- **New tests** - Unit and integration tests for new functionality?

Categorize the extension:

| Category                | Description                                   | Phases Needed                                          |
| ----------------------- | --------------------------------------------- | ------------------------------------------------------ |
| **Endpoints only**      | New routes using existing data structures     | Phase 1 (context) + Phase 2 (implementation)           |
| **Endpoints + schemas** | New routes with new request/response shapes   | Phase 1 (schemas + context) + Phase 2 (implementation) |
| **Schema changes**      | New DB fields/relations + endpoints + schemas | Phase 0 (Prisma) + Phase 1 + Phase 2                   |
| **Full extension**      | New DB entity + all of the above              | Phase 0 + Phase 1 + Phase 2                            |

### Step 3: Generate Extension Contract

**CRITICAL:** Generate this contract before spawning any agents. Each subagent has its own isolated context window and cannot see sibling agents' output or the parent conversation. This contract ensures all agents produce compatible code that integrates with the existing module.

```
=== EXTENSION CONTRACT FOR <module> MODULE ===

Existing Module Info:
- Feature name (kebab-case): <module>
- Class name (PascalCase): <Module>
- Base API path: /api/<module>

Existing Files (DO NOT recreate - MODIFY these):
- Route:      src/modules/<module>/<module>.route.ts
- Controller: src/modules/<module>/<module>.controller.ts
- Service:    src/modules/<module>/<module>.service.ts
- DTO:        src/modules/<module>/<module>.dto.ts
- Validator:  src/modules/<module>/<module>.validator.ts
- Unit Test:  tests/unit/modules/<module>/<module>.service.test.ts
- Int Test:   tests/integration/routes/<module>.test.ts

Existing Exports (already defined - DO NOT redefine):
[List the exports that already exist from reading the files in Step 1]

--- NEW ADDITIONS ---

Extension Summary:
[Describe what is being added in plain language]

New Prisma Fields/Relations (if any):
[List new fields being added to the existing model, or new related models]

New Validator Exports (validator-developer MUST use these exact names):
- <NewAction><Module>BodySchema     - e.g., BulkUpdate<Module>BodySchema
- <New><Module>QuerySchema          - e.g., <Module>ByCategoryQuerySchema

New DTO Exports (dto-developer MUST use these exact names):
- <New><Module>ResponseSchema       - e.g., <Module>SummaryResponseSchema
- to<New><Module>ResponseDto()      - e.g., to<Module>SummaryResponseDto()

New Service Methods (api-developer MUST use these exact names):
- <module>Service.<newMethod>()     - e.g., documentsService.softDelete()

New Route Definitions:
- <METHOD> /api/<module>/<path>     - e.g., DELETE /api/documents/:id/soft
- <METHOD> /api/<module>/<path>     - e.g., POST /api/documents/:id/restore

--- EXISTING CODE CONTEXT ---

[Paste the FULL content of each existing module file here so agents understand the current implementation. This is critical because agents have isolated contexts.]
```

### Step 4: Spawn Prisma Model Agent (Phase 0 - Conditional)

**Only if the extension requires database schema changes.** Skip if:

- Only adding new endpoints with existing data structures
- Only adding computed/derived endpoints (no new fields)

Use the Task tool to spawn the `prisma-model-developer` agent:

| Agent                  | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| prisma-model-developer | Modifies existing Prisma model or adds related models |

**Include in the agent's prompt:**

1. The Prisma model section from the extension contract
2. The FULL content of the existing `prisma/models/<module>.prisma` file
3. What fields/relations need to be added
4. Explicit instruction: "MODIFY the existing model file, do not create a new one" (unless adding a related model)

**Wait for Phase 0 to complete** before proceeding.

After the agent completes, run:

```bash
pnpm db:generate
```

### Step 5: Spawn Schema Agents + File Explorer (Phase 1)

Determine which agents are needed based on the extension category:

| Agent               | When to Spawn              | Purpose                                                  |
| ------------------- | -------------------------- | -------------------------------------------------------- |
| dto-developer       | New response shapes needed | Adds new DTOs to existing `<module>.dto.ts`              |
| validator-developer | New request schemas needed | Adds new validators to existing `<module>.validator.ts`  |
| file-explorer       | Always                     | Gathers existing patterns and module context for Phase 2 |

Spawn the needed agents **in parallel** in a SINGLE message using the Task tool.

**Include in schema agents' prompts:**

1. The full extension contract from Step 3
2. The FULL content of the existing DTO or validator file
3. Explicit instruction: "ADD to the existing file - do not recreate it. Keep all existing exports intact."
4. The specific new schemas to create

**Include in file-explorer's prompt:**

```
Gather context for Phase 2 implementation agents extending the <module> module. Find:

1. **Current module implementation** - Read ALL files in src/modules/<module>/ to understand existing patterns
2. **Route patterns** - How routes are defined with createRoute() and OpenAPI in this module
3. **Controller patterns** - How handlers are structured in this module
4. **Service patterns** - How services use Prisma, transactions, and error handling
5. **Test patterns** - How existing tests are structured for this module
6. **Similar extensions** - Look for patterns of endpoints similar to what we're adding

Focus on the TARGET MODULE's existing code. Return a structured context document.
```

Use `model: "haiku"` for the file-explorer agent.

### Step 6: Wait for Phase 1

Use TaskOutput to wait for ALL Phase 1 agents to complete.

### Step 7: Spawn Implementation Agents (Phase 2)

After Phase 1 completes, spawn **2 implementation agents in parallel** in a SINGLE message:

| Agent          | Purpose                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| api-developer  | Adds new routes, controller handlers, and service methods to existing files |
| test-developer | Adds new unit and integration tests to existing test files                  |

**Include in each agent's prompt:**

1. The full extension contract from Step 3
2. Confirmation that any new schema files/exports now exist
3. The context document from file-explorer
4. **Explicit instruction for extending (not creating):**

For api-developer:

```
You are EXTENDING an existing module, not creating a new one. The files already exist.

CRITICAL RULES:
- Read the existing route, controller, and service files FIRST
- ADD new routes, handlers, and methods to the existing files
- DO NOT remove, replace, or modify existing code
- DO NOT recreate files from scratch
- Keep all existing imports, exports, routes, handlers, and methods intact
- Follow the same patterns used in the existing code (naming, error handling, etc.)
- Add new imports at the top alongside existing imports
- Add new routes after existing route definitions
- Add new controller methods to the existing controller object
- Add new service methods to the existing service class
```

For test-developer:

```
You are EXTENDING tests for an existing module. Test files may or may not exist yet.

CRITICAL RULES:
- If test files exist, READ them first and ADD new test cases
- If test files don't exist, CREATE them following project test patterns
- DO NOT remove or modify existing test cases
- Keep all existing mocks, setup, and teardown intact
- Add new describe blocks for new functionality
- Follow the same test patterns used in existing tests
```

### Step 8: Wait for Phase 2

Use TaskOutput to wait for BOTH implementation agents to complete.

### Step 9: Code Simplification (Phase 3)

Spawn the `code-simplifier` agent to refine all modified files.

Use the Task tool to spawn the `code-simplifier` agent:

| Agent           | Purpose                                                                         |
| --------------- | ------------------------------------------------------------------------------- |
| code-simplifier | Refines all modified module files for clarity, consistency, and maintainability |

**Include in the agent's prompt:**

1. The list of all files modified by Phase 0, Phase 1, and Phase 2 agents
2. Instructions to read each file and apply simplification refinements
3. Reminder to preserve ALL functionality - both existing and newly added
4. Explicit instruction: "This is an extended module. Ensure new code is consistent with existing code style. Do not remove any existing functionality."
5. The project standards from CLAUDE.md (import style, error handling patterns, naming conventions)

**Wait for Phase 3 to complete** before proceeding to verification.

### Step 10: Integration Verification

After code simplification completes:

1. Run `pnpm typecheck` - Verify TypeScript compilation
2. Run `pnpm lint` - Check for linting errors (fix with `pnpm lint:fix` if needed)
3. Run `pnpm test:run -- <module>` - Run module-specific tests

### Step 11: Code Review

Spawn the `code-reviewer` agent to review all modified files. Include in the prompt that this is an extension of an existing module, and the reviewer should verify:

- New code is consistent with existing module patterns
- Existing functionality is preserved
- No imports or exports were accidentally removed
- New endpoints follow the same conventions as existing ones

### Step 12: Migration Reminder

If Phase 0 ran (schema changes), remind the user:

```
Database schema was modified. Run the following to apply changes:
pnpm db:migrate
```

## Output

After completion, provide a summary:

```markdown
## Module Extension Complete

### Target Module:

- Feature: `<module>` / `<Module>`
- Base path: `/api/<module>`

### Extension Summary:

[Brief description of what was added]

### Files Modified:

- [ ] prisma/models/<module>.prisma (if schema changes)
- [ ] src/modules/<module>/<module>.route.ts
- [ ] src/modules/<module>/<module>.controller.ts
- [ ] src/modules/<module>/<module>.service.ts
- [ ] src/modules/<module>/<module>.dto.ts (if new DTOs)
- [ ] src/modules/<module>/<module>.validator.ts (if new validators)
- [ ] tests/unit/modules/<module>/<module>.service.test.ts
- [ ] tests/integration/routes/<module>.test.ts

### New Endpoints Added:

- `METHOD /api/<module>/<path>` - Description

### Phase Execution:

- Phase 0 (Prisma Model): prisma-model-developer ✅/⏭️ (skipped if no schema changes)
- Phase 1 (Schemas + Context): dto-developer ✅/⏭️, validator-developer ✅/⏭️, file-explorer ✅
- Phase 2 (Implementation): api-developer ✅, test-developer ✅
- Phase 3 (Simplification): code-simplifier ✅
- Code Review: ✅

### Verification:

- Prisma Generate: ✅/❌ (if Phase 0 ran)
- TypeScript: ✅/❌
- Lint: ✅/❌
- Tests: ✅/❌

### Next Steps:

- Run `pnpm db:migrate` to apply schema changes (if model was modified)
- Test new endpoints manually via Swagger UI at /docs
```

## Why This Differs from Create Module

| Aspect                 | `/create-module`               | `/extend-module`                                |
| ---------------------- | ------------------------------ | ----------------------------------------------- |
| **Starting point**     | Empty module directory         | Existing module with code                       |
| **File operations**    | Creates all files from scratch | Modifies existing files                         |
| **Agent instructions** | "Create this file"             | "Read existing file, add to it"                 |
| **Naming contract**    | Defines all names              | Lists existing names + defines new additions    |
| **Risk**               | Low (new files)                | Medium (must preserve existing code)            |
| **Context needed**     | Minimal                        | Full existing module code in every agent prompt |

### Key Safety Mechanism

The extension contract includes the **full content of existing files** passed to every agent. This is critical because:

1. Agents have **isolated context windows** - they can't see the parent conversation
2. Without existing code, agents might **recreate files from scratch**, losing existing functionality
3. With existing code in the prompt, agents can **append to the correct locations**
4. The code-simplifier in Phase 3 catches any inconsistencies between old and new code

### Conditional Phase Spawning

Unlike `/create-module` which always runs all phases, `/extend-module` skips unnecessary work:

- **No schema changes?** Skip Phase 0 entirely
- **No new response shapes?** Skip dto-developer in Phase 1
- **No new request schemas?** Skip validator-developer in Phase 1
- **File-explorer always runs** - Phase 2 agents always need existing pattern context
