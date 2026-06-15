import { cn } from "@/lib/utils";
import { useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import Spinner from "@/components/Spinner";
import { useTranslation } from "react-i18next";
import { useMenuItems, useMenusAndSections } from "../../hooks/use-menu";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ItemCard } from "./item-card";
import { DataList } from "@/components/dataList";
import Paginator from "@/components/paginator";
import PreviewItem from "../preview";
import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/modal";
import type { ClassifiedMenuItems } from "../../types";
import { UtensilsCrossed } from "lucide-react";

function ItemList({ searchQuery }: { searchQuery: string }) {
  const { sectionId, menuId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [, setOffset] = useQueryState("offset", {
    defaultValue: 0,
    parse: Number,
  });

  const [selectedDish, setSelectedDish] = useState<DishData>();

  const { data: menusAndSectionsData, isLoading: isLoadingMenus } =
    useMenusAndSections();
  const { data, isLoading, isFetching } = useMenuItems(
    sectionId as string,
    searchQuery,
  );

  const menus = useMemo<ClassifiedMenuItems[]>(
    () => menusAndSectionsData?.data ?? [],
    [menusAndSectionsData?.data],
  );
  const selectedMenu = menuId
    ? menus.find((m) => m.id === menuId)
    : menus[0] ?? null;
  const sections = selectedMenu?.sections ?? [];

  // When we have menus but no menuId, navigate to first menu's first section (or items root for that menu)
  useEffect(() => {
    if (menus.length > 0 && !menuId) {
      const first = menus[0];
      const firstSectionId = first.sections?.[0]?.id;
      navigate(
        firstSectionId
          ? `/admin/menus/${first.id}/items/${firstSectionId}`
          : `/admin/menus/${first.id}/items`,
        { replace: true },
      );
    }
  }, [menus, menuId, navigate]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClickDish = (dish: any) => {
    setOpen(true);
    setSelectedDish(dish);
  };

  if (isLoadingMenus && menus.length === 0) return <Spinner />;
  if (isLoading || isFetching) return <Spinner />;

  if (menus.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-center">
        <h3 className="text-lg font-semibold text-amber-900">
          {t("admin.menu.dishes.emptyState.title")}
        </h3>
        <p className="mt-2 text-sm text-amber-800">
          {t("admin.menu.dishes.emptyState.description")}
        </p>
        <Button asChild className="mt-4 bg-[#F7941D] hover:bg-[#F7941D]/90 text-white">
          <Link to="/admin/menus">
            {t("admin.menu.dishes.emptyState.goToMenusAndSections")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Menu & section selector */}
      <div className="mb-6 space-y-4">
        {/* Menu selector */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t("admin.menu.dishes.menu", "Menu")}
          </span>
          <ScrollArea className="w-full overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {menus.map((menu) => (
                <button
                  type="button"
                  key={menu.id}
                  onClick={() => {
                    const firstSectionId = menu.sections?.[0]?.id;
                    navigate(
                      firstSectionId
                        ? `/admin/menus/${menu.id}/items/${firstSectionId}`
                        : `/admin/menus/${menu.id}/items`,
                    );
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-left transition-all whitespace-nowrap",
                    selectedMenu?.id === menu.id
                      ? "border-[#F7941D] bg-[#F7941D] text-white shadow-md hover:bg-[#F7941D] hover:border-[#F7941D]"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700",
                  )}
                >
                  <UtensilsCrossed className="size-4 shrink-0" />
                  <span className="font-medium capitalize">{menu.name}</span>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Section pills (only when a menu is selected) */}
        {selectedMenu && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t("admin.menu.dishes.section", "Section")}
            </span>
            <ScrollArea className="w-full overflow-x-hidden">
              <div className="flex gap-2 pb-4">
                <Button
                  className={cn(
                    "rounded-full px-5 py-2.5 cursor-pointer transition whitespace-nowrap",
                    !sectionId || sectionId === ""
                      ? "bg-[#F7941D] text-white hover:bg-[#F7941D] border-[#F7941D]"
                      : "border bg-gray-100 hover:bg-gray-200 text-black",
                  )}
                  onClick={() =>
                    navigate(`/admin/menus/${selectedMenu.id}/items`)
                  }
                >
                  {t("admin.menu.dishes.all")}
                </Button>
                {sections
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((section) => (
                    <Badge
                      className={cn(
                        "rounded-3xl px-6 py-2.5 cursor-pointer transition whitespace-nowrap capitalize",
                        sectionId === section.id
                          ? "bg-[#F7941D] text-white hover:bg-[#F7941D] border-[#F7941D]"
                          : "border bg-black/5 hover:bg-gray-200 text-black",
                      )}
                      key={section.id}
                      onClick={() => {
                        navigate(
                          `/admin/menus/${selectedMenu.id}/items/${section.id}`,
                        );
                      }}
                    >
                      {section.name}
                    </Badge>
                  ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}
      </div>
      <div className="mb-6 mt-4 border-gray-300">
        <DataList
          data={data?.data?.result ?? []}
          className="grid  lg:grid-cols-2 divide-y gap-x-16 space-y-5 mt-5"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          renderItem={(item: any) => (
            <ItemCard
              key={item.id}
              data={item}
              onclick={() => handleClickDish(item)}
            />
          )}
        />
        <Paginator
          totalItems={data?.data?.pagination?.total}
          limit={data?.data?.pagination.limit}
          offset={data?.data?.pagination.offset}
          hasNextPage={data?.data?.pagination?.hasNextPage}
          hasPreviousPage={data?.data?.pagination?.hasPreviousPage}
          onPageChange={(newOffset) => {
            setOffset(newOffset);
          }}
        />
      </div>

      <Modal
        open={open}
        setOpen={setOpen}
        title={t("admin.menu.dishes.modalTitle")}
        size="lg"
      >
        <PreviewItem selectedDish={selectedDish} />
      </Modal>
    </div>
  );
}

export default ItemList;
