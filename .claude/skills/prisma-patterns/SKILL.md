---
name: prisma-patterns
description: Create and manage Prisma database models following project patterns. Use when adding new database entities, relations, indexes, or modifying existing schemas.
---

# Prisma Patterns Skill

This skill guides the creation and management of Prisma database models in this codebase.

## Project Setup

This project uses **Prisma 7.x** with a multi-file schema setup:

```
prisma/
├── prisma.config.ts     # Prisma configuration
├── schema.prisma        # Base models, enums, and generator/datasource
├── models/              # Feature-specific model files
│   ├── reimbursement.prisma
│   ├── tms.prisma
│   └── incoming-email.prisma
├── migrations/          # Migration history
└── seed.ts              # Database seeding
```

**Generated client:** `src/generated/prisma/`

## Commands

```bash
pnpm db:generate      # Generate Prisma client after schema changes
pnpm db:migrate       # Create and run migrations (use --name <name>)
pnpm db:push          # Push schema changes without migration file
pnpm db:studio        # Open Prisma Studio GUI
```

## File Organization

### When to use `schema.prisma`

- Enums used across multiple features
- Core models (User, Session, Organization, etc.)
- Models that are part of the auth system

### When to create a new file in `models/`

- Feature-specific models that belong to a module
- Models that are logically grouped together
- New domain entities

**Naming convention:** `<feature-name>.prisma` (kebab-case)

## Model Structure Pattern

```prisma
// ============================================================================
// Feature Name Models
// ============================================================================

model FeatureName {
  id        String   @id @default(cuid())
  // Required fields first
  name      String
  status    String   @default("pending")
  // Optional fields
  description String?
  // Timestamps (always include)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  // Foreign keys
  userId    String
  organizationId String

  // Relations (grouped together)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Indexes (at the end)
  @@index([userId])
  @@index([organizationId])
  @@map("feature_names")  // snake_case table name
}
```

## Field Patterns

### ID Fields

```prisma
// Primary key with CUID
id String @id @default(cuid())

// UUID alternative (if needed for external systems)
id String @id @default(uuid())
```

### Timestamps

Always include both:

```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

### Optional vs Required

```prisma
// Required field
name String

// Optional field
description String?

// Required with default
status String @default("pending")

// Optional with null tracking
deletedAt DateTime?
```

### Common Field Types

```prisma
// Strings
name        String
email       String    @unique
description String?
longText    String    // PostgreSQL TEXT by default

// Numbers
count       Int       @default(0)
amount      Decimal   @db.Decimal(10, 2)
price       Float

// Booleans
isActive    Boolean   @default(true)
isProcessed Boolean   @default(false)

// Dates
startDate   DateTime
endDate     DateTime?
processedAt DateTime?

// JSON
metadata    Json?
config      Json      @default("{}")
result      Json?

// Enums (define in schema.prisma)
status      StatusEnum @default(pending)
```

## Relations

### One-to-Many (Parent owns children)

```prisma
// Parent model (in schema.prisma or same file)
model User {
  id        String     @id @default(cuid())
  documents Document[]
}

