import type { RouteHandler } from "@hono/zod-openapi";
import { usersService } from "./users.service.js";
import { toUserProfileWithOrgsDto } from "./users.dto.js";
import type {
  DevTokenRoute,
  GetProfileRoute,
  UpdateProfileRoute,
  ListUsersRoute,
  GetUserByIdRoute,
  AdminUpdateUserRoute,
  BanUserRoute,
  UnbanUserRoute,
  ListOrgMembersRoute,
  ListOrgsRoute,
  GetOrgByIdRoute,
  CreateOrgRoute,
  UpdateOrgRoute,
  DeleteOrgRoute,
  SetOrgMemberRoleRoute,
  RemoveOrgMemberRoute,
  TransferOrgOwnershipRoute,
} from "./users.route.js";

export const usersController = {
  generateDevToken: (async (c) => {
    const body = c.req.valid("json");
    const result = await usersService.generateDevToken(body);

    return c.json(
      {
        success: true as const,
        data: result,
      },
      200
    );
  }) as RouteHandler<DevTokenRoute>,

  getProfile: (async (c) => {
    const user = c.get("user");
    const profile = await usersService.getProfileWithOrgs(user.id);

    return c.json(
      {
        success: true as const,
        data: toUserProfileWithOrgsDto(profile),
      },
      200
    );
  }) satisfies RouteHandler<GetProfileRoute>,

  updateProfile: (async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    await usersService.updateProfile(user.id, body);
    const profile = await usersService.getProfileWithOrgs(user.id);

    return c.json(
      {
        success: true as const,
        data: toUserProfileWithOrgsDto(profile),
      },
      200
    );
  }) satisfies RouteHandler<UpdateProfileRoute>,

  listUsers: (async (c) => {
    const query = c.req.valid("query");
    const result = await usersService.listUsers(query);

    return c.json(result, 200);
  }) satisfies RouteHandler<ListUsersRoute>,

  getUserById: (async (c) => {
    const { id } = c.req.valid("param");
    const user = await usersService.getById(id);

    return c.json(
      {
        success: true as const,
        data: user,
      },
      200
    );
  }) satisfies RouteHandler<GetUserByIdRoute>,

  adminUpdateUser: (async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const updated = await usersService.adminUpdateUser(id, body);

    return c.json(
      {
        success: true as const,
        data: updated,
      },
      200
    );
  }) satisfies RouteHandler<AdminUpdateUserRoute>,

  banUser: (async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const banned = await usersService.banUser(id, body);

    return c.json(
      {
        success: true as const,
        data: banned,
      },
      200
    );
  }) satisfies RouteHandler<BanUserRoute>,

  unbanUser: (async (c) => {
    const { id } = c.req.valid("param");
    const unbanned = await usersService.unbanUser(id);

    return c.json(
      {
        success: true as const,
        data: unbanned,
      },
      200
    );
  }) satisfies RouteHandler<UnbanUserRoute>,

  listOrgMembers: (async (c) => {
    const query = c.req.valid("query");
    const result = await usersService.listOrgMembers(query);

    return c.json(result, 200);
  }) satisfies RouteHandler<ListOrgMembersRoute>,

  // ─── Organization Admin Handlers ────────────────────────────────────────────

  listOrgs: (async (c) => {
    const query = c.req.valid("query");
    const result = await usersService.listOrgs(query);

    return c.json(result, 200);
  }) satisfies RouteHandler<ListOrgsRoute>,

  getOrgById: (async (c) => {
    const { orgId } = c.req.valid("param");
    const org = await usersService.getOrgById(orgId);

    return c.json(
      {
        success: true as const,
        data: org,
      },
      200
    );
  }) satisfies RouteHandler<GetOrgByIdRoute>,

  createOrg: (async (c) => {
    const body = c.req.valid("json");
    const org = await usersService.createOrg(body);

    return c.json(
      {
        success: true as const,
        data: org,
      },
      201
    );
  }) satisfies RouteHandler<CreateOrgRoute>,

  updateOrg: (async (c) => {
    const { orgId } = c.req.valid("param");
    const body = c.req.valid("json");
    const updated = await usersService.updateOrg(orgId, body);

    return c.json(
      {
        success: true as const,
        data: updated,
      },
      200
    );
  }) satisfies RouteHandler<UpdateOrgRoute>,

  deleteOrg: (async (c) => {
    const { orgId } = c.req.valid("param");
    await usersService.deleteOrg(orgId);

    return c.json({ success: true as const }, 200);
  }) satisfies RouteHandler<DeleteOrgRoute>,

  setOrgMemberRole: (async (c) => {
    const { orgId, memberId } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = await usersService.setOrgMemberRole(orgId, memberId, body);

    return c.json(
      {
        success: true as const,
        data: result,
      },
      200
    );
  }) satisfies RouteHandler<SetOrgMemberRoleRoute>,

  removeOrgMember: (async (c) => {
    const { orgId, memberId } = c.req.valid("param");
    await usersService.removeOrgMember(orgId, memberId);

    return c.json({ success: true as const }, 200);
  }) satisfies RouteHandler<RemoveOrgMemberRoute>,

  transferOrgOwnership: (async (c) => {
    const { orgId } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = await usersService.transferOrgOwnership(orgId, body);

    return c.json(
      {
        success: true as const,
        data: result,
      },
      200
    );
  }) satisfies RouteHandler<TransferOrgOwnershipRoute>,
};
