import Spinner from "@/components/Spinner";
import React from "react";

interface Props {
  children: React.ReactNode;
  title?: string;
  loading?: boolean;
}

function ScreenWrapper({ children, title, loading }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96 w-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="px-10 md:px-16 lg:px-24 pt-10 pb-8 max-w-7xl mx-auto">
      {title && (
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
      )}
      {children}
    </div>
  );
}

export default ScreenWrapper;
