import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useInfiniteDishes } from '@/hooks/dishes'
import { cn, renderMediaUrl } from '@/lib/utils'
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { useQueryState } from 'nuqs'
import _ from 'lodash'
import { Wrapper } from '@/components/wrapper'
import ScrollToTop from '@/components/scroll-to-top'
import { useTranslation } from 'react-i18next'
import Null from '@/components/null'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/main/food/')({ component: All })

function All() {
  const { t } = useTranslation()

  // const { data: dishTypes } = useDishTypes()
  const [user] = useAtom(userAtom)
  const [selected, setSelected] = useState('all')
  const [, setSearchVal] = useQueryState('search')
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading } =
    useInfiniteDishes({
      limit: 10,
      type: selected,
    })
  const dishes = data?.pages.flatMap((page) => page.data) ?? []

  const loaderRef = useRef<HTMLDivElement | null>(null)

  const showForYou = localStorage.getItem('menu-preference') === '1'
  // const selectedDishType = dishTypes?.data.find((item) => item?.id === selected)

  // Observe when the loader div enters the viewport
  useEffect(() => {
    if (!loaderRef.current || !hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage()
        }
      },
      { threshold: 1.0 },
    )

    observer.observe(loaderRef.current)

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (loaderRef.current) observer.unobserve(loaderRef.current)
    }
  }, [fetchNextPage, hasNextPage])

  return (
    <Wrapper>
      <div className="flex justify-between items-center">
        {/* <div
          onClick={() => navigate.back()}
          className="flex items-center gap-x-1"
        >
          <ChevronLeftIcon className="w-5 h-5 font-bold" />
          <span>Back</span>
        </div> */}

        <div className="text-xl font-medium">{t('foodMenu.title')}</div>

        {/* <Back title="See All Foods" /> */}
        {/* <Badge
          asChild
          variant={'outline'}
          className="bg-black text-[12px] text-white py-2 px-3"
        >
          <Link to={'/main/drinks'}>{t('foodMenu.headerBtn')}</Link>
        </Badge> */}
      </div>

      <div className="mt-6 space-y-3">
        <Input
          placeholder={t('foodMenu.searchPlaceholder')}
          className="h-12"
          onChange={(e) => setSearchVal(e.target.value)}
        />
        {/* Active Filters - Now handled server-side via user preferences */}
      </div>
      <div className="mt-6 flex items-center space-x-2 overflow-x-scroll no-scroll hide-scrollbar">
        <Badge
          className={cn(
            'rounded-4xl py-2 px-4 font-semibold',
            selected === 'all' ? 'bg-black' : 'bg-gray-200 text-black',
          )}
          onClick={() => setSelected('all')}
        >
          {t('foodMenu.all')}
        </Badge>
        {showForYou && (
          <Badge
            onClick={() => setSelected('personalized')}
            className={cn(
              'rounded-4xl py-2 px-4 font-semibold capitalize',
              selected === 'personalized'
                ? 'bg-linear-to-r from-[#FF0000] to-[#FF9500] '
                : 'bg-gray-200 text-black',
            )}
            // className="rounded-4xl py-2 px-4 font-bold bg-gradient-to-r from-[#FF0000] to-[#FF9500] "
          >
            {t('foodMenu.forYou')}
          </Badge>
        )}
        {/* {dishTypes?.data.map((item, index) => (
          <Badge
            key={index}
            className={cn(
              'rounded-4xl py-2 px-4 font-semibold capitalize',
              selected === item?.id ? 'bg-black' : 'bg-gray-200 text-black',
            )}
            onClick={() => setSelected(item?.id)}
          >
            <TranslateText>{item?.name}</TranslateText>
          </Badge>
        ))} */}
      </div>
      <div className="overflow-y-scroll w-full h-full mt-6 divide-y divide-gray-200">
        {isLoading || (!isLoading && dishes.length < 1) ? (
          <Null />
        ) : (
          <div>
            {/* {selectedDishType?.description && (
              <div className="grid py-3">
                <span className="text-lg capitalize font-medium">
                  {selectedDishType?.name}
                </span>
                <span className="text-sm text-gray-500">
                  <TranslateText>
                    {selectedDishType?.description ?? ''}
                  </TranslateText>
                </span>
              </div>
            )} */}
            {dishes?.map((item, index) => (
              <Link
                key={index}
                to={`/main/food`}
                params={{
                  itemId: item?.id,
                }}
                className="flex hover:cursor-pointer flex-1 gap-4 pb-5 w-full mt-4"
              >
                {/* left side */}
                <div className="h-24 w-[150px]">
                  <img
                    className="h-full w-full rounded-xl object-cover"
                    src={renderMediaUrl(item?.images[0]) ?? ''}
                    alt=""
                    height={200}
                    width={200}
                  />
                </div>
                <div className="flex flex-row justify-between w-full gap-3">
                  {/* right side */}
                  <div className=" space-y-3.5 w-full">
                    <div className="flex items-start justify-between">
                      <div className="gap-1 max-w-[75%]">
                        <p className="font-semibold text-[16px]  ">
                          {item?.name}
                        </p>
                        <p className="leading-4 text-gray-500 text-[12px]">
                          {_.truncate(item?.description ?? '', {
                            length: 50,
                          })}
                        </p>
                      </div>
                      <div className="text-[#F7941D] text-base font-bold">
                        {user?.currency.symbol}
                        {item?.price}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        <ScrollToTop />
        {hasNextPage && (
          <div
            ref={loaderRef}
            className="col-span-full text-center py-6 text-gray-500"
          >
            {isFetchingNextPage
              ? t('foodMenu.loadingMessage.more')
              : t('foodMenu.loadingMessage.scroll')}
          </div>
        )}
      </div>
    </Wrapper>
  )
}
