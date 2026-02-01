import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { orgGuard, type OrgEnv } from "../../middleware/org.middleware.js";
import { ErrorResponseSchema } from "../../shared/dtos/response.dto.js";
import { talentMarketSearchController } from "./talent-market-search.controller.js";
import {
  TmsMarketScopeSearchResponseSchema,
  TmsMarketScopeSearchListResponseSchema,
  TmsWorkflowResultResponseSchema,
} from "./talent-market-search.dto.js";
import {
  CreateTmsMarketScopeSearchBodySchema,
  ListTmsMarketScopeSearchQuerySchema,
  TmsMarketScopeSearchParamsSchema,
} from "./talent-market-search.validator.js";

const app = new OpenAPIHono<OrgEnv>();

const listMarketScopeSearchesRoute = createRoute({
  method: "get",
  path: "/market-scope-searches",
  tags: ["TMS Market Scope Search"],
  summary: "List market scope searches",
  description:
    "Returns a paginated list of market scope searches. Optionally filter by organization.",
  middleware: [authMiddleware, orgGuard({ source: { from: "query" } })] as const,
  request: {
    query: ListTmsMarketScopeSearchQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated list of market scope searches",
      content: {
        "application/json": {
          schema: TmsMarketScopeSearchListResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const createMarketScopeSearchRoute = createRoute({
  method: "post",
  path: "/market-scope-searches",
  tags: ["TMS Market Scope Search"],
  summary: "Create market scope search",
  description: "Creates a new market scope search with the provided parameters.",
  middleware: [authMiddleware, orgGuard({ source: { from: "body" } })] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateTmsMarketScopeSearchBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Market scope search created",
      content: {
        "application/json": {
          schema: TmsMarketScopeSearchResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const getWorkflowResultRoute = createRoute({
  method: "get",
  path: "/market-scope-searches/{id}/workflow-result",
  tags: ["TMS Market Scope Search"],
  summary: "Get workflow result for a market scope search",
  description:
    "Returns the AI workflow result (enhanced prompt, market scoping report, split reports, aggregated report) for a specific market scope search.",
  middleware: [
    authMiddleware,
    orgGuard({ source: { from: "resource", table: "tmsMarketScopeSearch" } }),
  ] as const,
  request: {
    params: TmsMarketScopeSearchParamsSchema,
  },
  responses: {
    200: {
      description: "Workflow result retrieved successfully",
      content: {
        "application/json": {
          schema: TmsWorkflowResultResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Workflow result not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export type ListMarketScopeSearchesRoute = typeof listMarketScopeSearchesRoute;
export type CreateMarketScopeSearchRoute = typeof createMarketScopeSearchRoute;
export type GetWorkflowResultRoute = typeof getWorkflowResultRoute;

app.openapi(listMarketScopeSearchesRoute, talentMarketSearchController.listMarketScopeSearches);
app.openapi(createMarketScopeSearchRoute, talentMarketSearchController.createMarketScopeSearch);
app.openapi(getWorkflowResultRoute, talentMarketSearchController.getWorkflowResult);

export { app as talentMarketSearchRoutes };
