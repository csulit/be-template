import type { RouteHandler } from "@hono/zod-openapi";
import { documentsService } from "./documents.service.js";
import type {
  ListDocumentsRoute,
  GetDocumentRoute,
  CreateDocumentRoute,
  UpdateDocumentRoute,
  DeleteDocumentRoute,
} from "./documents.route.js";

export const documentsController = {
  list: (async (c) => {
    const user = c.get("user");
    const query = c.req.valid("query");

    const result = await documentsService.list(user.id, query);

    return c.json(
      {
        success: true as const,
        data: result.data,
        meta: result.meta,
      },
      200
    );
  }) satisfies RouteHandler<ListDocumentsRoute>,

  getById: (async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const document = await documentsService.getById(id, user.id);

    return c.json(
      {
        success: true as const,
        data: document,
      },
      200
    );
  }) satisfies RouteHandler<GetDocumentRoute>,

  create: (async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    const document = await documentsService.create(user.id, body);

    return c.json(
      {
        success: true as const,
        data: document,
      },
      201
    );
  }) satisfies RouteHandler<CreateDocumentRoute>,

  update: (async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const document = await documentsService.update(id, user.id, body);

    return c.json(
      {
        success: true as const,
        data: document,
      },
      200
    );
  }) satisfies RouteHandler<UpdateDocumentRoute>,

  delete: (async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");

    await documentsService.delete(id, user.id);

    return c.json({ success: true as const }, 200);
  }) satisfies RouteHandler<DeleteDocumentRoute>,
};
