# Push Command

Create a branch, run checks, and push changes with flexible options.

## Arguments

- `$ARGUMENTS` - Branch name and optional flags

## Format

```
/push <branch-name> [options]
```

**Branch Prefixes:**

| Prefix | Resulting Branch | Example |
|--------|------------------|---------|
| `feat:name` | `feature/name` | `/push feat:user-auth` → `feature/user-auth` |
| `fix:name` | `hotfix/name` | `/push fix:login-bug` → `hotfix/login-bug` |
| `bug:name` | `bugfix/name` | `/push bug:null-check` → `bugfix/null-check` |
| `chore:name` | `chore/name` | `/push chore:deps-update` → `chore/deps-update` |
| `docs:name` | `docs/name` | `/push docs:api-readme` → `docs/api-readme` |
| `refactor:name` | `refactor/name` | `/push refactor:auth-service` → `refactor/auth-service` |
| (no prefix) | (as-is) | `/push my-branch` → `my-branch` |

**Options:**

| Flag | Description |
|------|-------------|
| `--base=<branch>` | Base branch to branch from (default: current branch) |
| `--skip-tests` | Skip running tests (use cautiously) |
| `--skip-lint` | Skip linting (use cautiously) |
| `--amend` | Amend the last commit instead of creating a new one |
| `--no-verify` | Skip all checks (lint, format, typecheck, tests) |
| `--pr` | Create a pull request after pushing |
| `--draft` | Create PR as draft (requires `--pr`) |

**Examples:**

```bash
# Feature branch from current branch
/push feat:notifications

# Hotfix from main
/push fix:critical-bug --base=main

# Quick push without tests (for WIP)
/push feat:wip-feature --skip-tests

# Push and create PR
/push feat:user-profiles --pr

# Amend last commit with new changes
/push --amend
```

## Instructions

### Step 0: Parse Arguments

Parse the arguments to extract:
1. **Branch name** - Apply prefix transformation if present
2. **Base branch** - From `--base=` flag or use current branch
3. **Skip flags** - `--skip-tests`, `--skip-lint`, `--no-verify`
4. **Amend flag** - `--amend` for amending last commit
5. **PR flags** - `--pr` and `--draft`

**Branch prefix mapping:**
```
feat:   → feature/
fix:    → hotfix/
bug:    → bugfix/
chore:  → chore/
docs:   → docs/
refactor: → refactor/
```

### Step 1: Prepare Branch

**If `--amend` is NOT set:**

1. Determine base branch:
   - If `--base=<branch>` provided → use that branch
   - Otherwise → stay on current branch
2. If base branch specified and different from current:
   - Run `git fetch origin <base-branch>`
   - Run `git checkout <base-branch>`
   - Run `git pull --rebase origin <base-branch>`
3. Create and switch to the new branch: `git checkout -b <branch-name>`

**If `--amend` IS set:**

1. Stay on current branch
2. Verify there's a commit to amend: `git log -1`
3. Skip branch creation

### Step 2: Run Checks

**If `--no-verify` is set → skip all checks and go to Step 3**

Otherwise, run checks in order:

#### 2a. Lint (unless `--skip-lint`)

1. Run `pnpm lint`
2. If it fails, attempt to fix with `pnpm lint:fix`
3. If still failing, stop and report the lint errors

#### 2b. Format

1. Run `pnpm format`
2. If it fails, stop and report the format errors

#### 2c. Typecheck

1. Run `pnpm typecheck`
2. If this fails, stop immediately and report all TypeScript errors
3. Do NOT proceed to commit or push if typecheck fails

#### 2d. Tests (unless `--skip-tests`)

1. Run `pnpm test:run`
2. If tests fail, stop and report the failing tests
3. Do NOT proceed to commit or push if tests fail

### Step 3: Commit and Push

#### Check for changes

1. Run `git status --porcelain`
2. If no changes and not `--amend`, report "No changes to commit" and stop

#### Stage changes

1. Run `git add .`

#### Commit

**If `--amend`:**
1. Run `git commit --amend --no-edit` (keep existing message)
2. Or if there are new staged changes, prompt for updated message

**If NOT `--amend`:**
1. Analyze staged changes with `git diff --cached`
2. Generate a descriptive commit message based on the changes
3. Run `git commit -m "<message>"`

#### Push

**If `--amend`:**
1. Run `git push --force-with-lease origin <current-branch>`

**If NOT `--amend`:**
1. Run `git push -u origin <branch-name>`

### Step 4: Create PR (if `--pr` flag)

If `--pr` flag is set:

1. Determine the target branch (the base branch used in Step 1, or `main`/`dev`)
2. Run:
   ```bash
   gh pr create --base <target-branch> --title "<PR title>" --body "<PR body>" [--draft]
   ```
3. Include `--draft` if `--draft` flag was provided
4. Report the PR URL

## Output

After completion, provide a summary:

```markdown
## Push Complete

### Branch: `<branch-name>`
- Base: `<base-branch>`
- Checks: lint ✅, format ✅, typecheck ✅, tests ✅ (or skipped)

### Commit: `<short-hash>`
- Message: <commit message summary>

### Remote:
- Pushed to: `origin/<branch-name>`
- PR: <PR URL if created> (or "Not created")

### Next Steps:
- Create PR: `gh pr create --base <target>`
- View changes: `git log --oneline -5`
```

## Error Handling

- If any git operation fails → stop and report the error with context
- If lint fails after fix attempt → stop and show specific lint errors
- If format fails → stop and show format errors
- If typecheck fails → stop and show all TypeScript errors, do not commit or push
- If tests fail → stop and show failing tests with output, do not commit or push
- If PR creation fails → report error but note that push was successful

## Safety Notes

- `--no-verify` and `--skip-*` flags should be used sparingly
- `--amend` uses `--force-with-lease` for safety (prevents overwriting others' work)
- Never use `--amend` on shared branches (main, dev) without team agreement
