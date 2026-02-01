import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "../../shared/validators/pagination.js";
import { IdParamSchema } from "../../shared/validators/common.js";

// ──────────────────────────────────────────────
// TmsMarketScopeSearch body schema
// ──────────────────────────────────────────────

export const CreateTmsMarketScopeSearchBodySchema = z
  .object({
    clientName: z.string().optional().openapi({
      description: "The client name for this market search",
      example: "Acme Corporation",
    }),
    jobTitle: z.string().min(1).openapi({
      description: "The job title to search for",
      example: "Senior Software Engineer",
    }),
    budgetMinMax: z.string().min(1).openapi({
      description: "Budget range in min-max format",
      example: "80000-120000",
    }),
    intCurrency: z.string().min(1).openapi({
      description: "Currency code for the budget",
      example: "USD",
    }),
    experienceScope: z.string().min(1).openapi({
      description: "Required experience scope",
      example: "5-10 years",
    }),
    locationScope: z.string().min(1).openapi({
      description: "Geographic location scope for the search",
      example: "United States, Remote",
    }),
    willingToRelocate: z.boolean().openapi({
      description: "Whether candidates should be willing to relocate",
      example: true,
    }),
    cvKeywordsBooleanSearch: z.string().min(1).openapi({
      description: "Boolean search keywords for CV matching",
      example: "(React OR Vue) AND TypeScript AND (AWS OR GCP)",
    }),
    salaryFilter: z.string().min(1).openapi({
      description: "Salary filter criteria",
      example: "100000-150000 USD",
    }),
    workTypes: z.string().min(1).openapi({
      description: "Preferred work types",
      example: "Full-time, Contract",
    }),
    isApproachable: z.boolean().openapi({
      description: "Whether to filter for approachable candidates only",
      example: true,
    }),
    hasCv: z.boolean().openapi({
      description: "Whether candidates must have a CV on file",
      example: true,
    }),
    organizationId: z.string().cuid().openapi({
      description: "The organization this search belongs to",
      example: "clx1234567890abcdef",
    }),
  })
  .openapi("CreateTmsMarketScopeSearchBody");

export type CreateTmsMarketScopeSearchBody = z.infer<typeof CreateTmsMarketScopeSearchBodySchema>;

// ──────────────────────────────────────────────
// TmsMarketScopeSearch params schema
// ──────────────────────────────────────────────

export const TmsMarketScopeSearchParamsSchema = IdParamSchema;

export type TmsMarketScopeSearchParams = z.infer<typeof TmsMarketScopeSearchParamsSchema>;

// ──────────────────────────────────────────────
// TmsMarketScopeSearch query schema
// ──────────────────────────────────────────────

export const ListTmsMarketScopeSearchQuerySchema = PaginationQuerySchema.extend({
  organizationId: z.string().cuid().optional().openapi({
    description: "Filter by organization ID",
    example: "clx1234567890abcdef",
  }),
});

export type ListTmsMarketScopeSearchQuery = z.infer<typeof ListTmsMarketScopeSearchQuerySchema>;
