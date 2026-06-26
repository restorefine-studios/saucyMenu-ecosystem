/* eslint-disable @typescript-eslint/no-explicit-any */
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AdminNavbar } from '@/components/AdminNavbar'
import { BottomNav } from '@/components/BottomNav'
import { AppShell } from '@/components/AppShell'
import { axiosInstance } from '@/lib/utils'
import apiRoutes from '@/apiRoutes'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { authClient } from '@/lib/auth-client'
import { posthog } from '@/lib/posthog'

const Admin = () => {
  const [, setUser] = useAtom(userAtom)
  const navigate = useNavigate()
  const location = useLocation()

  const { data } = useQuery({
    queryKey: ['status'],
    queryFn: () => axiosInstance.get(apiRoutes.status).then(r => r.data),
  })

  const { data: subscriptionData, isLoading: subLoading } = useQuery({
    queryKey: ['subscriptionList'],
    queryFn: () => axiosInstance.get(apiRoutes.subscriptionList).then(r => r.data),
    staleTime: 60_000,
  })

  useEffect(() => {
    authClient.getSession({
      fetchOptions: {
        onSuccess: (data: any) => {
          const user = data?.data?.user
          setUser(user)
          if (user?.id) {
            posthog.identify(user.id, {
              email: user.email,
              restaurant_id: user.restaurant?.id,
              restaurant_name: user.restaurant?.name,
            })
            if (user.restaurant?.id) {
              posthog.group('restaurant', user.restaurant.id, {
                name: user.restaurant.name,
              })
            }
          }
        },
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if ((data as any)?.data?.suspended) {
      navigate('/')
      localStorage.removeItem('user')
    }
  }, [data, navigate])

  // Subscription gate — redirect to subscription page until they pay
  useEffect(() => {
    if (subLoading) return
    const isOnSubscriptionPage = location.pathname.startsWith('/admin/subscription')
    const hasActiveSubscription = (subscriptionData as any)?.data?.some(
      (item: any) => item.subscribed === true
    )
    if (!hasActiveSubscription && !isOnSubscriptionPage) {
      navigate('/admin/subscription', { replace: true })
    }
  }, [subLoading, subscriptionData, location.pathname, navigate])

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <main className="pt-0 md:pt-28 pb-24 md:pb-0">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </AppShell>
  )
}

export default Admin
