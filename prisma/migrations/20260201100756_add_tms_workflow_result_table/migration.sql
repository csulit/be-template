-- CreateTable
CREATE TABLE "tms_workflow_results" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "enhancedPrompt" JSONB,
    "marketScopingReport" JSONB,
    "splitReports" JSONB,
    "aggregatedLocationReport" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tms_workflow_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tms_workflow_results_searchId_key" ON "tms_workflow_results"("searchId");

-- AddForeignKey
ALTER TABLE "tms_workflow_results" ADD CONSTRAINT "tms_workflow_results_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "tms_market_scope_searches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
