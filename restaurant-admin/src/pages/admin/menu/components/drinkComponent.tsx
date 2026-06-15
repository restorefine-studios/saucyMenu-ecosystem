/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderMediaUrl } from "@/lib/utils";
import _ from "lodash";

interface Props {
  data: Drink;
  handleClick: any;
}

const DrinkComponent = ({ data, handleClick }: Props) => {

  console.log("drta",data)
  return (
    <div
      onClick={handleClick}
      className="flex hover:cursor-pointer flex-1 gap-4 pb-5"
    >
      {/* left side */}
      <div className="h-24 w-[150px]">
        <img
          className="h-full w-full rounded-xl object-cover object-center "
          src={renderMediaUrl(data.images[0], "drink")}
          alt=""
        />
      </div>
      <div className="flex flex-row justify-between w-full gap-3">
        {/* middle side */}
        <div className=" space-y-3.5">
          <div className="gap-1">
            <p className="font-medium font-inter text-xl">{data?.name}</p>
            <p className="font-normal font-inter text-gray-400 text-sm capitalize">
              {_.truncate(data?.description ?? "", {
                length: 90,
              })}
            </p>
          </div>
          {/* <div className="flex gap-2.5 items-center">
            <div className="text-gray-300 flex items-center">
              <Eye size={14} />
              83
            </div>
            <div className="text-gray-300 flex items-center">
              <Star size={14} />
              4.3
            </div>
          </div> */}
        </div>
      </div>
      {/* <Modal open={open} setOpen={setOpen} title="Preview Drink" size="lg">
        <PreviewDrink selectedDrink={selectedDrink} />
      </Modal> */}
    </div>
  );
};

export default DrinkComponent;
