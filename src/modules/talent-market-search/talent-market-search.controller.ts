import type { RouteHandler } from "@hono/zod-openapi";
import { talentMarketSearchService } from "./talent-market-search.service.js";
import type {
  ListMarketScopeSearchesRoute,
  CreateMarketScopeSearchRoute,
  GetWorkflowResultRoute,
} from "./talent-market-search.route.js";

export const talentMarketSearchController = {
  listMarketScopeSearches: (async (c) => {
    const query = c.req.valid("query");
    const result = await talentMarketSearchService.listMarketScopeSearches(query);
    return c.json(result, 200);
  }) satisfies RouteHandler<ListMarketScopeSearchesRoute>,

  createMarketScopeSearch: (async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");
    const data = await talentMarketSearchService.createMarketScopeSearch(body, user.id);
    return c.json({ success: true as const, data }, 201);
  }) satisfies RouteHandler<CreateMarketScopeSearchRoute>,

  getWorkflowResult: (async (c) => {
    const { id } = c.req.valid("param");
    const data = await talentMarketSearchService.getWorkflowResultBySearchId(id);
    return c.json({ success: true as const, data }, 200);
  }) satisfies RouteHandler<GetWorkflowResultRoute>,
};
