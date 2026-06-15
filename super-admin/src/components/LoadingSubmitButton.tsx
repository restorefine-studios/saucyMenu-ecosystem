import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";

// reusable submit button with loader
export const LoadingSubmitButton = ({
  isLoading,
  canSubmit,
  label,
}: {
  isLoading: boolean;
  canSubmit: boolean;
  label: string;
}) => (
  <Button
    type="submit"
    disabled={!canSubmit || isLoading}
    className="w-full py-8 hover:bg-orange-500 hover:cursor-pointer text-white rounded-xl"
  >
    {isLoading ? (
      <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
    ) : (
      <>
        {label}
        <ArrowRight className="ml-2 h-4 w-4" />
      </>
    )}
  </Button>
);
