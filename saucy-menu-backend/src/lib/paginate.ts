type PaginateOptions = {
    limit: number;
    offset: number;
    totalItems: number;
};

type PaginatedResult<T> = {
    data: T[];
    pagination: {
        totalItems: number;
        limit: number;
        offset: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
};

export function paginate<T>(
    items: T[],
    { limit = 10, offset = 0, totalItems }: PaginateOptions
): PaginatedResult<T> {
    return {
        data: items?.length > 0 ? items.slice(offset, offset + limit) : [],
        pagination: {
            totalItems: Number(totalItems),
            limit,
            offset,
            hasNextPage: offset + limit < totalItems,
            hasPreviousPage: offset > 0,
        },
    };
}
