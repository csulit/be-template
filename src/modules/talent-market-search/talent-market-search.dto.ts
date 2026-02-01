import { z } from "@hono/zod-openapi";
import type { TmsMarketScopeSearch, User } from "../../generated/prisma/client.js";
import { createPaginatedResponseSchema } from "../../shared/dtos/pagination.dto.js";
import { createSuccessResponseSchema } from "../../shared/dtos/response.dto.js";

export const CreatedBySchema = z
  .object({
    id: z.string().cuid().openapi({
      description: "Unique identifier of the user who created the search",
      example: "clx1234567890abcdef",
    }),
    name: z.string().openapi({
      description: "Full name of the user",
      example: "John Doe",
    }),
    email: z.string().email().openapi({
      description: "Email address of the user",
      example: "john@example.com",
    }),
  })
  .openapi("TmsCreatedBy");

export const TmsMarketScopeSearchSchema = z
  .object({
    id: z.string().cuid().openapi({
      description: "Unique identifier for the market scope search",
      example: "clx1234567890abcdef",
    }),
    clientName: z.string().nullable().openapi({
      description: "Name of the client for this search (optional)",
      example: "Acme Corporation",
    }),
    jobTitle: z.string().openapi({
      description: "Job title being searched for",
      example: "Senior Software Engineer",
    }),
    budgetMinMax: z.string().openapi({
      description: "Budget range for the position (min-max format)",
      example: "80000-120000",
    }),
    intCurrency: z.string().openapi({
      description: "Currency code for the budget",
      example: "USD",
    }),
    experienceScope: z.string().openapi({
      description: "Required experience level or range",
      example: "5-10 years",
    }),
    locationScope: z.string().openapi({
      description: "Geographic location scope for the search",
      example: "United States, Remote",
    }),
    willingToRelocate: z.boolean().openapi({
      description: "Whether candidates willing to relocate are included",
      example: true,
    }),
    cvKeywordsBooleanSearch: z.string().openapi({
      description: "Boolean search string for CV keyword matching",
      example: "(React OR Vue) AND TypeScript AND NOT Junior",
    }),
    salaryFilter: z.string().openapi({
      description: "Salary filter criteria",
      example: "80000-150000 USD",
    }),
    workTypes: z.string().openapi({
      description: "Types of work arrangements (e.g., remote, hybrid, onsite)",
      example: "Remote, Hybrid",
    }),
    isApproachable: z.boolean().openapi({
      description: "Filter for candidates who are approachable",
      example: true,
    }),
    hasCv: z.boolean().openapi({
      description: "Filter for candidates who have uploaded a CV",
      example: true,
    }),
    isProcessed: z.boolean().openapi({
      description: "Whether this search has been processed",
      example: false,
    }),
    createdById: z.string().cuid().openapi({
      description: "Reference to the user who created this search",
      example: "clxuser1234567890abc",
    }),
    organizationId: z.string().cuid().openapi({
      description: "Reference to the organization this search belongs to",
      example: "clxorg1234567890abc",
    }),
    createdBy: CreatedBySchema.openapi({
      description: "User who created this market scope search",
    }),
    createdAt: z.string().datetime().openapi({
      description: "Timestamp when the search was created",
      example: "2024-01-15T10:30:00.000Z",
    }),
    updatedAt: z.string().datetime().openapi({
      description: "Timestamp when the search was last updated",
      example: "2024-01-15T10:30:00.000Z",
    }),
  })
  .openapi("TmsMarketScopeSearch");

export type TmsMarketScopeSearchDTO = z.infer<typeof TmsMarketScopeSearchSchema>;

export const TmsMarketScopeSearchResponseSchema = createSuccessResponseSchema(
  TmsMarketScopeSearchSchema
);

export const TmsMarketScopeSearchListResponseSchema = createPaginatedResponseSchema(
  TmsMarketScopeSearchSchema
);

export type TmsMarketScopeSearchWithCreatedBy = TmsMarketScopeSearch & {
  createdBy: Pick<User, "id" | "name" | "email">;
};

export function toTmsMarketScopeSearchDto(
  record: TmsMarketScopeSearchWithCreatedBy
): TmsMarketScopeSearchDTO {
  return {
    id: record.id,
    clientName: record.clientName,
    jobTitle: record.jobTitle,
    budgetMinMax: record.budgetMinMax,
    intCurrency: record.intCurrency,
    experienceScope: record.experienceScope,
    locationScope: record.locationScope,
    willingToRelocate: record.willingToRelocate,
    cvKeywordsBooleanSearch: record.cvKeywordsBooleanSearch,
    salaryFilter: record.salaryFilter,
    workTypes: record.workTypes,
    isApproachable: record.isApproachable,
    hasCv: record.hasCv,
    isProcessed: record.isProcessed,
    createdById: record.createdById,
    organizationId: record.organizationId,
    createdBy: {
      id: record.createdBy.id,
      name: record.createdBy.name,
      email: record.createdBy.email,
    },
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toTmsMarketScopeSearchListDto(
  records: TmsMarketScopeSearchWithCreatedBy[],
  total: number,
  page: number,
  pageSize: number
): z.infer<typeof TmsMarketScopeSearchListResponseSchema> {
  return {
    success: true,
    data: records.map(toTmsMarketScopeSearchDto),
    meta: {
      page,
      pageSize,
      totalItems: total,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: page < Math.ceil(total / pageSize),
      hasPreviousPage: page > 1,
    },
  };
}
