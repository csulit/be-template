---
argument-hint: <bug description> | <affected area (optional)>
---

# Fix Bug Command

Orchestrates bug investigation and fixing by running specialized agents in phases for systematic debugging.

## Arguments

- `$ARGUMENTS` - Bug description and optionally the affected area/module

## Format

```
/fix-bug <bug description> | <affected area>
```

**Examples:**

- `/fix-bug Users can't login after password reset | auth module`
- `/fix-bug GET /api/documents returns 500 when filtering by date | documents`
- `/fix-bug Pagination returns duplicate items on page 2 | reimbursement service`
- `/fix-bug TypeScript error in build: Property 'x' does not exist | unknown`

## Instructions

### Step 0: Validate Input

Check if `$ARGUMENTS` is empty or missing context.

**If arguments are missing**, do NOT proceed. Instead, ask the user to provide input using this prompt:

```
To fix a bug, please provide:

/fix-bug <bug description> | <affected area>

Examples:
  /fix-bug Users can't login after password reset | auth module
  /fix-bug GET /api/documents returns 500 when filtering by date | documents
  /fix-bug Pagination returns duplicate items on page 2 | reimbursement service
  /fix-bug TypeScript error in build: Property 'x' does not exist | unknown

Format:
  - Before the "|": Describe the bug, error message, or unexpected behavior
  - After the "|": The module, file, or area affected (use "unknown" if unsure)
```

**If arguments are valid**, parse by splitting on `|`:

1. **Bug description** (before `|`) - What's broken, error messages, unexpected behavior
2. **Affected area** (after `|`) - Module name, file path, or "unknown"

### Step 1: Gather Initial Context

Before investigating, collect relevant information:

1. **If affected area is known** (not "unknown"):
   - Read all files in the affected module: `src/modules/<module>/`
   - Read related test files: `tests/unit/modules/<module>/` and `tests/integration/routes/<module>.test.ts`
   - Read Prisma model if applicable: `prisma/models/<module>.prisma`

2. **If affected area is "unknown"**:
   - Use the Explore agent to search for keywords from the bug description
   - Look for error messages, function names, or API paths mentioned

3. **Check recent changes**:
   - Run `git log --oneline -20` to see recent commits
   - Run `git diff HEAD~5` if the bug might be from recent changes

### Step 2: Spawn Investigation Agent (Phase 1)

Use the Task tool to spawn the `file-explorer` agent for deep investigation:

| Agent         | Purpose                                                    |
| ------------- | ---------------------------------------------------------- |
| file-explorer | Investigates the bug by tracing code paths and finding root cause |

**Include in the agent's prompt:**

```
BUG INVESTIGATION TASK

Bug Description:
<paste bug description>

Affected Area:
<paste affected area or "unknown">

Initial Context:
<paste any files already read or relevant information>

Your task:
1. **Trace the code path** - Follow the execution flow related to the bug
2. **Identify the root cause** - Find WHERE the bug originates (not just where it manifests)
3. **Find related code** - Look for similar patterns that might have the same issue
4. **Check edge cases** - Look for missing null checks, boundary conditions, race conditions
5. **Review recent changes** - If available, check if recent commits introduced the bug

Return a structured report:

=== BUG INVESTIGATION REPORT ===

Root Cause:
[Explain what's causing the bug]

Location:
[File path and line numbers where the fix should be applied]

Evidence:
[Code snippets showing the problematic code]

Suggested Fix:
[High-level description of how to fix it]

Related Files:
[List all files that need to be modified]

Test Cases Needed:
[What tests should be added/modified to prevent regression]
```

**Wait for Phase 1 to complete** before proceeding.

### Step 3: Generate Fix Plan

Based on the investigation report, create a fix plan:

```
=== BUG FIX PLAN ===

Bug Summary:
[One-line description of the bug]

Root Cause:
[From investigation report]

Files to Modify:
- [ ] <file1> - <what change>
- [ ] <file2> - <what change>

Fix Strategy:
[Step-by-step approach to fix the bug]

Potential Side Effects:
[Any areas that might be affected by the fix]

Test Plan:
- [ ] Add/modify unit test for <scenario>
- [ ] Add/modify integration test for <scenario>
```

Present this plan to the user and **ask for confirmation** before proceeding.

### Step 4: Implement Fix (Phase 2)

After user confirmation, implement the fix directly (do NOT spawn agents for simple fixes).

