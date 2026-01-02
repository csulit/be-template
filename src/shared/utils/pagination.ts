import type { PaginationMeta } from "../dtos/pagination.dto.js";
import type { PaginationQuery } from "../validators/pagination.js";

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function calculatePagination(query: PaginationQuery, totalItems: number): PaginationMeta {
  const { page, pageSize } = query;
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function getPrismaSkipTake(query: PaginationQuery) {
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
}