// Child model
model Document {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

### Many-to-Many (through join table)

```prisma
model User {
  id    String       @id @default(cuid())
  roles UserRole[]
}

model Role {
  id    String     @id @default(cuid())
  users UserRole[]
}

model UserRole {
  id     String @id @default(cuid())
  userId String
  roleId String

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Restrict)

  @@unique([userId, roleId])
  @@index([userId])
  @@index([roleId])
  @@map("user_roles")
}
```

### Self-Relations

```prisma
model Category {
  id       String     @id @default(cuid())
  parentId String?

  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")

  @@index([parentId])
}
```

## Delete Behaviors

```prisma
// Cascade: Delete children when parent is deleted
user User @relation(fields: [userId], references: [id], onDelete: Cascade)

// Restrict: Prevent deletion if children exist
role Role @relation(fields: [roleId], references: [id], onDelete: Restrict)

// SetNull: Set foreign key to null (field must be optional)
category Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)

// NoAction: Database handles it (default, rarely used)
```

## Indexes

### Basic Index

```prisma
@@index([userId])
@@index([organizationId])
```

### Composite Index

```prisma
// For queries that filter by both fields
@@index([organizationId, status])
@@index([userId, createdAt])
```

### Unique Constraints

```prisma
// Single field unique
email String @unique

// Composite unique
@@unique([organizationId, name])
@@unique([userId, roleId])
```

## Enums

Define enums in `schema.prisma`:

```prisma
enum DocumentType {
  contract
  invoice
  receipt
}

enum Status {
  pending
  processing
  completed
  failed
}
```

Use in models:

```prisma
model Document {
  type   DocumentType
  status Status       @default(pending)
}
```

## Adding Relations to Existing Models

When your new model relates to core models (User, Organization), you must update `schema.prisma`:

```prisma
// In schema.prisma, add to User model:
model User {
  // ... existing fields ...
  myFeatures MyFeature[]  // Add this line
}

// In schema.prisma, add to Organization model:
model Organization {
  // ... existing fields ...
  myFeatures MyFeature[]  // Add this line
}
```

## Job Processing Pattern

For models that need background processing:

```prisma
model ProcessableRecord {
  id           String    @id @default(cuid())
  // ... business fields ...

  // Processing fields
  isProcessed  Boolean   @default(false)
  processingAt DateTime? // Lock timestamp for concurrent processing
  processedAt  DateTime? // Completion timestamp
  result       Json?     // Success result
  error        String?   // Error message if failed

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // Index for job queries
  @@index([isProcessed, processingAt])
}
```

## Table Naming

Always use `@@map()` with snake_case:

```prisma
model UserProfile {
  // ...
  @@map("user_profiles")
}

model TmsMarketScopeSearch {
  // ...
  @@map("tms_market_scope_searches")
}
```

## Workflow

### Creating a New Model

1. Create `prisma/models/<feature>.prisma`
2. Add relations to `schema.prisma` if referencing User/Organization
3. Run `pnpm db:generate` to update the client
4. Run `pnpm db:migrate --name <descriptive_name>` to create migration

### Modifying an Existing Model

1. Edit the relevant `.prisma` file
2. Run `pnpm db:generate`
3. Run `pnpm db:migrate --name <descriptive_name>`

### Quick Development (no migration)

```bash
pnpm db:push  # Apply changes without migration file
```

## Example: Complete Feature Model File

```prisma
// prisma/models/task.prisma

// ============================================================================
// Task Management Models
// ============================================================================

model Task {
  id          String    @id @default(cuid())
  title       String
  description String?
  priority    Int       @default(0)
  status      String    @default("pending")
  dueDate     DateTime?
  completedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  createdById String
  assigneeId  String?
  organizationId String

  // Relations
  createdBy    User         @relation("TaskCreator", fields: [createdById], references: [id], onDelete: Cascade)
  assignee     User?        @relation("TaskAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  comments     TaskComment[]

  // Indexes
  @@index([createdById])
  @@index([assigneeId])
  @@index([organizationId])
  @@index([status, dueDate])
  @@map("tasks")
}

model TaskComment {
  id        String   @id @default(cuid())
  content   String
  taskId    String
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  task   Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  author User @relation(fields: [authorId], references: [id], onDelete: Cascade)

  // Indexes
  @@index([taskId])
  @@index([authorId])
  @@map("task_comments")
}
```

## Checklist

When creating/modifying Prisma models:

- [ ] Place in correct file (`schema.prisma` or `models/<feature>.prisma`)
- [ ] Include `id` with `@default(cuid())`
- [ ] Include `createdAt` and `updatedAt` timestamps
- [ ] Add `@@map()` with snake_case table name
- [ ] Define relations with appropriate `onDelete` behavior
- [ ] Add `@@index()` for foreign keys and frequently queried fields
- [ ] Add `@@unique()` for business constraints
- [ ] Update `schema.prisma` if adding relations to User/Organization
- [ ] Run `pnpm db:generate` after changes
- [ ] Run `pnpm db:migrate --name <name>` to create migration
