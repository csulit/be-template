# Push Command

Create a branch, run checks, and push changes with flexible options.

## Arguments

- `$ARGUMENTS` - Branch name and optional flags

## Format

```
/push [branch-name] [options]
```

**Branch name is optional!** If omitted, a branch name will be auto-generated based on your changes.

**Branch Prefixes (when manually specifying):**

| Prefix | Resulting Branch | Example |
|--------|------------------|---------|
| `feat:name` | `feature/name` | `/push feat:user-auth` → `feature/user-auth` |
| `fix:name` | `hotfix/name` | `/push fix:login-bug` → `hotfix/login-bug` |
| `bug:name` | `bugfix/name` | `/push bug:null-check` → `bugfix/null-check` |
| `chore:name` | `chore/name` | `/push chore:deps-update` → `chore/deps-update` |
| `docs:name` | `docs/name` | `/push docs:api-readme` → `docs/api-readme` |
| `refactor:name` | `refactor/name` | `/push refactor:auth-service` → `refactor/auth-service` |
| (no prefix) | (as-is) | `/push my-branch` → `my-branch` |

**Auto-generated Branch Names:**

When no branch name is provided, analyze the changes and generate a name:

| Change Type | Generated Branch | Example |
|-------------|------------------|---------|
| New module files | `feature/<module-name>` | New `src/modules/payments/*` → `feature/payments-module` |
| New feature files | `feature/<feature-name>` | New auth middleware → `feature/auth-middleware` |
| Bug fixes | `bugfix/<description>` | Fix in user service → `bugfix/user-service-fix` |
| Config/deps changes | `chore/<description>` | package.json updates → `chore/update-dependencies` |
| Documentation | `docs/<description>` | README changes → `docs/update-readme` |
| Test files only | `test/<description>` | New tests → `test/user-service-tests` |
| Refactoring | `refactor/<description>` | Code cleanup → `refactor/user-service` |

**Options:**

| Flag | Description |
|------|-------------|
| `--base=<branch>` | Base branch to branch from (default: `dev`) |
| `--skip-tests` | Skip running tests (use cautiously) |
| `--skip-lint` | Skip linting (use cautiously) |
| `--amend` | Amend the last commit instead of creating a new one |
| `--no-verify` | Skip all checks (lint, format, typecheck, tests) |
| `--no-pr` | Skip creating a pull request (PR is created by default) |
| `--draft` | Create PR as draft |

**Examples:**

```bash
# Auto-generate branch name from changes (fastest workflow!)
/push

# Auto-generate with draft PR
/push --draft

# Manually specify branch name
/push feat:notifications

# Hotfix from main (override base branch)
/push fix:critical-bug --base=main

# Quick push without tests (for WIP)
/push feat:wip-feature --skip-tests

# Push without creating a PR
/push --no-pr

# Create PR as draft
/push --draft

# Amend last commit with new changes
/push --amend
```

## Instructions

### Step 0: Parse Arguments

Parse the arguments to extract:
1. **Branch name** - Apply prefix transformation if present, or auto-generate if not provided
2. **Base branch** - From `--base=` flag or default to `dev`
3. **Skip flags** - `--skip-tests`, `--skip-lint`, `--no-verify`
4. **Amend flag** - `--amend` for amending last commit
5. **PR flags** - `--no-pr` (to skip PR creation) and `--draft`

**Branch prefix mapping (when manually specified):**
```
feat:   → feature/
fix:    → hotfix/
bug:    → bugfix/
chore:  → chore/
docs:   → docs/
refactor: → refactor/
```

**Auto-generate branch name (when not provided):**

1. Run `git status --porcelain` and `git diff` to analyze changes
2. Determine the type and scope of changes:
   - **New module** (`src/modules/<name>/*`) → `feature/<name>-module`
   - **New/modified routes, controllers, services** → `feature/<module>-<description>`
   - **New provider** (`src/providers/*`) → `feature/<provider>-provider`
   - **Bug fixes** (small targeted changes) → `bugfix/<module>-<description>`
   - **Config files** (package.json, tsconfig, etc.) → `chore/<description>`
   - **Documentation** (*.md files) → `docs/<description>`
   - **Tests only** → `test/<module>-tests`
   - **Refactoring** (restructuring without new features) → `refactor/<description>`
3. Generate a kebab-case branch name (lowercase, hyphens, max 50 chars)
4. Ensure uniqueness by checking `git branch -a`

### Step 1: Prepare Branch

**If `--amend` is NOT set:**

1. Determine base branch:
   - If `--base=<branch>` provided → use that branch
   - Otherwise → use `dev` as default
2. Fetch and checkout base branch:
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

### Step 4: Create PR (default behavior)

**Skip this step if `--no-pr` flag is set or if `--amend` is set.**

Otherwise, create a PR:

1. Determine the target branch:
   - If `--base=<branch>` was provided → use that branch
   - Otherwise → use `dev` as the default target
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
- PR: <PR URL> (or "Skipped (--no-pr)" or "Skipped (--amend)")

### Next Steps:
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
- **NEVER delete the `dev` or `main` branches** - these are protected long-lived branches
- When merging PRs, do NOT use `--delete-branch` for PRs targeting `main` from `dev`
