import { createMiddleware } from "hono/factory";
import { prisma } from "../db.js";
import { BadRequest, Forbidden, NotFound } from "../lib/errors.js";
import type { AuthEnv } from "./auth.middleware.js";
import type { Member } from "../generated/prisma/client.js";

export type OrgEnv = {
  Variables: AuthEnv["Variables"] & {
    member: Member;
    organizationId: string;
  };
};

type OrgSource =
  | { from: "query" }
  | { from: "body" }
  | { from: "param"; paramName: string }
  | { from: "resource"; table: string; idParam?: string };

type OrgGuardOptions = {
  source: OrgSource;
  roles?: string[];
  allowGlobalRoles?: string[];
};

type PrismaDelegate = {
  findUnique: (args: {
    where: { id: string };
    select: { organizationId: boolean };
  }) => Promise<{ organizationId: string } | null>;
};

export function orgGuard(options: OrgGuardOptions) {
  return createMiddleware<OrgEnv>(async (c, next) => {
    const user = c.get("user");

    let organizationId: string | undefined;

    switch (options.source.from) {
      case "query": {
        organizationId = c.req.query("organizationId");
        break;
      }
      case "body": {
        const body = await c.req.json();
        organizationId = body.organizationId;
        break;
      }
      case "param": {
        organizationId = c.req.param(options.source.paramName);
        break;
      }
      case "resource": {
        const idParam = options.source.idParam ?? "id";
        const resourceId = c.req.param(idParam);

        if (!resourceId) {
          throw BadRequest("Missing resource ID");
        }

        const delegate = (prisma as unknown as Record<string, PrismaDelegate>)[
          options.source.table
        ] as PrismaDelegate | undefined;

        if (!delegate) {
          throw BadRequest(`Invalid resource table: ${options.source.table}`);
        }

        const resource = await delegate.findUnique({
          where: { id: resourceId },
          select: { organizationId: true },
        });

        if (!resource) {
          throw NotFound("Resource not found");
        }

        organizationId = resource.organizationId;
        break;
      }
    }

    if (!organizationId) {
      throw BadRequest("Organization ID is required");
    }

    if (options.allowGlobalRoles && options.allowGlobalRoles.length > 0) {
      const userRole = user.role ?? "user";
      if (options.allowGlobalRoles.includes(userRole)) {
        c.set("organizationId", organizationId);
        await next();
        return;
      }
    }

    const member = await prisma.member.findFirst({
      where: { userId: user.id, organizationId },
    });

    if (!member) {
      throw Forbidden("Not a member of this organization");
    }

    if (options.roles && options.roles.length > 0) {
      if (!options.roles.includes(member.role)) {
        throw Forbidden("Insufficient organization role");
      }
    }

    c.set("member", member);
    c.set("organizationId", organizationId);

    await next();
  });
}
