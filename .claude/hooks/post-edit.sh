#!/bin/bash
# Post-edit hook: Auto-format and lint TypeScript files after Claude edits them

# Read the tool input from stdin
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Exit if no file path
if [ -z "$FILE" ]; then
  exit 0
fi

# Only process TypeScript files
if [[ "$FILE" =~ \.(ts|tsx)$ ]]; then
  # Auto-format with Prettier
  if command -v npx &> /dev/null; then
    npx prettier --write "$FILE" 2>/dev/null || true
  fi

  # Run ESLint with auto-fix
  if command -v npx &> /dev/null; then
    LINT_OUTPUT=$(npx eslint "$FILE" --fix 2>&1) || true

    # If there are remaining lint errors, output them for Claude to see
    if [ -n "$LINT_OUTPUT" ] && echo "$LINT_OUTPUT" | grep -q "error"; then
      echo "⚠️ ESLint issues in $FILE:"
      echo "$LINT_OUTPUT"
    fi
  fi
fi

# Reminder for Prisma schema changes
if [[ "$FILE" =~ \.prisma$ ]]; then
  echo "📝 Prisma schema modified: $FILE"
  echo "   Remember to run: pnpm db:generate"
fi

exit 0
