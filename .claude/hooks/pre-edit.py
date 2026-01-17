#!/usr/bin/env python3
"""
Pre-edit hook: Block edits to sensitive files
Exit code 2 = block the action with error message
Exit code 0 = allow the action
"""

import json
import sys

# Files/directories that should never be edited by Claude
BLOCKED_PATTERNS = [
    '.env',
    '.git/',
    'node_modules/',
    'src/generated/',
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    '.claude/settings.json',  # Prevent self-modification
]

# Files that should trigger a warning but not block
WARN_PATTERNS = [
    'package.json',
    'tsconfig.json',
    'prisma/schema.prisma',
]

def main():
    try:
        data = json.load(sys.stdin)
        file_path = data.get('tool_input', {}).get('file_path', '')

        if not file_path:
            sys.exit(0)

        # Check for blocked patterns
        for pattern in BLOCKED_PATTERNS:
            if pattern in file_path:
                print(f"🚫 Blocked: Cannot edit '{file_path}'", file=sys.stderr)
                print(f"   Reason: '{pattern}' is a protected path", file=sys.stderr)
                sys.exit(2)

        # Check for warning patterns (allow but notify)
        for pattern in WARN_PATTERNS:
            if pattern in file_path:
                print(f"⚠️  Editing config file: {file_path}")
                break

        sys.exit(0)

    except json.JSONDecodeError:
        # If we can't parse input, allow the action
        sys.exit(0)
    except Exception as e:
        # On any error, allow the action but log it
        print(f"Hook error: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == '__main__':
    main()
