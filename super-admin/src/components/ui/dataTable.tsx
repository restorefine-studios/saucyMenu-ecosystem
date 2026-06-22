/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import Spinner from "../Spinner";

interface Props<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  searchKey?: string;
  headerItems?: React.ReactNode;
  filters?: React.ReactNode;
  searchOptions?: SearchOptions[];
  paginator?: Paginator;
  addButton?: React.ReactNode;
  handleAddClick?: any;
  filter?: any;
  loading?: boolean;
  setSearch?: (value: string) => void;
  search?: string;
}

type SearchOptions = {
  label: string;
  value: string;
};

type Paginator = {
  totalItems: number;
  next: boolean;
  prev: boolean;
  currentPage: boolean;
  lastPage: boolean;
};

const DataTable = ({ columns, data, loading }: Props<any>) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full">
      <div className="rounded-xl overflow-x-auto">
        <Table className="bg-white overflow-hidden">
          <TableHeader className="bg-gray-200 rounded-xl">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                className="rounded-xl bg-transparent"
                key={headerGroup.id}
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      className={`w-fit px-8 py-5 bg-transparent whitespace-nowrap ${
                        (header.column.columnDef.meta as { className?: string } | undefined)?.className ?? ""
                      }`}
                      key={header.id}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="" >
                <TableCell colSpan={columns.length}>
                  <div className="flex justify-center items-center py-10 w-full">
                    <Spinner />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="overflow-auto"
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      className={`w-fit px-8 whitespace-nowrap ${
                        (cell.column.columnDef.meta as { className?: string } | undefined)?.className ?? ""
                      }`}
                      key={cell.id}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-10 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DataTable;
