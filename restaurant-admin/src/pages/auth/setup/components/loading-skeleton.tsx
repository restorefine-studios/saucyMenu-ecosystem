import { Skeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
  return (
    <div className="flex flex-1 gap-8 flex-col md:flex-row md:px-10 px-5 mx-auto w-full ">
      <div className="w-2/5">
        <Skeleton className="md:h-[600px] md:w-[508px] h-0 w-0 rounded-3xl overflow-hidden" />
      </div>
      <div className="w-full">
        <div className="mb-8">
          <Skeleton className="rounded-full inline-block px-16 py-6 overflow-hidden" />
        </div>
        <div className="flex flex-col md:mb-12 mb-6 gap-6">
          <Skeleton className="rounded-full w-1/3 inline-block px-16 py-3 overflow-hidden" />
          <Skeleton className="rounded-full w-1/3 inline-block px-16 py-3 overflow-hidden" />
        </div>
        <div className="grid md:grid-cols-2 gap-6 md:gap-12 md:mb-0 mb-8">
          <Skeleton className="rounded-xl pl-4 pr-10 inline-block px-16 md:py-11 py-8 overflow-hidden" />
          <Skeleton className="rounded-xl pl-4 pr-10 inline-block px-16 md:py-11 py-8 overflow-hidden" />
          <Skeleton className="rounded-xl pl-4 pr-10 inline-block px-16 md:py-11 py-8 overflow-hidden" />
          <Skeleton className="rounded-xl pl-4 pr-10 inline-block px-16 md:py-11 py-8 overflow-hidden" />
          <Skeleton className="rounded-xl pl-4 pr-10 inline-block px-16 md:py-11 py-8 overflow-hidden" />
          <Skeleton className="rounded-xl pl-4 pr-10 inline-block px-16 md:py-11 py-8 overflow-hidden" />
        </div>
      </div>
    </div>
  );
}

export default LoadingSkeleton;
