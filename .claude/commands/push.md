# Push Command

Create a branch from `dev`, run checks, and push changes.

## Arguments

- `$ARGUMENTS` - Branch name. If prefixed with `fix:`, creates a `hot/` branch.

## Instructions

Parse the branch name from the arguments:

- If the argument starts with `fix:` → extract the text after the colon and create a branch named `hot/<extracted-name>`
- Otherwise → use the provided branch name as-is

Execute the following steps in order. Stop immediately on any failure and report the error.

### Step 1: Prepare branch

1. Run `git checkout dev`
2. Run `git pull --rebase origin dev`
3. Create and switch to the new branch: `git checkout -b <branch-name>`

### Step 2: Run lint

1. Run `pnpm lint`
2. If it fails, attempt to fix with `pnpm lint:fix`
3. If still failing, stop and report the lint errors

### Step 3: Run format

1. Run `pnpm format`
2. If it fails, stop and report the format errors

### Step 4: Run typecheck

1. Run `pnpm typecheck`
2. If this fails, stop immediately and report all TypeScript errors
3. Do NOT proceed to commit or push if typecheck fails

### Step 5: Run tests

1. Run `pnpm test:run`
2. If tests fail, stop and report the failing tests
3. Do NOT proceed to commit or push if tests fail

### Step 6: Commit and push

1. Run `git add .`
2. Check if there are any staged changes with `git diff --cached --quiet`
3. If there are changes, commit with a detailed, descriptive message
4. Run `git push -u origin <branch-name>`

## Error handling

- If any git operation fails → stop and report the error
- If lint fails after fix attempt → stop and report
- If format fails → stop and report
- If typecheck fails → stop and report all errors, do not commit or push
- If tests fail → stop and report failing tests, do not commit or push
