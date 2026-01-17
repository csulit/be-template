# Create Module Command

Orchestrates module creation by running specialized agents in two phases for optimal coordination.

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

Parse the arguments by splitting on `|`:

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

File Paths:
- Route:      src/modules/<feature>/<feature>.route.ts
- Controller: src/modules/<feature>/<feature>.controller.ts
- Service:    src/modules/<feature>/<feature>.service.ts
- DTO:        src/modules/<feature>/<feature>.dto.ts
- Validator:  src/modules/<feature>/<feature>.validator.ts
- Unit Test:  tests/unit/modules/<feature>/<feature>.service.test.ts
- Int Test:   tests/integration/routes/<feature>.test.ts

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

### Step 3: Spawn Schema Agents (Phase 1)

Use the Task tool to spawn **2 schema agents in parallel** in a SINGLE message:

| Agent | Purpose |
|-------|---------|
| dto-developer | Creates response DTOs and transformation functions |
| validator-developer | Creates request body, params, and query validators |

**Include in each agent's prompt:**
1. The full naming contract from Step 2
2. The parsed feature requirements
3. The module context (new or existing)

### Step 4: Wait for Phase 1

Use TaskOutput to wait for BOTH schema agents to complete.

**Why wait?** Subagents have isolated context windows. The api-developer and test-developer need the actual schema files to exist so they can import real exports instead of guessing names.

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

### Step 6: Wait for Phase 2

Use TaskOutput to wait for BOTH implementation agents to complete.

### Step 7: Integration Verification

After all agents complete:

1. Run `pnpm typecheck` - Verify TypeScript compilation
2. Run `pnpm lint` - Check for linting errors (fix with `pnpm lint:fix` if needed)
3. Run `pnpm test:run -- <feature>` - Run feature-specific tests

### Step 8: Code Review

Spawn the `code-reviewer` agent to review all created files.

### Step 9: Route Registration

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
- [ ] src/modules/<feature>/<feature>.route.ts
- [ ] src/modules/<feature>/<feature>.controller.ts
- [ ] src/modules/<feature>/<feature>.service.ts
- [ ] src/modules/<feature>/<feature>.dto.ts
- [ ] src/modules/<feature>/<feature>.validator.ts
- [ ] tests/unit/modules/<feature>/<feature>.service.test.ts
- [ ] tests/integration/routes/<feature>.test.ts

### Phase Execution:
- Phase 1 (Schemas): dto-developer ✅, validator-developer ✅
- Phase 2 (Implementation): api-developer ✅, test-developer ✅
- Code Review: ✅

### Verification:
- TypeScript: ✅/❌
- Lint: ✅/❌
- Tests: ✅/❌

### Next Steps:
- Register routes in app.ts (if new module)
- Update Prisma schema if new models needed
- Run `pnpm db:generate` after schema changes
```

## Why Two Phases?

Each subagent runs in its **own isolated context window**. They receive only:
- Their agent markdown (system prompt)
- The prompt you pass via Task tool
- Basic environment info (working directory)

They do **NOT** inherit:
- The parent conversation's context
- Knowledge of what sibling agents are creating
- Existing file contents (unless they read them)

By splitting into two phases:
1. **Phase 1** creates schemas (DTOs + Validators) with contracted names
2. **Phase 2** can import real schemas because the files now exist

This eliminates import mismatches and naming conflicts between parallel agents.
