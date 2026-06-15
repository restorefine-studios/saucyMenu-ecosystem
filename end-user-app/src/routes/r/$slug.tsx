import { userAtom } from '@/atoms/user'
import SpinnerLoader from '@/components/spinner'
import { axiosInstance, apiUrl } from '@/lib/utils'
import { posthog } from '@/lib/posthog'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useAtom } from 'jotai'
import { useEffect } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/r/$slug')({ component: SlugEntry })

function SlugEntry() {
  const router = useRouter()
  const { slug } = Route.useParams()
  const [, setUser] = useAtom(userAtom)

  // Step 1: resolve slug → restaurantId
  const resolveSlug = async () => {
    const res = await axiosInstance.get(`${apiUrl}r/${slug}`)
    return res.data
  }

  // Step 2: create diner session with restaurantId
  const createSession = async (restaurantId: string) => {
    const res = await axiosInstance.post(`${apiUrl}user/auth/session`, { restaurantId })
    return res.data
  }

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const slugData = await resolveSlug()
      if (!slugData?.data?.id) throw new Error('Restaurant not found')
      const session = await createSession(slugData.data.id)
      return { session, restaurantId: slugData.data.id }
    },
    onSuccess: ({ session: data, restaurantId }) => {
      if (data?.success) {
        localStorage.setItem('saucy-user-token', data.data?.token)
        setUser(data?.data)
        if (data.data?.sessionId) {
          posthog.identify(data.data.sessionId, { restaurant_id: restaurantId })
          posthog.capture('diner_session_started', { restaurant_id: restaurantId, entry: 'qr_slug' })
        }
        router.navigate({ to: '/setup/welcome' })
      } else {
        toast.warning('Invalid QR code')
      }
    },
    onError: () => {
      toast.error('Restaurant not found')
    },
  })

  useEffect(() => {
    if (slug) mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-screen">
        <SpinnerLoader />
      </div>
    )
  }

  return <div></div>
}
