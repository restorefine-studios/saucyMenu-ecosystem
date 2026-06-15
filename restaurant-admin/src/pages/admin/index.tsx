/* eslint-disable @typescript-eslint/no-explicit-any */
import { Outlet, useNavigate } from 'react-router-dom'
import { AdminNavbar } from '@/components/AdminNavbar'
import { AppShell } from '@/components/AppShell'
import { axiosInstance } from '@/lib/utils'
import apiRoutes from '@/apiRoutes'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { authClient } from '@/lib/auth-client'

const Admin = () => {
  const [, setUser] = useAtom(userAtom)
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ['status'],
    queryFn: () => axiosInstance.get(apiRoutes.status).then(r => r.data),
  })

  useEffect(() => {
    authClient.getSession({
      fetchOptions: {
        onSuccess: (data: any) => setUser(data?.data?.user),
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

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <main className="pt-28">
          <Outlet />
        </main>
      </div>
    </AppShell>
  )
}

export default Admin
