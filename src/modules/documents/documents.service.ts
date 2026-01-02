import { prisma } from "../../db.js";
import { NotFound, Forbidden } from "../../lib/errors.js";
import {
  calculatePagination,
  getPrismaSkipTake,
  type PaginatedResult,
} from "../../shared/utils/pagination.js";
import type { Document } from "../../generated/prisma/client.js";
import type {
  CreateDocumentInput,
  UpdateDocumentInput,
  DocumentQuery,
} from "./documents.validator.js";

export class DocumentsService {
  async list(userId: string, query: DocumentQuery): Promise<PaginatedResult<Document>> {
    const where = {
      userId,
      ...(query.type && { type: query.type }),
    };

    const [documents, totalItems] = await Promise.all([
      prisma.document.findMany({
        where,
        ...getPrismaSkipTake(query),
        orderBy: { createdAt: "desc" },
      }),
      prisma.document.count({ where }),
    ]);

    return {
      data: documents,
      meta: calculatePagination(query, totalItems),
    };
  }

  async getById(id: string, userId: string): Promise<Document> {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw NotFound("Document not found");
    }

    if (document.userId !== userId) {
      throw Forbidden("Access denied");
    }

    return document;
  }

  async create(userId: string, data: CreateDocumentInput): Promise<Document> {
    return prisma.document.create({
      data: {
        title: data.title,
        type: data.type,
        content: data.content ?? null,
        url: data.url ?? null,
        propertyId: data.propertyId ?? null,
        userId,
      },
    });
  }

  async update(id: string, userId: string, data: UpdateDocumentInput): Promise<Document> {
    const document = await this.getById(id, userId);

    // Build update data, converting undefined to skip and keeping explicit values
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.content !== undefined) updateData.content = data.content ?? null;
    if (data.url !== undefined) updateData.url = data.url ?? null;
    if (data.propertyId !== undefined) updateData.propertyId = data.propertyId ?? null;

    return prisma.document.update({
      where: { id: document.id },
      data: updateData,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const document = await this.getById(id, userId);

    await prisma.document.delete({
      where: { id: document.id },
    });
  }
}

export const documentsService = new DocumentsService();
