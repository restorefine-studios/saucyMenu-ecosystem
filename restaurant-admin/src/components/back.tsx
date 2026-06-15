"use client";

import { ArrowLongLeftIcon } from "@heroicons/react/24/solid";

// import backIcon from "@/assets/back.svg";
import { useNavigate } from "react-router-dom";

const Back = ({ title }: { title: string }) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-3 mb-0">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center cursor-pointer"
      >
       <ArrowLongLeftIcon className="size-8 cursor-pointer hover:text-gray-400"/>
      </button>
      <span className="font-normal text-lg">{title}</span>
    </div>
  );
};

export default Back;
