---
name: docs
description: Manage project documentation including guides, implementation plans, and references. Use when reading, creating, or updating documentation in the docs/ folder.
---

# Documentation Skill

This skill guides working with project documentation stored in the `docs/` folder.

## Documentation Structure

```
docs/
├── guides/        # How-to guides and tutorials
├── plans/         # Implementation plans and technical designs
└── references/    # API references, specs, external docs
```

### guides/

Step-by-step instructions for common tasks:
- Setup guides
- Development workflows
- Troubleshooting guides
- Best practices

### plans/

Technical implementation plans before coding:
- Feature designs
- Architecture decisions
- Migration plans
- Integration plans

### references/

Technical reference material:
- API specifications
- External service documentation
- Configuration references
- Dependency documentation

## Working with Plans

### Reading a Plan

Before implementing a feature, check for existing plans:

```bash
# List all plans
Glob: docs/plans/*.md

# Search for specific topic
Grep: pattern="keyword" path="docs/plans"
```

### Creating a Plan

When planning a new feature:

```markdown
# Feature Name Implementation Plan

## Overview
Brief description of what we're implementing.

## Goals
- Goal 1
- Goal 2

## Dependencies
- Package dependencies with install commands
- External services required

## Architecture
- File structure
- Component relationships
- Data flow

## Database Schema (if applicable)
Prisma schema additions

## Implementation Steps

### Phase 1: Description
1. Step 1
2. Step 2

### Phase 2: Description
1. Step 1
2. Step 2

## Code Examples
Key implementation patterns and examples

## Environment Variables
New env vars needed

## Testing
How to test the implementation

## Security Considerations
Security implications and mitigations

## Future Enhancements
- [ ] Enhancement 1
- [ ] Enhancement 2
```

### Updating a Plan

When a plan needs updates:
1. Read the existing plan
2. Add new sections or modify existing ones
3. Mark completed phases
4. Update future enhancements checklist

## Working with Guides

### Creating a Guide

```markdown
# Guide Title

## Prerequisites
- Required knowledge
- Required setup

## Steps

### Step 1: Description
Detailed instructions...

### Step 2: Description
Detailed instructions...

## Troubleshooting

### Common Issue 1
Solution...

### Common Issue 2
Solution...

## Related Resources
- Link to relevant docs
- Link to related guides
```

## Working with References

### Creating a Reference

```markdown
# Reference Title

## Overview
What this reference covers.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| option1 | string | - | Description |

## API Reference

### Endpoint/Method Name
Description and usage examples.

## Examples
Code examples for common use cases.
```

## File Naming Conventions

- Use kebab-case: `my-feature-plan.md`
- Be descriptive: `imapflow-email-processing.md` not `email.md`
- Include category if helpful: `auth-oauth2-guide.md`

## Search Patterns

```bash
# Find all documentation
Glob: docs/**/*.md

# Find plans about a topic
Grep: pattern="email|imap" path="docs/plans"

# Find guides
Glob: docs/guides/*.md

# Find references
Glob: docs/references/*.md
```

## Integration with Development

### Before Implementing
1. Check `docs/plans/` for existing plans
2. Read relevant plan thoroughly
3. Follow implementation steps

### During Implementation
1. Update plan with any changes
2. Mark completed phases
3. Document deviations from plan

### After Implementation
1. Create guide if needed
2. Update references if applicable
3. Mark plan as completed or archive

## Checklist

When working with documentation:
- [ ] Check for existing docs before creating new
- [ ] Follow naming conventions
- [ ] Use proper markdown structure
- [ ] Include code examples where helpful
- [ ] Keep content up-to-date
- [ ] Cross-reference related docs
