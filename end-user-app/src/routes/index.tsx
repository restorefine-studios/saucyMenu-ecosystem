import { apiRoutes } from '@/api-routes'
import { userAtom } from '@/atoms/user'
import SpinnerLoader from '@/components/spinner'
import { axiosInstance } from '@/lib/utils'
import { posthog } from '@/lib/posthog'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useAtom } from 'jotai'
import { useEffect } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const router = useRouter()
  const { id } = Route.useSearch()
  const [, setUser] = useAtom(userAtom)
  const submitQrCode = async (data: any) => {
    const res = await axiosInstance.post(apiRoutes.verify, data)
    return res.data
  }

  const restaurantId = id ?? ''

  // const submit = async (token: string) => {
  //   const result = await verifyAndSetCookie(token);

  //   if (result.success) {
  //     // setUser(result);
  //     router.navigate({ to: "/setup" });
  //   } else {
  //     toast.warning("invalid qr code");
  //   }
  // };

  const { mutate: submitQrCodeMutation, isPending } = useMutation({
    mutationFn: submitQrCode,
    onSuccess: async (data) => {
      if (data?.success) {
        localStorage.setItem('saucy-user-token', data.data?.token)
        // Cookies.set("saucy-user-token", data.data?.token);
        setUser(data?.data)
        if (data.data?.sessionId) {
          posthog.identify(data.data.sessionId, { restaurant_id: restaurantId })
          posthog.capture('diner_session_started', { restaurant_id: restaurantId, entry: 'qr_id' })
        }
        // await submit(data.data?.token);
        router.navigate({ to: '/setup/welcome' })
      } else {
        toast.warning('invalid qr code')
      }
    },
  })
  // const handleSubmit = (data: string) => {
  //   submitQrCodeMutation({
  //     restaurantId: data,
  //   });
  // };
  // useEffect(() => {
  //   const token = localStorage.getItem("saucy-user-token");
  //   if (token) {
  //     redirect("/main");
  //   }
  // }, []);

  useEffect(() => {
    if (restaurantId) {
      submitQrCodeMutation({
        restaurantId: restaurantId,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId])

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-screen">
        <SpinnerLoader />
      </div>
    )
  }
  return <div></div>
}
