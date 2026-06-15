import { apiRoutes } from '@/api-routes'
import { axiosInstance } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'

export const useBase = () => {
  const getBase = async () => {
    const res = await axiosInstance.get(apiRoutes.setup)
    return res.data
  }

  return useQuery<SetupResponse>({
    queryKey: ['base'],
    queryFn: getBase,
  })
}