**For simple fixes** (1-3 files, straightforward changes):
- Make the changes directly using Edit tool
- Follow existing code patterns in the affected files
- Add appropriate error handling if the bug was caused by missing checks

**For complex fixes** (multiple files, architectural changes), spawn agents in parallel:

| Agent          | When to Spawn                   | Purpose                              |
| -------------- | ------------------------------- | ------------------------------------ |
| api-developer  | Route/controller/service changes | Implements API-layer fixes           |
| test-developer | Always                          | Adds regression tests for the bug    |

**Include in each agent's prompt:**

1. The full bug investigation report from Phase 1
2. The approved fix plan from Step 3
3. The FULL content of files being modified
4. Explicit instruction: "This is a BUG FIX. Make minimal changes to fix the specific issue. Do not refactor or add unrelated improvements."

### Step 5: Add Regression Test

**CRITICAL:** Every bug fix MUST include a test that:
1. Would have FAILED before the fix
2. PASSES after the fix
3. Prevents the bug from recurring

If test-developer wasn't spawned in Phase 2, add the test directly:

```typescript
describe("<Feature> - Bug Fix: <brief description>", () => {
  it("should <expected behavior that was broken>", async () => {
    // Arrange: Set up the scenario that triggered the bug
    // Act: Perform the action that caused the bug
    // Assert: Verify the correct behavior
  });
});
```

### Step 6: Verification

Run verification commands:

1. `pnpm typecheck` - Verify TypeScript compilation
2. `pnpm lint` - Check for linting errors (fix with `pnpm lint:fix` if needed)
3. `pnpm test:run -- <affected-module>` - Run tests for the affected module
4. If the bug was in tests, run the full test suite: `pnpm test:run`

### Step 7: Code Review

Spawn the `code-reviewer` agent to review the fix:

| Agent         | Purpose                                    |
| ------------- | ------------------------------------------ |
| code-reviewer | Reviews the fix for correctness and safety |

**Include in the agent's prompt:**

```
BUG FIX REVIEW

Original Bug:
<bug description>

Root Cause:
<from investigation>

Files Modified:
<list of files changed>

Review Focus:
1. Does the fix address the ROOT CAUSE, not just symptoms?
2. Are there any edge cases not handled?
3. Could this fix introduce new bugs?
4. Is the regression test comprehensive enough?
5. Are there similar patterns elsewhere that might have the same bug?
```

## Output

After completion, provide a summary:

```markdown
## Bug Fix Complete

### Bug Summary:
[One-line description]

### Root Cause:
[What was causing the bug]

### Files Modified:
- [ ] `<file1>` - <change description>
- [ ] `<file2>` - <change description>

### Regression Test Added:
- [ ] `<test file>` - `<test case name>`

### Phase Execution:
- Phase 1 (Investigation): file-explorer ✅
- Phase 2 (Implementation): ✅ (direct fix / api-developer / test-developer)
- Code Review: ✅

### Verification:
- TypeScript: ✅/❌
- Lint: ✅/❌
- Tests: ✅/❌

### Recommended Follow-up:
- [ ] Monitor for similar issues in related modules
- [ ] Consider adding validation to prevent similar bugs
- [ ] Update documentation if behavior changed
```

## Bug Categories and Approaches

| Bug Type                  | Investigation Focus                          | Common Fixes                            |
| ------------------------- | -------------------------------------------- | --------------------------------------- |
| **500 Error**             | Error logs, try-catch blocks, null checks    | Add validation, null guards, error handling |
| **Wrong Data Returned**   | Query logic, transformations, DTOs           | Fix query conditions, mapping functions |
| **Authentication Issues** | Auth middleware, session handling, tokens    | Fix middleware order, token validation  |
| **Validation Failures**   | Zod schemas, request validators              | Update schema, add/fix validation rules |
| **Type Errors**           | TypeScript types, Prisma schema              | Fix type definitions, regenerate client |
| **Performance Issues**    | Database queries, N+1 problems, loops        | Add indexes, optimize queries, caching  |
| **Race Conditions**       | Async operations, transactions               | Add transactions, locks, proper awaits  |

## Principles

1. **Fix the root cause, not symptoms** - A 500 error caught and returned as 200 is not fixed
2. **Minimal changes** - Only modify what's necessary to fix the bug
3. **Always add tests** - No bug fix is complete without a regression test
4. **Check for patterns** - If a bug exists in one place, it might exist in similar code
5. **Don't refactor while fixing** - Fix first, refactor separately if needed
