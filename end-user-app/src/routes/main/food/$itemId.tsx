import { userAtom } from '@/atoms/user'
import { useDish } from '@/hooks/dishes'
import { axiosInstance, renderMediaUrl } from '@/lib/utils'
import { useAtom } from 'jotai'
import { TextArea } from '@/components/ui/input'
import { StarRating } from '@/components/star-rating'
import _ from 'lodash'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { apiRoutes } from '@/api-routes'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ChevronLeftIcon,
  StarIcon,
  ClockIcon,
  // SparklesIcon,
} from '@heroicons/react/24/solid'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import SpiceLevel from '@/components/spice-level'
import SpinnerLoader from '@/components/spinner'
import saucyChat from '/saucychat-logo.svg'

export const Route = createFileRoute('/main/food/$itemId')({
  component: ViewDish,
  validateSearch: (search: {
    menuId?: string
    categoryItem?: boolean | undefined
  }) => {
    return {
      menuId: search.menuId,
      categoryItem: search.categoryItem,
    }
  },
})

function ViewDish() {
  const { itemId } = Route.useParams()
  const { menuId, categoryItem } = Route.useSearch()
  const [user] = useAtom(userAtom)
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [translateY, setTranslateY] = useState(-48) // Default -mt-12 equivalent
  const { t } = useTranslation()
  const imageRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { data, isLoading } = useDish(itemId)

  // Calculate discount and check if active
  const calculateDiscount = () => {
    const item = data?.data as any
    if (!item?.discountType || !item?.discountValue) return null

    const now = new Date()
    const startDate = item.discountStartAt
      ? new Date(item.discountStartAt)
      : null
    const endDate = item.discountEndAt ? new Date(item.discountEndAt) : null

    // Check if discount is currently active
    const isActive =
      (!startDate || now >= startDate) && (!endDate || now <= endDate)

    if (!isActive) return null

    const originalPrice = parseFloat(item.price || '0')
    let discountedPrice = originalPrice

    if (item.discountType === 'percentage') {
      const discountAmount =
        (originalPrice * parseFloat(item.discountValue)) / 100
      discountedPrice = originalPrice - discountAmount
    } else if (item.discountType === 'fixed') {
      discountedPrice = originalPrice - parseFloat(item.discountValue)
    }

    return {
      originalPrice,
      discountedPrice: Math.max(0, discountedPrice),
      discountValue: item.discountValue,
      discountType: item.discountType,
      discountLabel: item.discountLabel,
      startDate,
      endDate,
    }
  }

  const discountInfo = calculateDiscount()

  const submitReview = async () => {
    const res = await axiosInstance.post(apiRoutes.review, {
      rating: stars,
      comment: comment,
      reviewableId: itemId,
      reviewableType: 'dish',
    })
    return res.data
  }

  const { mutate: submitReviewMutation, isPending } = useMutation({
    mutationFn: submitReview,
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(t('foodProfile.toast.success'))
        setComment('')
      } else {
        toast.warning(t('foodProfile.toast.warning'))
      }
    },
  })

  // const [currentImageIndex] = useState(0);

  // const goToPrevious = () => {
  //   setCurrentImageIndex((prevIndex) =>
  //     prevIndex === 0 ? data!.data.images.length - 1 : prevIndex - 1
  //   );
  // };

  // const goToNext = () => {
  //   setCurrentImageIndex((prevIndex) =>
  //     prevIndex === data!.data.images.length - 1 ? 0 : prevIndex + 1
  //   );
  // };

  if (isLoading || !data?.data)
    return (
      <div className="flex justify-center items-center h-screen">
        <SpinnerLoader />
      </div>
    )

  // if (!data?.data) return null
  return (
    <main className="px-0 py-0">
      {/* <Back title="Food Profile" /> */}
      {/* <Card className="p-0 rounded-3xl border-0 overflow-hidden relative"> */}
      <section ref={imageRef} className="w-full mt-0 rounded-4xl">
        <div className="text-[22px] mb-0 font-medium hidden">
          {t('foodProfile.title')}
        </div>
        <div>
          {/* {data?.data.images.length >= 1 && ( */}
          <div>
            <div className="p-0 border-0 overflow-hidden relative h-[60vh]">
              <img
                src={renderMediaUrl(data?.data?.images[0]) ?? ''}
                alt={data?.data?.name}
                className="w-full h-full object-cover"
              />
              {/* <Link
                    to={''}
                    className="hidden absolute top-3 left-3 z-20"
                  >
                    <div className="border border-white/30 rounded-3xl text-white font-medium text-sm bg-black from-[#FF0000] to-[#FFA100] w-fit h-auto p-3 px-5 flex items-center gap-x-2">
                      <TranslateText>Ask anything</TranslateText>{' '}
                      <SparklesIcon className="size-4 text-white" />{' '}
                    </div>
                  </Link> */}

              <section className="w-full absolute z-20 top-5 px-6">
                <div className="w-full flex flex-wrap items-center justify-between gap-4">
                  <div
                    onClick={() =>
                      router.navigate({
                        to: categoryItem
                          ? '/main/menus'
                          : '/main/menus/$menuId',
                        params: { menuId: menuId as string },
                      })
                    }
                    className="bg-accent rounded-full w-fit px-4 h-10 mix-blend-plus-darker flex items-center justify-center gap-1 text-sm shrink-0 cursor-pointer text-black/50 dark:text-gray-200"
                  >
                    <ChevronLeftIcon className="size-4" />
                    <span>{t('common.back')}</span>
                  </div>

                  <button
                    onClick={() =>
                      router.navigate({
                        to: '/main/chat/$itemId',
                        params: { itemId: itemId as string },
                        search: {
                          item: data?.data,
                          menuId: menuId as string,
                        },
                      })
                    }
                    className="
                        glow-pulse
                        bg-black/50 backdrop-blur-md
                        text-white
                        border  border-orange-400
                        rounded-full
                        px-4 h-10
                        text-sm font-normal
                        flex items-center justify-center gap-2

                        shadow-[0_0_4px_rgba(249,115,22,0.6),0_0_20px_rgba(249,115,22,0.4)]
                      "
                  >
                    <img src={saucyChat} alt="Saucy Chat" className="size-5" />
                    {/* <SparklesIcon className="text-white size-4" /> */}
                    {t('foodProfile.askSaucyChat')}
                  </button>
                </div>
              </section>
            </div>
          </div>
          {/* // ) 
          // : (
          //   <img
          //     src={renderMediaUrl('') ?? ''}
          //     alt={data?.data?.name}
          //     className="w-full h-full object-cover rounded-3xl border border-black/10"
          //   />
          // )
          // } */}
        </div>
      </section>
      <motion.div
        drag="y"
        dragConstraints={{
          top: imageRef.current ? -(imageRef.current.offsetHeight * 0.7) : -200,
          bottom: 0,
        }}
        onDragEnd={(_, info) => {
          const imageHeight = imageRef.current?.offsetHeight || 400
          const shouldSnapUp = info.offset.y < -50
          setTranslateY(shouldSnapUp ? -(imageHeight * 0.7) : -48)
        }}
        style={{ y: translateY }}
        className="relative z-50 bg-white dark:bg-black border border-t-black/30 rounded-t-3xl overflow-hidden"
      >
        <div className="w-full flex justify-center mt-3">
          {' '}
          <span className="bg-gray-200 w-16 h-2 rounded-full"></span>
        </div>
        <div className="p-6 space-y-8">
          {/* Header: Name, Price */}

          <div className="w-full flex justify-between items-start ">
            <div className="flex-1">
              <div className="flex gap-2 justify-between items-start">
                <h2 className="capitalize text-xl font-medium">
                  {data?.data?.name}
                </h2>
                <div className="flex flex-col items-end gap-1">
                  {discountInfo ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-lg text-gray-400 line-through">
                          {user?.currency?.symbol}
                          {discountInfo.originalPrice.toFixed(2)}
                        </span>
                        <span className="text-2xl text-[#F7941D] font-medium">
                          {user?.currency?.symbol}
                          {discountInfo.discountedPrice.toFixed(2)}
                        </span>
                      </div>
                      {discountInfo.discountLabel && (
                        <span className="text-sm bg-[#F7941D]  px-2 py-1 rounded-full">
                          {discountInfo.discountLabel}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-2xl text-[#F7941D] font-medium">
                      {user?.currency?.symbol}
                      {data?.data?.price}
                    </span>
                  )}
                </div>
              </div>
              {discountInfo && discountInfo.endDate && (
                <p className="text-sm text-gray-500 mt-1">
                  {t('foodProfile.discount.validUntil')}{' '}
                  {discountInfo.endDate.toLocaleDateString()}
                </p>
              )}
              <p className="w-full text-base font-light text-black/50 dark:text-white/50 leading-relaxed mt-1">
                {data?.data?.description ?? ''}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-3">
            <div className="bg-accent rounded-full px-4 py-2 font-light text-sm flex items-center gap-2">
              <ClockIcon className="w-4 h-4 " />
              {data?.data?.cookTime
                ? `${data.data.cookTime} ${t('common.mins')}`
                : t('foodProfile.timeUnspecified')}
            </div>
            <div className="bg-accent rounded-full px-4 py-2 font-light text-sm flex items-center gap-2">
              <StarIcon className="w-4 h-4 text-[#F7941D]" />
              {data?.data?.averageRating
                ? Math.round(data.data.averageRating * 10) / 10
                : 0}
            </div>
          </div>

          {/* Add-ons */}
          {(data.data as any).addons &&
            (data.data as any).addons.length > 0 && (
              <div className="bg-gray-50 dark:bg-black/50 rounded-xl p-3 border border-gray-200">
                <h3 className="ttext-lg font-medium mb-2 dark:text-gray-200">
                  {t('foodProfile.addons')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(data.data as any).addons.map((addon: any) => (
                    <div
                      key={addon.id}
                      className="inline-flex items-center gap-2 bg-white dark:bg-black/50 rounded-lg px-3 py-1.5 border border-gray-200 text-sm hover:border-orange-300 transition-colors"
                    >
                      <span className="capitalize text-gray-800 dark:text-gray-200 font-light">
                        {addon.name}
                      </span>
                      <span className="text-[#F7941D] dark:text-orange-400 font-medium">
                        {user?.currency?.symbol}
                        {addon.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Variants */}
          {(data.data as any).variants &&
            (data.data as any).variants.length > 0 && (
              <div className="bg-gray-50 dark:bg-black/50 rounded-xl p-3 border border-gray-200">
                <h3 className="text-lg font-medium mb-2 dark:text-gray-200">
                  {t('foodProfile.variants')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(data.data as any).variants.map((variant: any) => (
                    <div
                      key={variant.id}
                      className={`inline-flex items-center gap-2 bg-white dark:bg-black/50 rounded-lg px-3 py-1.5 border text-sm transition-colors ${
                        variant.isAvailable
                          ? 'border-gray-200 hover:border-orange-300'
                          : 'border-gray-100 opacity-60'
                      }`}
                    >
                      <span className="capitalize text-gray-800 dark:text-gray-200 font-normal">
                        {variant.name}
                      </span>
                      {!variant.isAvailable && (
                        <span className="text-sm bg-gray-200 dark:bg-gray-800 text-gray-600 px-1.5 py-0.5 rounded">
                          Unavailable
                        </span>
                      )}
                      <span
                        className={`font-semibold ${
                          variant.isAvailable
                            ? 'text-[#F7941D] dark:text-orange-400'
                            : 'text-gray-400 line-through'
                        }`}
                      >
                        {user?.currency?.symbol}
                        {variant.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {data.data.ingredients &&
              data.data.ingredients.filter((i) => i.trim() !== '').length >
                0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2 dark:text-gray-200">
                    {t('foodProfile.details.ingredients')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.data.ingredients.map((item, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-2 bg-[#FFEAD0]  text-[#524026] px-2.5 py-1 rounded-md text-sm font-light capitalize"
                      >
                        <div className="w-1 h-1 bg-[#F7941D] dark:bg-orange-400 rounded-full shrink-0"></div>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            {data?.data?.spiceLevel && (
              <div>
                <h3 className="text-lg font-medium mb-2 dark:text-gray-200">
                  {t('foodProfile.details.spice')}
                </h3>
                <SpiceLevel level={data.data.spiceLevel} />
              </div>
            )}
            {!_.isEmpty(data.data?.tags) && (
              <div>
                <h3 className="text-lg font-medium mb-2 dark:text-gray-200">
                  {t('foodProfile.details.diets')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.data.tags.map((item: any, index: number) => (
                    <span
                      key={item?.id || index}
                      className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900 dark:text-green-200 border border-green-200 text-green-700 px-2.5 py-1 rounded-md text-sm font-light capitalize"
                    >
                      <div className="w-1 h-1 bg-green-500 dark:bg-green-400 rounded-full shrink-0"></div>
                      {item?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(data.data as any)?.allergens &&
              Array.isArray((data.data as any).allergens) &&
              (data.data as any).allergens.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2 dark:text-gray-200">
                    {t('foodProfile.details.allergens')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(data.data as any).allergens.map((allergen: any) => (
                      <span
                        key={allergen?.id}
                        className="inline-flex items-center gap-2 bg-red-50 dark:bg-red-900 dark:text-red-200 border border-red-200 text-red-700 px-2.5 py-1 rounded-md text-sm font-light capitalize"
                      >
                        <div className="w-1 h-1 bg-red-500 dark:bg-red-400 rounded-full shrink-0"></div>
                        {allergen?.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
          {/* {!_.isEmpty(data.data?.diets) && (
        <div className="mt-5 ">
          <p className="font-semibold">Diets</p>
          <ul className="list-disc list-inside grid grid-cols-3">
            {data?.data?.diets.map((item, index) => (
              <li key={index}>{item?.diet.name}</li>
            ))}
          </ul>
        </div>
      )} */}
          {/* {!_.isEmpty(data.data?.dishTypes) && (
        <div className="mt-5 ">
          <p className="font-semibold">Dish Types</p>
          <ul className="list-disc list-inside grid grid-cols-3">
            {data?.data?.dishTypes.map((item, index) => (
              <li key={index}>{item?.dishType.name}</li>
            ))}
          </ul>
        </div>
      )} */}
          {/* Review Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-2 dark:text-gray-200">
              {t('foodProfile.review.rate')} {data?.data?.name}
            </h3>
            <StarRating
              initialRating={stars}
              onChange={(val: number) => setStars(val)}
              totalStars={5}
            />
            {stars >= 1 && (
              <>
                <label className="text-base font-semibold mt-4 block">
                  {t('foodProfile.review.review')}
                </label>
                <TextArea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="mt-2 h-20"
                />
                <Button
                  loading={isPending}
                  className="mt-4 w-full"
                  onClick={() => submitReviewMutation()}
                >
                  {t('foodProfile.review.submit')}
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </main>
  )
}
