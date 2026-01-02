# Create Module Command

Orchestrates module creation by running specialized agents in parallel.

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

### Step 2: Spawn Agents in Parallel

Use the Task tool to spawn 4 specialized agents simultaneously in a SINGLE message:

```
Agent 1: api-developer
Agent 2: dto-developer
Agent 3: validator-developer
Agent 4: test-developer
```

**IMPORTANT:** All 4 agents MUST be spawned in parallel in a single message with multiple Task tool calls.

Provide each agent with:
- The parsed feature requirements
- The module context (new or existing)
- Any relevant existing code patterns to follow

### Step 3: Wait for Completion

Use TaskOutput to wait for all agents to complete.

### Step 4: Integration Verification

After all agents complete:

1. Run `pnpm typecheck` - Verify TypeScript compilation
2. Run `pnpm lint` - Check for linting errors (fix with `pnpm lint:fix` if needed)
3. Run `pnpm test:run -- <feature>` - Run feature-specific tests

### Step 5: Code Review

Spawn the `code-reviewer` agent to review all created files.

### Step 6: Route Registration

If this is a new module, remind to register routes in `app.ts`:
```typescript
app.route("/api/<feature>", featureRoutes);
```

## Output

After completion, provide a summary:

```markdown
## Module Creation Complete

### Files Created/Modified:
- [ ] src/modules/<feature>/<feature>.route.ts
- [ ] src/modules/<feature>/<feature>.controller.ts
- [ ] src/modules/<feature>/<feature>.service.ts
- [ ] src/modules/<feature>/<feature>.dto.ts
- [ ] src/modules/<feature>/<feature>.validator.ts
- [ ] tests/unit/modules/<feature>/<feature>.service.test.ts
- [ ] tests/integration/routes/<feature>.test.ts

### Verification:
- TypeScript: ✅/❌
- Lint: ✅/❌
- Tests: ✅/❌

### Next Steps:
- Register routes in app.ts (if new module)
- Update Prisma schema if new models needed
- Run `pnpm db:generate` after schema changes
```
