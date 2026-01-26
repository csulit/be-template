# Create Provider Command

Orchestrates provider creation by running specialized agents in phases, ensuring consistency with existing provider patterns.

## Arguments

- `$ARGUMENTS` - Provider requirements and production service context

## Format

```
/create-provider <provider requirements> | <production service>
```

**Examples:**

- `/create-provider Create a push notification provider with send and sendBulk methods | Firebase Cloud Messaging`
- `/create-provider Create a payment provider with charge, refund, and getTransaction methods | Stripe`
- `/create-provider Create a cache provider with get, set, delete, and flush methods | Redis`

## Instructions

Parse the arguments by splitting on `|`:

1. **Provider requirements** (before `|`) - What the provider does, what methods it needs
2. **Production service** (after `|`) - The production SDK/service to stub (e.g., Firebase, Stripe, Redis)

### Step 1: Analyze Requirements

Before spawning agents, analyze the requirements to understand:
- What methods the provider interface needs
- What options/parameters each method requires
- What return types each method should have
- Whether the provider is stateless (like email/SMS) or stateful (like IMAP with connections)
- What environment variables control provider selection
- What the development/console implementation should do (log, return mocks, etc.)

### Step 2: Generate Naming Contract

**CRITICAL:** Generate this naming contract before spawning any agents. Each subagent has its own isolated context window and cannot see what sibling agents create. This contract ensures all agents produce compatible code.

For a provider named `<provider>` (kebab-case), generate:

```
=== NAMING CONTRACT FOR <provider> PROVIDER ===

Provider Info:
- Provider name (kebab-case): <provider>
- Provider name (PascalCase): <Provider>
- File path: src/providers/<provider>.provider.ts
- Unit test: tests/unit/providers/<provider>.provider.test.ts

Options Interfaces:
- <Provider>Options / Send<Provider>Options  - Method parameter types
  (List each options interface with its fields)

Provider Interface:
- <Provider>Provider  - Main interface with method signatures:
  (List each method: name, params, return type)

Implementation Classes:
- Console<Provider>Provider / Local<Provider>Provider  - Development implementation
- <ProductionName><Provider>Provider                   - Production stub (e.g., Stripe, Firebase, Redis)

Exported Instance:
- <provider>Provider  - camelCase singleton export

Environment Selection:
- env.<ENV_VAR_1> && env.<ENV_VAR_2>  - When truthy, use production provider
- Otherwise, use development/console provider

Import Style:
- import { env } from "../env.js";
```

### Step 3: Spawn File Explorer (Phase 1)

Use the Task tool to spawn the `file-explorer` agent (on `haiku` for speed):

| Agent | Purpose |
|-------|---------|
| file-explorer | Gathers existing provider patterns and examples |

**Include in file-explorer's prompt:**
```
Gather context for provider implementation. Find and read:

1. **Existing provider examples** - Read ALL provider files in src/providers/ to understand the exact patterns:
   - src/providers/email.provider.ts
   - src/providers/sms.provider.ts
   - src/providers/storage.provider.ts
2. **Provider structure** - How interfaces, implementations, and exports are organized
3. **Environment-based selection** - How providers switch between dev and production
4. **Console/dev patterns** - How development implementations log or mock behavior
5. **Production stub patterns** - How stubs include TODO comments with SDK examples
6. **Test patterns** - Check tests/unit/ for any existing provider test patterns

Return a structured context document with the exact code patterns found.
Focus on capturing the EXACT style, not just the concepts.
```

### Step 4: Wait for Phase 1

Use TaskOutput to wait for the file-explorer to complete.

**Why wait?** The provider implementation agent needs the exact patterns from existing providers to maintain consistency.

### Step 5: Spawn Provider Implementation Agent (Phase 2)

After Phase 1 completes, spawn the `general-purpose` agent to create the provider file:

| Agent | Purpose |
|-------|---------|
| general-purpose | Creates the provider file following established patterns |

**Include in the agent's prompt:**
1. The full naming contract from Step 2
2. The parsed provider requirements (methods, options, return types)
3. The production service context (what SDK to stub)
4. **The context document from file-explorer** (paste the patterns found)
5. Explicit instructions to follow the established pattern:

```
Create the provider file at the path specified in the naming contract.
Follow these patterns EXACTLY as found in existing providers:

STRUCTURE (in this order):
1. Import: `import { env } from "../env.js";`
2. Options interface(s): Define parameter types for each method
3. Provider interface: Define the public contract with method signatures
4. Development class: Console/Local implementation that logs or returns mocks
   - Class comment: `/** Console/Local <provider> provider for development */`
   - Prefix unused params with underscore in production stub only
5. Production class: Stub implementation that throws "not implemented"
   - Class comment: `/** <ProductionService> <provider> provider stub */`
   - Include commented-out TODO with example SDK usage
   - All methods throw: `throw new Error("<ProductionService> <provider> provider not implemented");`
6. Export: Environment-based singleton selection
   ```typescript
   // Export provider based on environment
   export const <provider>Provider: <Provider>Provider =
     env.<ENV_VAR> && env.<ENV_VAR>
       ? new <Production><Provider>Provider()
       : new Console<Provider>Provider();
   ```

IMPORTANT:
- Do NOT add barrel exports or index files
- Do NOT modify any existing files
- Match the exact code style of existing providers (spacing, comments, etc.)
- Use `export interface` for all interfaces (they are consumed by other files)
```

