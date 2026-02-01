-- AlterTable
ALTER TABLE "tms_market_scope_searches" ADD COLUMN     "error" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processingAt" TIMESTAMP(3),
ADD COLUMN     "result" JSONB;
