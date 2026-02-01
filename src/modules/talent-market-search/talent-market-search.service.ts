import { prisma } from "../../db.js";
import { type Prisma } from "../../generated/prisma/client.js";
import { NotFound } from "../../lib/errors.js";
import { getPrismaSkipTake } from "../../shared/utils/pagination.js";
import {
  toTmsMarketScopeSearchDto,
  toTmsMarketScopeSearchListDto,
  toTmsWorkflowResultDto,
} from "./talent-market-search.dto.js";
import type {
  CreateTmsMarketScopeSearchBody,
  ListTmsMarketScopeSearchQuery,
} from "./talent-market-search.validator.js";

type NullableJsonInput = Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;

const MARKET_SCOPE_SEARCH_INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

export class TalentMarketSearchService {
  async listMarketScopeSearches(query: ListTmsMarketScopeSearchQuery) {
    const where = {
      ...(query.organizationId && { organizationId: query.organizationId }),
    };

    const [items, totalItems] = await Promise.all([
      prisma.tmsMarketScopeSearch.findMany({
        where,
        include: MARKET_SCOPE_SEARCH_INCLUDE,
        ...getPrismaSkipTake(query),
        orderBy: { createdAt: "desc" },
      }),
      prisma.tmsMarketScopeSearch.count({ where }),
    ]);

    return toTmsMarketScopeSearchListDto(items, totalItems, query.page, query.pageSize);
  }

  async createMarketScopeSearch(data: CreateTmsMarketScopeSearchBody, createdById: string) {
    const { clientName, ...restData } = data;

    const record = await prisma.tmsMarketScopeSearch.create({
      data: {
        ...restData,
        clientName: clientName ?? null,
        isProcessed: false,
        createdById,
      },
      include: MARKET_SCOPE_SEARCH_INCLUDE,
    });

    return toTmsMarketScopeSearchDto(record);
  }

  async saveWorkflowResult(
    searchId: string,
    workflowState: {
      enhanced_prompt: unknown | null;
      market_scoping_report: unknown | null;
      split_reports: unknown | null;
      aggregated_location_report: unknown | null;
    }
  ) {
    const jsonData = {
      enhancedPrompt: workflowState.enhanced_prompt as NullableJsonInput,
      marketScopingReport: workflowState.market_scoping_report as NullableJsonInput,
      splitReports: workflowState.split_reports as NullableJsonInput,
      aggregatedLocationReport: workflowState.aggregated_location_report as NullableJsonInput,
    };

    const record = await prisma.tmsWorkflowResult.upsert({
      where: { searchId },
      create: {
        searchId,
        ...jsonData,
      },
      update: jsonData,
    });

    return toTmsWorkflowResultDto(record);
  }

  async getWorkflowResultBySearchId(searchId: string) {
    const record = await prisma.tmsWorkflowResult.findUnique({
      where: { searchId },
    });

    if (!record) {
      throw NotFound(`Workflow result not found for search ID: ${searchId}`);
    }

    return toTmsWorkflowResultDto(record);
  }
}

export const talentMarketSearchService = new TalentMarketSearchService();