### Step 6: Wait for Phase 2

Use TaskOutput to wait for the provider implementation agent to complete.

### Step 7: Spawn Test Agent (Phase 3)

After Phase 2 completes, spawn the `test-developer` agent to create unit tests:

| Agent | Purpose |
|-------|---------|
| test-developer | Creates unit tests for the provider |

**Include in the agent's prompt:**
1. The full naming contract from Step 2
2. The provider requirements (what methods to test)
3. Instructions to test the development/console implementation (not the production stub)
4. Test focus areas:
   - Each method of the development implementation works correctly
   - Console.log is called with expected output (spy on console.log)
   - Return values match expected types (mock URLs, mock data, etc.)
   - The exported singleton is an instance of the development class (when env vars are not set)
5. The context from file-explorer (test patterns if any were found)

### Step 8: Wait for Phase 3

Use TaskOutput to wait for the test agent to complete.

### Step 9: Code Simplification (Phase 4)

After all files are created, spawn the `code-simplifier` agent to refine all created files.

| Agent | Purpose |
|-------|---------|
| code-simplifier | Refines provider and test files for clarity and consistency |

**Include in the agent's prompt:**
1. The list of files created (provider file + test file)
2. Instructions to read each file and apply simplification refinements
3. Reminder to preserve all functionality - only improve readability
4. Reference to existing provider files for style consistency:
   - `src/providers/email.provider.ts`
   - `src/providers/sms.provider.ts`
   - `src/providers/storage.provider.ts`

**Wait for Phase 4 to complete** before proceeding to verification.

### Step 10: Integration Verification

After code simplification completes:

1. Run `pnpm typecheck` - Verify TypeScript compilation
2. Run `pnpm lint` - Check for linting errors (fix with `pnpm lint:fix` if needed)
3. Run `pnpm test:run -- <provider>` - Run provider-specific tests

### Step 11: Code Review

Spawn the `code-reviewer` agent to review all created files.

## Output

After completion, provide a summary:

```markdown
## Provider Creation Complete

### Naming Contract Used:
- Provider: `<provider>` / `<Provider>`
- Production service: `<ProductionService>`

### Files Created:
- [ ] src/providers/<provider>.provider.ts
- [ ] tests/unit/providers/<provider>.provider.test.ts

### Phase Execution:
- Phase 1 (Context Gathering): file-explorer ✅
- Phase 2 (Implementation): general-purpose ✅
- Phase 3 (Tests): test-developer ✅
- Phase 4 (Simplification): code-simplifier ✅
- Code Review: ✅

### Verification:
- TypeScript: ✅/❌
- Lint: ✅/❌
- Tests: ✅/❌

### Provider Structure:
- Interface: `<Provider>Provider`
- Dev implementation: `Console<Provider>Provider` / `Local<Provider>Provider`
- Production stub: `<ProductionService><Provider>Provider`
- Exported as: `<provider>Provider`
- Selection: `env.<ENV_VAR>` based

### Next Steps:
- Implement the production provider when SDK credentials are available
- Add environment variables to `.env.example` if needed
- Import and use via: `import { <provider>Provider } from "@/providers/<provider>.provider.js";`
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
1. **Phase 1** gathers existing provider patterns so the implementation matches the codebase style
2. **Phase 2** creates the provider file using gathered patterns and the naming contract
3. **Phase 3** creates tests that import from the now-existing provider file
4. **Phase 4** refines all code for consistency before verification

This eliminates:
- Style drift from existing providers
- Import errors in tests (provider file exists before tests are written)
- Inconsistent code across generated files

## Provider Pattern Reference

All providers in this codebase follow the **Strategy Pattern** with environment-based selection:

```
┌─────────────────────┐
│  Options Interface   │  ← Parameter types for methods
├─────────────────────┤
│  Provider Interface  │  ← Public contract (method signatures)
├─────────────────────┤
│  Dev Implementation  │  ← Console logging / mock returns
├─────────────────────┤
│  Prod Implementation │  ← Stub with TODO + throws errors
├─────────────────────┤
│  Singleton Export    │  ← env-based selection
└─────────────────────┘
```

Key characteristics:
- **Single file** per provider: `src/providers/<name>.provider.ts`
- **Interface-first**: All implementations satisfy the same interface
- **Dev-friendly**: Console/Local implementations work without external services
- **Stub production**: Production classes throw errors with TODOs for real implementation
- **Environment toggle**: `env.SOME_VAR` determines which class is instantiated
- **No barrel exports**: Each provider file is imported directly, no index.ts
