import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { apiRoutes } from '@/api-routes'
import { axiosInstance, renderMediaUrl } from '@/lib/utils'
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { useQueryState } from 'nuqs'
import _ from 'lodash'
import { Wrapper } from '@/components/wrapper'
import ScrollToTop from '@/components/scroll-to-top'
import { useTranslation } from 'react-i18next'
import Null from '@/components/null'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ChevronLeftIcon } from '@heroicons/react/24/solid'
import SpinnerLoader from '@/components/spinner'

export const Route = createFileRoute('/main/menus/items')({
  component: MenuItems,
})

function MenuItems() {
  const { t } = useTranslation()
  const [user] = useAtom(userAtom)
  const [searchVal, setSearchVal] = useQueryState('search')
  const [debSearch, setDebSearch] = useState('')
  const router = useRouter()
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const timeout = setTimeout(() => setDebSearch(searchVal || ''), 300)
    return () => clearTimeout(timeout)
  }, [searchVal])

  // Fetch all menus for pill data
  const { data: menus, isLoading: menusLoading } = useQuery<RestaurantMenus>({
    queryKey: ['menus'],
    queryFn: async () => {
      const res = await axiosInstance.get(apiRoutes.menus)
      return res.data
    },
  })

  // Infinite query for all menu items, sorted by menu
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['allMenuItems', debSearch],
      queryFn: async ({ pageParam = 0 }) => {
        const res = await axiosInstance.get(apiRoutes.menuItems, {
          params: {
            limit: 20,
            offset: pageParam,
            search: debSearch || undefined,
            // Backend needs to support fetching all items sorted by menu without menuId
          },
        })
        return res.data.data
      },
      getNextPageParam: (lastPage, allPages) => {
        const total = Number(lastPage.pagination.totalItems) ?? 0
        const loaded = allPages.flatMap((p) => p.data).length
        return loaded < total ? loaded : undefined
      },
      initialPageParam: 0,
    })

  const allMenuItems = data?.pages?.flatMap((page) => page?.result) ?? []

  // Group items by menuId
  const groupedItems = _.groupBy(allMenuItems, 'menuId')

  const menusToRender = selectedMenuId
    ? menus?.data.filter((m) => m.id === selectedMenuId)
    : menus?.data

  const loaderRef = useRef<HTMLDivElement | null>(null)

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
      if (loaderRef.current) observer.unobserve(loaderRef.current)
    }
  }, [fetchNextPage, hasNextPage])

  if (isLoading || menusLoading) {
    return (
      <Wrapper>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <SpinnerLoader />
        </div>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <div className="w-fit mb-4">
        <span
          onClick={() => router.navigate({ to: '/main/menus' })}
          className="flex flex-wrap items-center gap-1 text-sm cursor-pointer"
        >
          <ChevronLeftIcon className="size-4" />
          Back
        </span>
      </div>
      <div className="flex justify-between items-center">
        <div className="text-xl font-medium">{t('menuItems.title')} Menu</div>
      </div>

      <div className="mt-6 space-y-3">
        <Input
          placeholder="Search"
          className="h-12"
          onChange={(e) => setSearchVal(e.target.value)}
        />

        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {menus?.data.map((menu) => (
            <button
              key={menu.id}
              onClick={() => {
                setSelectedMenuId(menu.id)
                containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                selectedMenuId === menu.id
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {menu.name}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="overflow-y-scroll w-full h-full mt-6 divide-y divide-gray-200"
      >
        {!allMenuItems || allMenuItems.length < 1 ? (
          <Null />
        ) : (
          <div>
            {menusToRender?.map((menu) => {
              const items = groupedItems[menu.id] || []
              if (items.length === 0) return null
              return (
                <div key={menu.id} className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">{menu.name}</h3>
                  {items.map((item, index) => (
                    <Link
                      key={index}
                      to={`/main/food`}
                      params={{
                        itemId: item?.id,
                      }}
                      className="flex hover:cursor-pointer flex-1 gap-4 pb-5 w-full mt-4"
                    >
                      <div className="h-24 w-36">
                        <img
                          className="h-full w-full rounded-xl object-cover"
                          src={renderMediaUrl(item?.images[0]) ?? ''}
                          alt=""
                          height={200}
                          width={200}
                        />
                      </div>
                      <div className="flex flex-row justify-between w-full gap-3">
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
              )
            })}
          </div>
        )}
        <ScrollToTop />
        {hasNextPage && (
          <div
            ref={loaderRef}
            className="col-span-full text-center py-6 text-gray-500"
          >
            {isFetchingNextPage
              ? t('menuItems.loadingMessage.more')
              : t('menuItems.loadingMessage.scroll')}
          </div>
        )}
      </div>
    </Wrapper>
  )
}
