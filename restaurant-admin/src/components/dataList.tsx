import React from "react";
import MenuItemNotFound from "./empty-list";
import { cn } from "@/lib/utils";

type DataListProps<T> = {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
};

export function DataList<T>({
  data,
  renderItem,
  className,
  emptyState,
}: //   emptyState,
DataListProps<T>) {
  if (data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center">
        {" "}
        {emptyState ? emptyState : <MenuItemNotFound />}
      </div>
    );
    //   <div className="text-center text-gray-500 py-4">
    //     {emptyState || "No items to show"}
    //   </div>
  }

  return <div className={cn(className)}>{data.map(renderItem)}</div>;
}
