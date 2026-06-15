import { apiRoutes } from '@/api-routes'
import { axiosInstance } from '@/lib/utils'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useQueryState } from 'nuqs'
import { useDebounceValue } from 'usehooks-ts'

export const useDishes = ({
  limit,
  offset,
  type,
}: {
  limit: number
  offset: number
  type: string
}) => {
  // const [type] = useQueryState('dishType')
  // const [limit] = useQueryState('limit')
  // const [offset] = useQueryState('offset')
  const [search] = useQueryState('search')

  const [debSearch] = useDebounceValue(search, 1500)
  const getDishes = async () => {
    const dishTypeId = !['personalized', 'all'].includes(type) && {
      tagIds: type,
    }
    const res = await axiosInstance.get(
      type === 'personalized' ? apiRoutes.personalizedMenu : apiRoutes.dishes,
      {
        params: {
          ...dishTypeId,
          search: debSearch,
          limit,
          offset,
        },
      },
    )
    return res.data
  }

  return useQuery<DishResponse>({
    queryKey: ['dishes', type, debSearch, limit, offset],
    queryFn: getDishes,
    enabled: !!limit,
  })
}

export const useInfiniteDishes = ({
  limit,
  type,
}: {
  limit: number
  type: string
}) => {
  const [search] = useQueryState('search')
  const [debSearch] = useDebounceValue(search, 1500)

  // Note: Filtering is now handled server-side via user preferences API
  return useInfiniteQuery<DishResponse>({
    queryKey: ['dishes', type, debSearch],
    queryFn: async ({ pageParam = 0 }) => {
      const dishTypeId = !['personalized', 'all'].includes(type)
        ? { tagIds: type }
        : {}
      const res = await axiosInstance.get(
        type === 'personalized' ? apiRoutes.personalizedMenu : apiRoutes.dishes,
        {
          params: {
            ...dishTypeId,
            search: debSearch,
            limit,
            offset: pageParam,
          },
        },
      )
      return res.data
    },
    getNextPageParam: (lastPage, allPages) => {
      // Return the next offset if there are more results
      const total = Number(lastPage.pagination.totalItems) ?? 0
      const loaded = allPages.flatMap((p) => p.data).length
      return loaded < total ? loaded : undefined
    },
    initialPageParam: 0,
    enabled: !!limit,
  })
}
// export const useDishTypes = () => {
//     const getDishTypes = async () => {
//         const res = await axiosInstance.get(apiRoutes.dishTags, {
//             params: {
//                 type: 'dish_type'
//             }
//         });
//         return res.data;
//     };

//     return useQuery<DishTypeResponse>({
//         queryKey: ["dishTypes"],
//         queryFn: getDishTypes,
//     })
// };

export const useMenuSections = (menuId: string) => {
  const getMenuSections = async () => {
    const res = await axiosInstance.get(`${apiRoutes.menuSections}/${menuId}`)
    return res.data
  }

  return useQuery({
    queryKey: ['menuSections', menuId],
    queryFn: getMenuSections,
  })
}

export const useDrinkTypes = () => {
  const getDishTypes = async () => {
    const res = await axiosInstance.get(apiRoutes.dishTags, {
      params: {
        type: 'drink_type',
      },
    })
    return res.data
  }

  return useQuery<DishTypeResponse>({
    queryKey: ['drinkTypes'],
    queryFn: getDishTypes,
  })
}

export const useDish = (id: string) => {
  const getDish = async () => {
    const res = await axiosInstance.get(`${apiRoutes.menuItems}/${id}`)
    return res.data
  }

  return useQuery<{
    data: DishViewItem
  }>({
    queryKey: ['dish', id],
    queryFn: getDish,
  })
}

export const useInfiniteDrinks = ({
  limit,
  type,
}: {
  limit: number
  type: string
}) => {
  const tagIds = !['all'].includes(type) ? { tagIds: type } : {}
  const [search] = useQueryState('search')
  const [debSearch] = useDebounceValue(search, 1500)

  return useInfiniteQuery<DrinkListResponse>({
    queryKey: ['drinks', type, debSearch],
    getNextPageParam: (lastPage, allPages) => {
      // Return the next offset if there are more results
      const total = Number(lastPage?.pagination?.totalItems) ?? 0
      const loaded = allPages.flatMap((p) => p.data).length
      return loaded < total ? loaded : undefined
    },
    queryFn: async ({ pageParam = 0 }) => {
      const res = await axiosInstance.get(apiRoutes.drinks, {
        params: {
          ...tagIds,
          search: debSearch,
          limit,
          offset: pageParam,
        },
      })
      return res.data
    },
    initialPageParam: 0,
    enabled: !!limit,
  })
}

export const useDrinks = () => {
  return useQuery<DrinkListResponse>({
    queryKey: ['sub-drinks'],
    queryFn: async () => {
      const res = await axiosInstance.get(apiRoutes.drinks, {
        params: {
          limit: 5,
          offset: 0,
        },
      })
      return res.data
    },
  })
}
