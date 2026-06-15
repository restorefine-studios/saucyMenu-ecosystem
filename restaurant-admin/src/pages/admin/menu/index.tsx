import { useState } from "react";
import ScreenWrapper from "../components/screenWrapper";
import {  Search } from "lucide-react";
import { ArrowLongLeftIcon } from "@heroicons/react/24/solid";
import { Input } from "@/components/ui/input";

import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Dishes from "./components/Dishes";
import Drinks from "./components/Drinks";
import { useQueryState } from "nuqs";
import { useTranslation } from "react-i18next";

function Menu() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activePage, setActivePage] = useQueryState("tab", {
    defaultValue: "dishes",
  });

  const navigate = useNavigate()

  // console.log("ap", activePage);
  return (
    <ScreenWrapper
      title={t("admin.menu.topArea.header")}
      className={"overflow-x-hidden"}
    >
      <>
        <section className="flex items-center justify-between">
          <ArrowLongLeftIcon onClick={() => navigate(-1)} className="size-8 cursor-pointer hover:text-gray-400" />
          <div className="flex items-center gap-2.5">
            <div className="pl-4 pr-10 border border-gray-300 rounded-lg flex items-center">
              <Search size={18} className="items-center border-none " />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none focus:outline-none focus:ring-0"
                type="text"
                placeholder="Search"
              />
            </div>
            <Button
              asChild
              className="bg-[#F7941D] hover:cursor-pointer hover:bg-white hover:text-black hover:border capitalize"
            >
              <Link to={activePage !== "drinks" ? "add" : "add-drinks"}>
                {t("admin.menu.topArea.rightSide.add")} {activePage}
              </Link>
            </Button>
            <div className="bg-gray-200 w-fit h-auto p-1 rounded-lg flex gap-1">
              <Badge
                onClick={() => setActivePage("dishes")}
                className={`rounded-md px-5 py-2.5 cursor-pointer transition whitespace-nowrap capitalize ${
                  activePage === "dishes"
                    ? "bg-black text-white hover:bg-black"
                    : "border bg-transparent hover:bg-gray-200 text-black"
                }`}
              >
                { t("admin.menu.topArea.btns.dishes")}
              </Badge>
              <Badge
                onClick={() => setActivePage("drinks")}
                className={`rounded-md px-5 py-2.5 cursor-pointer transition whitespace-nowrap capitalize ${
                  activePage === "drinks"
                    ? "bg-black text-white hover:bg-black"
                    : "border bg-transparent hover:bg-gray-200 text-black"
                }`}
              >
                {t("admin.menu.topArea.btns.drinks")}
              </Badge>
            </div>
          </div>
        </section>

        <hr className="mb-6 mt-6 border-gray-300" />

        {activePage === "drinks" ? (
          <Drinks searchQuery={searchQuery} />
        ) : (
          <Dishes searchQuery={searchQuery} />
        )}
      </>
    </ScreenWrapper>
  );
}

export default Menu;
