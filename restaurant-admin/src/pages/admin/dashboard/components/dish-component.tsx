/* eslint-disable @typescript-eslint/no-explicit-any */
import { userAtom } from "@/atoms/user";
import { Badge } from "@/components/ui/badge";
import { useAtom } from "jotai";
import _ from "lodash";

export const DishComponent = ({
  title,
  description,
  price,
  image,
  diet,
  dishType,
}: any) => {
  const [user] = useAtom(userAtom);
  return (
    <div className="flex justify-between items-center border-b pb-4">
      <div className="flex gap-4">
        <img
          src={image}
          alt="Food image"
          width={80}
          height={80}
          className="rounded-lg object-cover"
        />
        <div>
          <h3 className="font-semibold text-xl">{title}</h3>
          <p className="text-sm text-gray-500">
            {_.truncate(description, {
              length: 50,
            })}
          </p>
          <div className="flex gap-2 mt-2">
            {diet?.slice(0, 1)?.map((diet: any) => (
              <Badge
                variant="outline"
                className="bg-[#124F34] text-[#A2FFB4] hover:bg-green-700  rounded-sm"
              >
                {diet.name}
              </Badge>
            ))}
            {dishType?.slice(0, 1)?.map((dish: any) => (
              <Badge
                variant="outline"
                className="bg-[#524026] text-[#FFE0A2] hover:bg-green-700  rounded-sm"
              >
                {dish.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <p className="text-xl font-medium text-amber-500">
          {user?.currency?.symbol}
          {price}
        </p>
        {/* <div className="flex items-center gap-2  text-sm">
        <div className="flex items-center gap-1">
          <Eye className="h-4 w-4  fill-gray-300 text-gray-100" />
          <span className="text-gray-300">21</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-300">★</span>
          <span className="text-gray-300">3.8</span>
        </div>
      </div> */}
      </div>
    </div>
  );
};
