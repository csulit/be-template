import type { RouteHandler } from "@hono/zod-openapi";
import { incomingEmailService } from "./incoming-email.service.js";
import { toIncomingEmailResponseDto } from "./incoming-email.dto.js";
import type {
  ListIncomingEmailsRoute,
  GetIncomingEmailRoute,
  UpdateIncomingEmailRoute,
} from "./incoming-email.route.js";

export const incomingEmailController = {
  /**
   * List incoming emails with pagination and filters
   */
  list: (async (c) => {
    const query = c.req.valid("query");

    const result = await incomingEmailService.list(query);

    return c.json(
      {
        success: true as const,
        data: result.data,
        meta: result.meta,
      },
      200
    );
  }) satisfies RouteHandler<ListIncomingEmailsRoute>,

  /**
   * Get a single incoming email by ID
   */
  getById: (async (c) => {
    const { id } = c.req.valid("param");

    const email = await incomingEmailService.getById(id);

    return c.json(
      {
        success: true as const,
        data: toIncomingEmailResponseDto(email),
      },
      200
    );
  }) satisfies RouteHandler<GetIncomingEmailRoute>,

  /**
   * Update an incoming email's status and/or metadata
   */
  update: (async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const email = await incomingEmailService.update(id, body);

    return c.json(
      {
        success: true as const,
        data: toIncomingEmailResponseDto(email),
      },
      200
    );
  }) satisfies RouteHandler<UpdateIncomingEmailRoute>,
};
