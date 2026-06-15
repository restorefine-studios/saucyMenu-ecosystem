/* eslint-disable @typescript-eslint/no-explicit-any */
import { userAtom } from "@/atoms/user"
import { Badge } from "@/components/ui/badge"
import { renderMediaUrl, axiosInstance } from "@/lib/utils"
import apiRoutes from "@/apiRoutes"
import { useAtom } from "jotai"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { useState } from "react"
import _ from "lodash"

type FeatureFlag = 'isChefsRecommended' | 'isPopular' | 'isNew' | 'isLimitedTime'

const CHIPS: { key: FeatureFlag; label: string }[] = [
  { key: 'isChefsRecommended', label: "Chef's" },
  { key: 'isPopular',          label: 'Popular' },
  { key: 'isNew',              label: 'New' },
  { key: 'isLimitedTime',      label: 'Limited' },
]

export const ItemCard = ({ data, onclick }: any) => {
  const [user] = useAtom(userAtom)
  const queryClient = useQueryClient()

  const [flags, setFlags] = useState<Record<FeatureFlag, boolean>>({
    isChefsRecommended: data?.isChefsRecommended ?? false,
    isPopular:          data?.isPopular ?? false,
    isNew:              data?.isNew ?? false,
    isLimitedTime:      data?.isLimitedTime ?? false,
  })

  const { mutate: toggleFlag } = useMutation({
    mutationFn: ({ key, value }: { key: FeatureFlag; value: boolean }) =>
      axiosInstance.put(apiRoutes.editMenuItem(data.id), { [key]: value }),
    onMutate: ({ key, value }) => {
      setFlags(prev => ({ ...prev, [key]: value }))
    },
    onError: (_err: any, { key, value }: { key: FeatureFlag; value: boolean }) => {
      setFlags(prev => ({ ...prev, [key]: !value }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] })
      queryClient.invalidateQueries({ queryKey: ['classifiedItems'] })
    },
  })

  const handleToggle = (e: React.MouseEvent, key: FeatureFlag) => {
    e.stopPropagation()
    toggleFlag({ key, value: !flags[key] })
  }

  return (
    <div
      className="flex flex-col justify-between border-b pb-4 gap-3"
      onClick={onclick}
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <img
            src={renderMediaUrl(data?.images !== null ? data?.images?.[0] : "")}
            alt="Food image"
            className="rounded-lg object-cover h-24 w-32"
          />
          <div>
            <h3 className="font-medium text-lg capitalize">
              {data.name ? data?.name?.toLowerCase() : "Not Found"}
            </h3>
            <p className="text-sm text-black/50">
              {_.truncate(data.description, { length: 50 })}
            </p>
            <div className="flex gap-2 mt-2">
              {data?.tags?.slice(0, 1)?.map((diet: any) => (
                <Badge
                  key={diet.id}
                  variant="outline"
                  className="bg-[#124F34] text-[#A2FFB4] hover:bg-green-700 rounded-sm">
                  {diet.name}
                </Badge>
              ))}
              {data?.allergens?.slice(0, 1)?.map((dish: any) => (
                <Badge
                  key={dish.id}
                  variant="outline"
                  className="bg-[#524026] text-[#FFE0A2] hover:bg-green-700 rounded-sm">
                  {dish.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-xl font-medium text-amber-500">
            {user?.currency?.symbol}{data.price}
          </p>
        </div>
      </div>

      {/* Feature toggle chips */}
      <div className="flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
        {CHIPS.map(chip => (
          <button
            key={chip.key}
            onClick={(e) => handleToggle(e, chip.key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              flags[chip.key]
                ? 'bg-[#F7941D] text-white border-[#F7941D]'
                : 'bg-white text-gray-500 border-gray-300 hover:border-[#F7941D]'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
