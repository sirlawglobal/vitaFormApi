import { PaginatedResult } from '../dto/pagination.dto';

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return new PaginatedResult<T>(data, total, page, limit);
}

export function buildSortQuery(
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
  allowedFields?: string[],
): Record<string, 1 | -1> {
  const order = sortOrder === 'asc' ? 1 : -1;
  if (!sortBy) return { createdAt: -1 };
  if (allowedFields && !allowedFields.includes(sortBy)) {
    return { createdAt: -1 };
  }
  return { [sortBy]: order };
}
