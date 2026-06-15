import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginatorProps {
  totalItems: number;
  limit: number;
  offset: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange?: (newOffset: number) => void;
}

export default function Paginator({
  totalItems,
  limit,
  offset,
  hasNextPage,
  hasPreviousPage,
  onPageChange = () => {},
}: PaginatorProps) {
  // Calculate current page and total pages
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalItems / limit);

  // Handle page changes
  const handlePrevious = () => {
    if (hasPreviousPage) {
      onPageChange(offset - limit);
    }
  };

  const handleNext = () => {
    if (hasNextPage) {
      onPageChange(offset + limit);
    }
  };

  return (
    <Pagination className="pr-4 pb-4 w-full justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePrevious();
            }}
            aria-disabled={!hasPreviousPage}
            className={!hasPreviousPage ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>

        <PaginationItem>
          <PaginationLink>
            {currentPage} / {totalPages}
          </PaginationLink>
        </PaginationItem>

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleNext();
            }}
            aria-disabled={!hasNextPage}
            className={!hasNextPage ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
