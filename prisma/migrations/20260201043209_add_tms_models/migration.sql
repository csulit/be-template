-- CreateTable
CREATE TABLE "reimbursement_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reimbursement_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reimbursement_type_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reimbursement_type_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reimbursement_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reimbursement_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reimbursement_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reimbursement_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tms_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tms_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tms_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tms_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tms_market_scope_searches" (
    "id" TEXT NOT NULL,
    "clientName" TEXT,
    "jobTitle" TEXT NOT NULL,
    "budgetMinMax" TEXT NOT NULL,
    "intCurrency" TEXT NOT NULL,
    "experienceScope" TEXT NOT NULL,
    "locationScope" TEXT NOT NULL,
    "willingToRelocate" BOOLEAN NOT NULL,
    "cvKeywordsBooleanSearch" TEXT NOT NULL,
    "salaryFilter" TEXT NOT NULL,
    "workTypes" TEXT NOT NULL,
    "isApproachable" BOOLEAN NOT NULL,
    "hasCv" BOOLEAN NOT NULL,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "tms_market_scope_searches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reimbursement_roles_organizationId_idx" ON "reimbursement_roles"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "reimbursement_roles_organizationId_name_key" ON "reimbursement_roles"("organizationId", "name");

-- CreateIndex
CREATE INDEX "reimbursement_type_categories_organizationId_idx" ON "reimbursement_type_categories"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "reimbursement_type_categories_organizationId_name_key" ON "reimbursement_type_categories"("organizationId", "name");

-- CreateIndex
CREATE INDEX "reimbursement_users_userId_idx" ON "reimbursement_users"("userId");

-- CreateIndex
CREATE INDEX "reimbursement_users_organizationId_idx" ON "reimbursement_users"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "reimbursement_users_userId_roleId_key" ON "reimbursement_users"("userId", "roleId");

-- CreateIndex
CREATE INDEX "reimbursement_types_organizationId_idx" ON "reimbursement_types"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "reimbursement_types_organizationId_name_key" ON "reimbursement_types"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tms_roles_name_key" ON "tms_roles"("name");

-- CreateIndex
CREATE INDEX "tms_users_userId_idx" ON "tms_users"("userId");

-- CreateIndex
CREATE INDEX "tms_users_organizationId_idx" ON "tms_users"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "tms_users_userId_roleId_key" ON "tms_users"("userId", "roleId");

-- CreateIndex
CREATE INDEX "tms_market_scope_searches_createdById_idx" ON "tms_market_scope_searches"("createdById");

-- CreateIndex
CREATE INDEX "tms_market_scope_searches_organizationId_idx" ON "tms_market_scope_searches"("organizationId");

-- AddForeignKey
ALTER TABLE "reimbursement_roles" ADD CONSTRAINT "reimbursement_roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursement_type_categories" ADD CONSTRAINT "reimbursement_type_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursement_users" ADD CONSTRAINT "reimbursement_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursement_users" ADD CONSTRAINT "reimbursement_users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "reimbursement_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursement_users" ADD CONSTRAINT "reimbursement_users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursement_types" ADD CONSTRAINT "reimbursement_types_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursement_types" ADD CONSTRAINT "reimbursement_types_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "reimbursement_type_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_users" ADD CONSTRAINT "tms_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_users" ADD CONSTRAINT "tms_users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "tms_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_users" ADD CONSTRAINT "tms_users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_market_scope_searches" ADD CONSTRAINT "tms_market_scope_searches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_market_scope_searches" ADD CONSTRAINT "tms_market_scope_searches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
