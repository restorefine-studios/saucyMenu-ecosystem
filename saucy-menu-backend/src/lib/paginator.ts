import type { PgSelect, PgSelectBase } from 'drizzle-orm/pg-core';
import { t } from 'elysia';
// Universal select type that works with all databases
type AnySelect = PgSelect | PgSelectBase<any, any, any> | any;

export interface PaginationParams {
    offset?: number;
    limit?: number;
}

interface PaginatedResponse<T> {
    result: T;
    pagination: {
        offset: number;
        limit: number;
        total: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

/**
 * Universal pagination function for Drizzle ORM
 * Works with PostgreSQL, MySQL, and SQLite
 * 
 * @param query - Drizzle query builder instance
 * @param params - Pagination parameters (page and pageSize)
 * @returns Paginated response with data and metadata
 */


// export async function paginate<T extends AnySelect>(
//     query: T,
//     params: PaginationParams = {},
//     total: number
// ): Promise<PaginatedResponse<Awaited<T>>> {
//     const offset = Math.max(1, params.offset || 1);
//     const limit = Math.max(1, Math.min(params.limit || 10, 100)); // Max 100 items

//     // Get total count by cloning the query
//     //   const totalQuery = query.as('count_query');
//     //   const totalResult = await sql`SELECT COUNT(*) as count FROM ${totalQuery}`.execute();
//     //   const total = Number(totalResult[0].count);

//     // Get paginated data
//     const data = await query.limit(limit).offset(offset);



//     return {
//         result: data,
//         pagination: {
//             limit,
//             offset,
//             total,
//             hasNextPage: offset + limit < total,
//             hasPreviousPage: offset > 1,
//         },
//     };
// }

export const paginationResponse = <T>(result: T, total: number, limit: number, offset: number) => {
    return {
        result,
        pagination: {
            limit,
            offset,
            total,
            hasNextPage: offset + limit < total,
            hasPreviousPage: offset > 1,
        },
    };
}

export const paginationDto = t.Object({
    limit: t.Optional(t.Number()),
    offset: t.Optional(t.Number()),
});

