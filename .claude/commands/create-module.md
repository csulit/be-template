---
argument-hint: <feature requirements> | <module context>
---

# Create Module Command

Orchestrates module creation by running specialized agents in phases for optimal coordination.

## Arguments

- `$ARGUMENTS` - Feature requirements and module context

## Format

```
/create-module <feature requirements> | <module context>
```

**Examples:**

- `/create-module Create a notifications module with CRUD endpoints | new module`
- `/create-module Add a soft-delete endpoint for documents | existing module: documents`

## Instructions

### Step 0: Validate Input

Check if `$ARGUMENTS` is empty, missing the `|` separator, or incomplete.

**If arguments are missing or malformed**, do NOT proceed. Instead, ask the user to provide input using this prompt:

```
To create a module, please provide:

/create-module <feature requirements> | <module context>

Examples:
  /create-module Create a notifications module with CRUD endpoints | new module
  /create-module Add a soft-delete endpoint for documents | existing module: documents

Format:
  - Before the "|": Describe the feature, endpoints, and business logic needed
  - After the "|": Either "new module" or "existing module: <name>"
```

**If only the module context is missing** (no `|` found), ask: "Is this a new module or extending an existing one? Please re-run with the format: `/create-module <requirements> | new module` or `/create-module <requirements> | existing module: <name>`"

**If arguments are valid**, parse by splitting on `|`:

1. **Feature requirements** (before `|`) - What needs to be built
2. **Module context** (after `|`) - Either "new module" or "existing module: <name>"

### Step 1: Analyze Requirements

Before spawning agents, analyze the requirements to understand:
- What endpoints are needed (GET, POST, PUT, PATCH, DELETE)
- What data structures are involved
- What business logic is required
- What validations are needed
- Whether authentication/authorization is required

### Step 2: Generate Naming Contract

**CRITICAL:** Generate this naming contract before spawning any agents. Each subagent has its own isolated context window and cannot see what sibling agents create. This contract ensures all agents produce compatible, interoperable code.

For a feature named `<feature>` (kebab-case), generate:

```
=== NAMING CONTRACT FOR <feature> MODULE ===

Module Info:
- Feature name (kebab-case): <feature>
- Class name (PascalCase): <Feature>
- Base API path: /api/<feature>

Prisma Model (if new DB entity needed):
- Model file:  prisma/models/<feature>.prisma
- Model name:  <Feature> (PascalCase)
- Table name:  <features> (snake_case plural via @@map)

File Paths:
- Route:      src/modules/<feature>/<feature>.route.ts
- Controller: src/modules/<feature>/<feature>.controller.ts
- Service:    src/modules/<feature>/<feature>.service.ts
- DTO:        src/modules/<feature>/<feature>.dto.ts
- Validator:  src/modules/<feature>/<feature>.validator.ts
- Unit Test:  tests/unit/modules/<feature>/<feature>.service.test.ts
- Int Test:   tests/integration/routes/<feature>.test.ts

Prisma Model (prisma-model-developer MUST use these exact names):
- File path:   prisma/models/<feature>.prisma
- Model name:  <Feature> (PascalCase)
- Table name:  <features> (snake_case plural via @@map)

Validator Exports (validator-developer MUST use these exact names):
- Create<Feature>BodySchema    - POST request body
- Update<Feature>BodySchema    - PUT/PATCH request body
- <Feature>ParamsSchema        - URL params (id, etc.)
- List<Feature>QuerySchema     - GET list query params

DTO Exports (dto-developer MUST use these exact names):
- <Feature>ResponseSchema      - Single item response
- <Feature>ListResponseSchema  - List response with pagination
- to<Feature>ResponseDto()     - Transform DB record to response
- to<Feature>ListResponseDto() - Transform list with pagination

Service Exports (api-developer MUST use these exact names):
- <Feature>Service             - Service class name
- <feature>Service             - Exported instance

Route Exports:
- <feature>Routes              - Hono app export for registration
```

### Step 2.5: Spawn Prisma Model Agent (Phase 0 - Conditional)

