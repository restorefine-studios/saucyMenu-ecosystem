import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuLoaderProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  className?: string;
}

export function MenuLoader({
  size = "md",
  message = "Loading...",
  className,
}: MenuLoaderProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 p-6",
        className
      )}
    >
      <div className="relative">
        {/* Plate */}
        <div className="absolute inset-0 rounded-full border-4 border-gray-200 bg-white" />

        {/* Spinning loader */}
        <Loader2
          className={cn("animate-spin text-amber-600", sizeClasses[size])}
        />
      </div>
      {message && (
        <p className="text-center text-sm font-medium text-gray-600">
          {message}
        </p>
      )}
    </div>
  );
}
