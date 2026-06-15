/* eslint-disable @typescript-eslint/no-explicit-any */
import { userAtom } from "@/atoms/user";
// import { Badge } from "@/components/ui/badge";
import { renderMediaUrl } from "@/lib/utils";
import { useAtom } from "jotai";
// import _ from "lodash";

interface Props {
  data: DishData;
  onclick: any;
}

const DishComponent = ({
  data: { description, name, price, images, tags },
  onclick,
}: Props) => {
  const [user] = useAtom(userAtom);

  console.log("data:",tags)

  return (
    <div
      onClick={onclick}
      className="flex hover:cursor-pointer flex-1 gap-4 pb-5"
    >
      {/* left side */}
      <div className="h-24 w-[150px]">
        <img
          className="h-full w-full rounded-xl object-cover object-center border"
          src={renderMediaUrl(images[0])}
          alt=""
        />
      </div>
      <div className="flex flex-row justify-between w-full gap-3">
        {/* middle side */}
        <div className=" space-y-3.5">
          <div className="gap-1">
            <p className="font-medium font-inter text-xl">{name}</p>
            <p className="font-normal font-inter text-gray-400 text-sm max-w-[300px] truncate">
              {description}
            </p>
          </div>
          <div className="flex gap-2.5 items-center">
            <div className="flex gap-1.5 flex-wrap items-center">
              {tags?.slice(0, 2).map((tag) => {
                const colorClasses = (() => {
                  switch (tag.type) {
                    case "diet":       
                      return "bg-green-100 text-emerald-600 ";
                    case "allergen":   
                      return "bg-[#caf0f8] text-[#457b9d]";
                    case "dish_type":  
                      return "bg-[#ffedd8] text-[#846552]";
                    case "cuisine":   
                      return "bg-rose-100 text-rose-600 ";
                    default:
                      return "bg-stone-100 text-stone-600 ";
                  }
                })();

                return (
                  <span
                    key={tag.id}
                    className={` ${ tag.name === "spicy" && "bg-red-100 text-red-600"  } inline-flex items-center rounded-md px-2 py-1 text-xs sm:text-sm capitalize ${colorClasses}`}
                  >
                    {tag.name}
                  </span>
                );
              })}

              {tags?.length > 2 && (
                <span
                  className="inline-flex items-center rounded-md px-2 py-1 text-xs sm:text-sm font-medium bg-stone-100 text-stone-700 border border-stone-200"
                  aria-label={`${tags.length - 2} more tags`}
                  title={`${tags.length - 2} more`}
                >
                  +{tags.length - 2}
                </span>
              )}
              </div>


            {/* <div className="text-gray-300 flex items-center">
              <Eye size={14} />
              83
            </div>
            <div className="text-gray-300 flex items-center">
              <Star size={14} />
              4.3
            </div> */}
          </div>
        </div>
        <div className="text-[#F7941D] text-2xl">
          {user?.currency?.symbol}
          {price}
        </div>
      </div>
    </div>
  );
};

export default DishComponent;
