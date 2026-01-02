import type { RouteHandler } from "@hono/zod-openapi";
import { usersService } from "./users.service.js";
import type { GetProfileRoute, UpdateProfileRoute } from "./users.route.js";

export const usersController = {
  getProfile: (async (c) => {
    const user = c.get("user");
    const profile = await usersService.getById(user.id);

    return c.json(
      {
        success: true as const,
        data: profile,
      },
      200
    );
  }) satisfies RouteHandler<GetProfileRoute>,

  updateProfile: (async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    const updated = await usersService.updateProfile(user.id, body);

    return c.json(
      {
        success: true as const,
        data: updated,
      },
      200
    );
  }) satisfies RouteHandler<UpdateProfileRoute>,
};
