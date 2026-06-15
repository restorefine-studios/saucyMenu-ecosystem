import { FileX } from "lucide-react";

interface NoDataProps {
  pageName: string;
}

export default function NoData({ pageName }: NoDataProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <FileX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No {pageName} Found
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        There are currently no {pageName.toLowerCase()} to display.
      </p>
    </div>
  );
}