**Only if the feature requires a NEW database entity.** Skip this step if:
- The module uses existing models (e.g., User, Document)
- The module is a utility/aggregation endpoint with no persistence

Use the Task tool to spawn the `prisma-model-developer` agent:

| Agent | Purpose |
|-------|---------|
| prisma-model-developer | Creates Prisma model file in `prisma/models/` |

**Include in the agent's prompt:**
1. The Prisma model section from the naming contract
2. The feature requirements (what fields/relations are needed)
3. Any relation context (which existing models it relates to)

**Wait for Phase 0 to complete** before proceeding. The Prisma model must exist before Phase 1 agents can reference it in DTOs.

After the agent completes, run:
```bash
pnpm db:generate
```

This regenerates the Prisma client so Phase 1/2 agents can use the new model types.

### Step 3: Spawn Schema Agents + File Explorer (Phase 1)

Use the Task tool to spawn **3 agents in parallel** in a SINGLE message:

| Agent | Purpose |
|-------|---------|
| dto-developer | Creates response DTOs and transformation functions |
| validator-developer | Creates request body, params, and query validators |
| file-explorer | Gathers existing patterns, examples, and context for Phase 2 |

**Include in schema agents' prompts:**
1. The full naming contract from Step 2
2. The parsed feature requirements
3. The module context (new or existing)

**Include in file-explorer's prompt:**
```
Gather context for Phase 2 implementation agents. Find:

1. **Existing module examples** - Read 1-2 complete module implementations to use as reference
2. **Route patterns** - How routes are defined with createRoute() and OpenAPI
3. **Controller patterns** - How handlers use RouteHandler<> typing
4. **Service patterns** - How services use Prisma, transactions, and error factories
5. **Test patterns** - How unit and integration tests are structured

Focus on finding the BEST examples, not all examples. Keep output concise.
Return a structured context document that Phase 2 agents can use.
```

### Step 4: Wait for Phase 1

Use TaskOutput to wait for ALL THREE agents to complete.

**Why wait?** Subagents have isolated context windows. The api-developer and test-developer need:
- The actual schema files to exist (from dto-developer and validator-developer)
- Existing pattern context (from file-explorer)

### Step 5: Spawn Implementation Agents (Phase 2)

After Phase 1 completes, spawn **2 implementation agents in parallel** in a SINGLE message:

| Agent | Purpose |
|-------|---------|
| api-developer | Creates routes, controllers, and services |
| test-developer | Creates unit and integration tests |

**Include in each agent's prompt:**
1. The full naming contract from Step 2
2. Confirmation that schema files now exist with the contracted exports
3. The parsed feature requirements
4. The module context (new or existing)
5. **The context document from file-explorer** (paste the relevant patterns found)

### Step 6: Wait for Phase 2

Use TaskOutput to wait for BOTH implementation agents to complete.

### Step 7: Code Simplification (Phase 3)

After all implementation code is written, spawn the `code-simplifier` agent to refine all created files.

Use the Task tool to spawn the `code-simplifier` agent:

| Agent | Purpose |
|-------|---------|
| code-simplifier | Refines all module files for clarity, consistency, and maintainability |

**Include in the agent's prompt:**
1. The list of all files created by Phase 1 and Phase 2 agents (routes, controllers, services, DTOs, validators, tests)
2. Instructions to read each file and apply simplification refinements
3. Reminder to preserve all functionality - only improve how the code reads, not what it does
4. The project standards from CLAUDE.md (import style, error handling patterns, naming conventions)

**Wait for Phase 3 to complete** before proceeding to verification. The simplified code must be finalized before running typecheck, lint, and tests.

### Step 8: Integration Verification

After code simplification completes:

1. Run `pnpm typecheck` - Verify TypeScript compilation
2. Run `pnpm lint` - Check for linting errors (fix with `pnpm lint:fix` if needed)
3. Run `pnpm test:run -- <feature>` - Run feature-specific tests

### Step 9: Code Review

