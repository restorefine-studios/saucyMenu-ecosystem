import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ArrowLongLeftIcon } from "@heroicons/react/24/solid";
import { Input } from "@/components/ui/input";

import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

import { useTranslation } from "react-i18next";
import ScreenWrapper from "../../components/screenWrapper";
import ItemList from "./components/item-list";
import { useMenusAndSections } from "../hooks/use-menu";

function MenuItems() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { data: menusAndSectionsData } = useMenusAndSections();
  const hasMenusAndSections = useMemo(
    () => (menusAndSectionsData?.data?.length ?? 0) > 0,
    [menusAndSectionsData?.data],
  );

  return (
    <ScreenWrapper
      title={t("admin.menu.topArea.header")}
      className={"overflow-x-hidden"}
    >
      <>
        <section className="flex items-center justify-between">
          <ArrowLongLeftIcon
            onClick={() => navigate(-1)}
            className="size-8 cursor-pointer hover:text-gray-400"
          />
          <div className="flex items-center gap-2.5">
            <div className="pl-4 pr-10 border border-gray-300 rounded-lg flex items-center">
              <Search size={18} className="items-center border-none " />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none focus:outline-none focus:ring-0"
                type="text"
                placeholder={t(
                  "admin.menu.topArea.rightSide.searchPlaceholder"
                )}
              />
            </div>

            {hasMenusAndSections && (
              <Button
                asChild
                className="bg-[#F7941D] hover:cursor-pointer hover:bg-white hover:text-black hover:border capitalize"
              >
                <Link to={`add`}>{t("admin.menu.topArea.rightSide.add")}</Link>
              </Button>
            )}
          </div>
        </section>

        <hr className="mb-6 mt-6 border-gray-300" />

        {/* {activePage === "drinks" ? (
          <Drinks searchQuery={searchQuery} />
        ) : (
          <Dishes searchQuery={searchQuery} />
        )} */}
        <ItemList searchQuery={searchQuery} />
      </>
    </ScreenWrapper>
  );
}

export default MenuItems;
