import { z } from "@hono/zod-openapi";
import type {
  TmsMarketScopeSearch,
  TmsWorkflowResult,
  User,
} from "../../generated/prisma/client.js";
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

// ============================================================================
// TmsWorkflowResult DTOs
// ============================================================================

export const TmsWorkflowResultSchema = z
  .object({
    id: z.string().cuid().openapi({
      description: "Unique identifier for the workflow result",
      example: "clx1234567890abcdef",
    }),
    searchId: z.string().cuid().openapi({
      description: "Reference to the market scope search this result belongs to",
      example: "clxsearch1234567890",
    }),
    enhancedPrompt: z
      .unknown()
      .nullable()
      .openapi({
        description: "Enhanced prompt data generated by the prompt enhancer agent",
        example: {
          research_type: "single_location_market_scan",
          research_priority: "balanced",
          primary_job_title: "Senior Software Engineer",
          alternate_job_titles: ["Full-Stack Engineer", "Software Developer", "Web Developer"],
          job_category: "software_engineering",
          is_technical_role: true,
          seniority_level: "senior",
          budget_min_php: 80000,
          budget_max_php: 120000,
          international_currency: "USD",
          budget_assessment: "at_market",
          budget_notes: "Budget is competitive for senior-level positions in Metro Manila",
          locations: ["Makati", "BGC Taguig"],
          is_multi_location: true,
          location_type: "metro_manila",
          recommended_search_queries: [
            "Senior Software Engineer salary Philippines 2025",
            "Full-Stack Engineer compensation Metro Manila",
            "PHP to USD exchange rate today",
          ],
          priority_data_sources: ["JobStreet", "Kalibrr", "LinkedIn", "Glassdoor"],
          research_brief:
            "## RESEARCH BRIEF: Senior Software Engineer\n\n### Research Objective\nConduct salary benchmarking for Senior Software Engineer positions in Makati and BGC Taguig.",
        },
      }),
    marketScopingReport: z
      .unknown()
      .nullable()
      .openapi({
        description:
          "Main market scoping research report from the talent acquisition researcher agent",
        example: {
          is_multi_location: true,
          locations_compared: ["Makati", "BGC Taguig"],
          position_title: "Senior Software Engineer",
          job_description:
            "Designs, develops, and maintains software applications using modern frameworks and best practices.",
          recommendation:
            "Strong candidate pool available in both locations. BGC offers slightly higher talent density but Makati provides better cost efficiency.",
          available_talent_pool: 2500,
          specialization: "Full-Stack Development (React, Node.js, TypeScript)",
          difficulty: "Moderate",
          nature: "Technical",
          recommended_hiring_timeline: "4-6 weeks",
          salary_benchmark: [
            {
              experience_range: "3-5",
              experience_label: "Mid-Level",
              base_currency_min: "Makati: ₱60,000; BGC Taguig: ₱65,000",
              base_currency_mid: "Makati: ₱75,000; BGC Taguig: ₱80,000",
              base_currency_max: "Makati: ₱90,000; BGC Taguig: ₱95,000",
              int_currency_min: "Makati: $1,071; BGC Taguig: $1,161",
              int_currency_mid: "Makati: $1,339; BGC Taguig: $1,429",
              int_currency_max: "Makati: $1,607; BGC Taguig: $1,696",
            },
            {
              experience_range: "5-7",
              experience_label: "Senior",
              base_currency_min: "Makati: ₱80,000; BGC Taguig: ₱85,000",
              base_currency_mid: "Makati: ₱100,000; BGC Taguig: ₱110,000",
              base_currency_max: "Makati: ₱130,000; BGC Taguig: ₱140,000",
              int_currency_min: "Makati: $1,429; BGC Taguig: $1,518",
              int_currency_mid: "Makati: $1,786; BGC Taguig: $1,964",
              int_currency_max: "Makati: $2,321; BGC Taguig: $2,500",
            },
          ],
          market_notes:
            "Exchange rate: PHP 56 = USD 1. Talent pool distribution: Makati 45,000 / 55%; BGC Taguig 35,000 / 45%. Market is competitive with high demand for TypeScript and React skills.",
        },
      }),
    splitReports: z
      .unknown()
      .nullable()
      .openapi({
        description:
          "Split location reports for multi-location searches (only present when is_multi_location is true)",
        example: {
          reports: [
            {
              location: "Makati",
              position_title: "Senior Software Engineer",
              job_description:
                "Designs, develops, and maintains software applications using modern frameworks and best practices.",
              recommendation:
                "Strong candidate pool available. Makati provides better cost efficiency.",
              available_talent_pool: 1375,
              specialization: "Full-Stack Development (React, Node.js, TypeScript)",
              difficulty: "Moderate",
              nature: "Technical",
              recommended_hiring_timeline: "4-6 weeks",
              salary_benchmark: [
                {
                  experience_range: "5-7",
                  experience_label: "Senior",
                  base_currency_min: "₱80,000",
                  base_currency_mid: "₱100,000",
                  base_currency_max: "₱130,000",
                  int_currency_min: "$1,429",
                  int_currency_mid: "$1,786",
                  int_currency_max: "$2,321",
                },
              ],
              market_notes: "Exchange rate: PHP 56 = USD 1. Talent pool: 45,000 / 55%.",
            },
            {
              location: "BGC Taguig",
              position_title: "Senior Software Engineer",
              job_description:
                "Designs, develops, and maintains software applications using modern frameworks and best practices.",
              recommendation:
                "Strong candidate pool available. BGC offers slightly higher talent density.",
              available_talent_pool: 1125,
              specialization: "Full-Stack Development (React, Node.js, TypeScript)",
              difficulty: "Moderate",
              nature: "Technical",
              recommended_hiring_timeline: "4-6 weeks",
              salary_benchmark: [
                {
                  experience_range: "5-7",
                  experience_label: "Senior",
                  base_currency_min: "₱85,000",
                  base_currency_mid: "₱110,000",
                  base_currency_max: "₱140,000",
                  int_currency_min: "$1,518",
                  int_currency_mid: "$1,964",
                  int_currency_max: "$2,500",
                },
              ],
              market_notes: "Exchange rate: PHP 56 = USD 1. Talent pool: 35,000 / 45%.",
            },
          ],
        },
      }),
    aggregatedLocationReport: z
      .unknown()
      .nullable()
      .openapi({
        description:
          "Aggregated report combining data from multiple locations (only present when is_multi_location is true)",
        example: {
          position_title: "Senior Software Engineer",
          job_description:
            "Designs, develops, and maintains software applications using modern frameworks and best practices.",
          recommendation:
            "Both Makati and BGC Taguig offer strong talent pools. Consider Makati for cost efficiency or BGC for premium talent access.",
          available_talent_pool: 2500,
          specialization: "Full-Stack Development (React, Node.js, TypeScript)",
          difficulty: "Moderate",
          nature: "Technical",
          recommended_hiring_timeline: "4-6 weeks",
          locations_analyzed: ["Makati", "BGC Taguig"],
          salary_benchmark: [
            {
              experience_range: "5-7",
              experience_label: "Senior",
              base_currency_min: "₱80,000 - ₱85,000",
              base_currency_mid: "₱100,000 - ₱110,000",
              base_currency_max: "₱130,000 - ₱140,000",
              int_currency_min: "$1,429 - $1,518",
              int_currency_mid: "$1,786 - $1,964",
              int_currency_max: "$2,321 - $2,500",
            },
          ],
          location_breakdown: [
            {
              location: "Makati",
              talent_pool: 1375,
              cost_index: "0.95",
              cost_vs_average: "5% below average",
            },
            {
              location: "BGC Taguig",
              talent_pool: 1125,
              cost_index: "1.05",
              cost_vs_average: "5% above average",
            },
          ],
          market_notes:
            "Exchange rate: PHP 56 = USD 1. Overall market is competitive. Recommend starting with Makati for cost-conscious hiring or BGC for premium talent.",
        },
      }),
    createdAt: z.string().datetime().openapi({
      description: "Timestamp when the workflow result was created",
      example: "2024-01-15T10:30:00.000Z",
    }),
    updatedAt: z.string().datetime().openapi({
      description: "Timestamp when the workflow result was last updated",
      example: "2024-01-15T10:30:00.000Z",
    }),
  })
  .openapi("TmsWorkflowResult");

export type TmsWorkflowResultDTO = z.infer<typeof TmsWorkflowResultSchema>;

export const TmsWorkflowResultResponseSchema = createSuccessResponseSchema(TmsWorkflowResultSchema);

export function toTmsWorkflowResultDto(record: TmsWorkflowResult): TmsWorkflowResultDTO {
  return {
    id: record.id,
    searchId: record.searchId,
    enhancedPrompt: record.enhancedPrompt,
    marketScopingReport: record.marketScopingReport,
    splitReports: record.splitReports,
    aggregatedLocationReport: record.aggregatedLocationReport,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
