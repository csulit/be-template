import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { authMiddleware, type AuthEnv } from "../../middleware/auth.middleware.js";
import { ErrorResponseSchema } from "../../shared/dtos/response.dto.js";
import { documentsController } from "./documents.controller.js";
import { DocumentResponseSchema, DocumentListResponseSchema } from "./documents.dto.js";
import {
  CreateDocumentSchema,
  UpdateDocumentSchema,
  DocumentParamsSchema,
  DocumentQuerySchema,
} from "./documents.validator.js";

const app = new OpenAPIHono<AuthEnv>();

// GET /api/documents
const listDocumentsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Documents"],
  summary: "List documents",
  description: "Returns a paginated list of documents for the authenticated user",
  middleware: [authMiddleware] as const,
  request: {
    query: DocumentQuerySchema,
  },
  responses: {
    200: {
      description: "Document list",
      content: {
        "application/json": {
          schema: DocumentListResponseSchema,
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
  },
});

// GET /api/documents/:id
const getDocumentRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Documents"],
  summary: "Get document by ID",
  description: "Returns a single document by its ID",
  middleware: [authMiddleware] as const,
  request: {
    params: DocumentParamsSchema,
  },
  responses: {
    200: {
      description: "Document details",
      content: {
        "application/json": {
          schema: DocumentResponseSchema,
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
      description: "Document not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /api/documents
const createDocumentRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Documents"],
  summary: "Create document",
  description: "Creates a new document",
  middleware: [authMiddleware] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateDocumentSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Document created",
      content: {
        "application/json": {
          schema: DocumentResponseSchema,
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
  },
});

// PATCH /api/documents/:id
const updateDocumentRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Documents"],
  summary: "Update document",
  description: "Updates an existing document",
  middleware: [authMiddleware] as const,
  request: {
    params: DocumentParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: UpdateDocumentSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Document updated",
      content: {
        "application/json": {
          schema: DocumentResponseSchema,
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
      description: "Document not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// DELETE /api/documents/:id
const deleteDocumentRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Documents"],
  summary: "Delete document",
  description: "Deletes a document",
  middleware: [authMiddleware] as const,
  request: {
    params: DocumentParamsSchema,
  },
  responses: {
    200: {
      description: "Document deleted",
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(true) }),
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
      description: "Document not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Export route types for controller type safety
export type ListDocumentsRoute = typeof listDocumentsRoute;
export type GetDocumentRoute = typeof getDocumentRoute;
export type CreateDocumentRoute = typeof createDocumentRoute;
export type UpdateDocumentRoute = typeof updateDocumentRoute;
export type DeleteDocumentRoute = typeof deleteDocumentRoute;

// Register routes
app.openapi(listDocumentsRoute, documentsController.list);
app.openapi(getDocumentRoute, documentsController.getById);
app.openapi(createDocumentRoute, documentsController.create);
app.openapi(updateDocumentRoute, documentsController.update);
app.openapi(deleteDocumentRoute, documentsController.delete);

export { app as documentsRoutes };
