import { prisma } from "../../db.js";
import { getPrismaSkipTake } from "../../shared/utils/pagination.js";
import {
  toTmsMarketScopeSearchDto,
  toTmsMarketScopeSearchListDto,
} from "./talent-market-search.dto.js";
import type {
  CreateTmsMarketScopeSearchBody,
  ListTmsMarketScopeSearchQuery,
} from "./talent-market-search.validator.js";

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
}

export const talentMarketSearchService = new TalentMarketSearchService();