Spawn the `code-reviewer` agent to review all created files.

### Step 10: Route Registration

If this is a new module, remind to register routes in `app.ts`:
```typescript
import { <feature>Routes } from "./modules/<feature>/<feature>.route.js";

app.route("/api/<feature>", <feature>Routes);
```

## Output

After completion, provide a summary:

```markdown
## Module Creation Complete

### Naming Contract Used:
- Feature: `<feature>` / `<Feature>`
- Base path: `/api/<feature>`

### Files Created/Modified:
- [ ] prisma/models/<feature>.prisma (if new DB entity)
- [ ] src/modules/<feature>/<feature>.route.ts
- [ ] src/modules/<feature>/<feature>.controller.ts
- [ ] src/modules/<feature>/<feature>.service.ts
- [ ] src/modules/<feature>/<feature>.dto.ts
- [ ] src/modules/<feature>/<feature>.validator.ts
- [ ] tests/unit/modules/<feature>/<feature>.service.test.ts
- [ ] tests/integration/routes/<feature>.test.ts

### Phase Execution:
- Phase 0 (Prisma Model): prisma-model-developer ✅/⏭️ (skipped if using existing models)
- Phase 1 (Schemas + Context): dto-developer ✅, validator-developer ✅, file-explorer ✅
- Phase 2 (Implementation): api-developer ✅, test-developer ✅
- Phase 3 (Simplification): code-simplifier ✅
- Code Review: ✅

### Verification:
- Prisma Generate: ✅/❌ (if Phase 0 ran)
- TypeScript: ✅/❌
- Lint: ✅/❌
- Tests: ✅/❌

### Next Steps:
- Register routes in app.ts (if new module)
- Run `pnpm db:migrate` to apply schema changes (if new model created)
```

## Why Four Phases?

Each subagent runs in its **own isolated context window**. They receive only:
- Their agent markdown (system prompt)
- The prompt you pass via Task tool
- Basic environment info (working directory)

They do **NOT** inherit:
- The parent conversation's context
- Knowledge of what sibling agents are creating
- Existing file contents (unless they read them)

By splitting into four phases:
1. **Phase 0** creates the Prisma model (if needed), then runs `pnpm db:generate` to make types available
2. **Phase 1** creates schemas (DTOs + Validators) with contracted names, while file-explorer gathers existing patterns in parallel
3. **Phase 2** can import real schemas and use Prisma types because Phase 0/1 files now exist
4. **Phase 3** refines all generated code for clarity, consistency, and maintainability before verification

This eliminates:
- Prisma type errors (model types exist before services reference them)
- Import mismatches and naming conflicts between parallel agents
- Redundant file exploration by Phase 2 agents (file-explorer does it once)
- Context window waste from each agent re-reading the same patterns
- Inconsistent code style across files generated by different agents

## File Explorer Optimization

The `file-explorer` agent runs on `haiku` (lightweight, fast model) and gathers context that would otherwise be duplicated by api-developer and test-developer. Benefits:

- **Parallel execution** - Runs alongside schema creation, no extra wait time
- **Shared context** - Phase 2 agents receive pre-gathered patterns instead of each exploring independently
- **Reduced cost** - Uses cheaper model for read-only exploration
- **Faster Phase 2** - Implementation agents can start coding immediately with examples in hand

## Code Simplification Phase

The `code-simplifier` agent runs after all implementation is complete (Phase 3). It reads every file created by Phase 1 and Phase 2 agents and refines them for clarity, consistency, and maintainability. Benefits:

- **Cross-file consistency** - Since each Phase 1/2 agent runs in isolation, their code styles may diverge. The code-simplifier normalizes patterns across all files.
- **Quality gate before verification** - Simplification runs before typecheck, lint, and tests, so verification catches any issues introduced by the refinement pass.
- **Preserves functionality** - The agent strictly improves readability and structure without changing behavior.
- **Reduces review burden** - The code-reviewer (Step 9) sees already-refined code, allowing it to focus on architectural and security concerns rather than style issues.
