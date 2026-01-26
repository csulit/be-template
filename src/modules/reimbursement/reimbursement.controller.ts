import type { RouteHandler } from "@hono/zod-openapi";
import { reimbursementService } from "./reimbursement.service.js";
import type {
  ListReimbursementUsersRoute,
  GetReimbursementUserRoute,
  CreateReimbursementUserRoute,
  UpdateReimbursementUserRoute,
  DeleteReimbursementUserRoute,
  ListReimbursementTypesRoute,
  GetReimbursementTypeRoute,
  CreateReimbursementTypeRoute,
  DeleteReimbursementTypeRoute,
  ListReimbursementRolesRoute,
  GetReimbursementRoleRoute,
  CreateReimbursementRoleRoute,
  DeleteReimbursementRoleRoute,
  ListReimbursementTypeCategoriesRoute,
  GetReimbursementTypeCategoryRoute,
  CreateReimbursementTypeCategoryRoute,
  DeleteReimbursementTypeCategoryRoute,
} from "./reimbursement.route.js";

export const reimbursementController = {
  // ===========================================================================
  // Reimbursement Users
  // ===========================================================================

  listUsers: (async (c) => {
    const query = c.req.valid("query");
    const result = await reimbursementService.listUsers(query);
    return c.json(result, 200);
  }) satisfies RouteHandler<ListReimbursementUsersRoute>,

  getUser: (async (c) => {
    const { id } = c.req.valid("param");
    const data = await reimbursementService.getUserById(id);
    return c.json({ success: true as const, data }, 200);
  }) satisfies RouteHandler<GetReimbursementUserRoute>,

  createUser: (async (c) => {
    const body = c.req.valid("json");
    const data = await reimbursementService.createUser(body);
    return c.json({ success: true as const, data }, 201);
  }) satisfies RouteHandler<CreateReimbursementUserRoute>,

  updateUser: (async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const data = await reimbursementService.updateUser(id, body);
    return c.json({ success: true as const, data }, 200);
  }) satisfies RouteHandler<UpdateReimbursementUserRoute>,

  deleteUser: (async (c) => {
    const { id } = c.req.valid("param");
    await reimbursementService.deleteUser(id);
    return c.json({ success: true as const }, 200);
  }) satisfies RouteHandler<DeleteReimbursementUserRoute>,

  // ===========================================================================
  // Reimbursement Types
  // ===========================================================================

  listTypes: (async (c) => {
    const query = c.req.valid("query");
    const result = await reimbursementService.listTypes(query);
    return c.json(result, 200);
  }) satisfies RouteHandler<ListReimbursementTypesRoute>,

  getType: (async (c) => {
    const { id } = c.req.valid("param");
    const data = await reimbursementService.getTypeById(id);
    return c.json({ success: true as const, data }, 200);
  }) satisfies RouteHandler<GetReimbursementTypeRoute>,

  createType: (async (c) => {
    const body = c.req.valid("json");
    const data = await reimbursementService.createType(body);
    return c.json({ success: true as const, data }, 201);
  }) satisfies RouteHandler<CreateReimbursementTypeRoute>,

  deleteType: (async (c) => {
    const { id } = c.req.valid("param");
    await reimbursementService.deleteType(id);
    return c.json({ success: true as const }, 200);
  }) satisfies RouteHandler<DeleteReimbursementTypeRoute>,

  // ===========================================================================
  // Reimbursement Roles
  // ===========================================================================

  listRoles: (async (c) => {
    const query = c.req.valid("query");
    const result = await reimbursementService.listRoles(query);
    return c.json(result, 200);
  }) satisfies RouteHandler<ListReimbursementRolesRoute>,

  getRole: (async (c) => {
    const { id } = c.req.valid("param");
    const data = await reimbursementService.getRoleById(id);
    return c.json({ success: true as const, data }, 200);
  }) satisfies RouteHandler<GetReimbursementRoleRoute>,

  createRole: (async (c) => {
    const body = c.req.valid("json");
    const data = await reimbursementService.createRole(body);
    return c.json({ success: true as const, data }, 201);
  }) satisfies RouteHandler<CreateReimbursementRoleRoute>,

  deleteRole: (async (c) => {
    const { id } = c.req.valid("param");
    await reimbursementService.deleteRole(id);
    return c.json({ success: true as const }, 200);
  }) satisfies RouteHandler<DeleteReimbursementRoleRoute>,

  // ===========================================================================
  // Reimbursement Type Categories
  // ===========================================================================

  listTypeCategories: (async (c) => {
    const query = c.req.valid("query");
    const result = await reimbursementService.listTypeCategories(query);
    return c.json(result, 200);
  }) satisfies RouteHandler<ListReimbursementTypeCategoriesRoute>,

  getTypeCategory: (async (c) => {
    const { id } = c.req.valid("param");
    const data = await reimbursementService.getTypeCategoryById(id);
    return c.json({ success: true as const, data }, 200);
  }) satisfies RouteHandler<GetReimbursementTypeCategoryRoute>,

  createTypeCategory: (async (c) => {
    const body = c.req.valid("json");
    const data = await reimbursementService.createTypeCategory(body);
    return c.json({ success: true as const, data }, 201);
  }) satisfies RouteHandler<CreateReimbursementTypeCategoryRoute>,

  deleteTypeCategory: (async (c) => {
    const { id } = c.req.valid("param");
    await reimbursementService.deleteTypeCategory(id);
    return c.json({ success: true as const }, 200);
  }) satisfies RouteHandler<DeleteReimbursementTypeCategoryRoute>,
};
