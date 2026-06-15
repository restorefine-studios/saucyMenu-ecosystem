import { Card, CardContent } from "@/components/ui/card";
import React from "react";

interface Props {
  children: React.ReactNode;
  title: string;
  loading?: boolean;
}

function ScreenWrapper({ children, title, loading }: Props) {
  if (loading)
    return (
      <div className="bg-gray-100 flex justify-center items-center h-screen w-full">
        <div className="flex flex-col items-center justify-center gap-4 p-6">
          <div className="w-6 h-6 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  return (
    <div className="w-full h-full bg-gray-100 p-4 flex flex-col gap-2 overflow-hidden">
      <Card className="md:mb-3.5 rounded-2xl h-20">
        <CardContent className="flex items-center justify-between px-6 ">
          <h1 className="text-2xl font-normal">{title}</h1>
          {/* <div className="flex items-center gap-4">
            <User className="h-6 w-6 fill-black hover:cursor-pointer" />
            <Bell className="h-6 w-6 fill-black hover:cursor-pointer" />
          </div> */}
        </CardContent>
      </Card>
      {children}
    </div>
  );
}

export default ScreenWrapper;
