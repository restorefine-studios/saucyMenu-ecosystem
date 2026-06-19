import { apiRoutes } from '@/api-routes'
import { userAtom } from '@/atoms/user'
import SpinnerLoader from '@/components/spinner'
import { axiosInstance } from '@/lib/utils'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { QrCode, Trash2 } from 'lucide-react'
import { QrScanner } from '@/components/QrScanner'
import {
  getVisitedRestaurants,
  removeVisitedRestaurant,
  type VisitedRestaurant,
} from '@/lib/visitedRestaurants'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === 'string' ? search.id : undefined,
  }),
  component: Home,
})

function Home() {
  const router = useRouter()
  const { id } = Route.useSearch()
  const [, setUser] = useAtom(userAtom)
  const [restaurants, setRestaurants] = useState<VisitedRestaurant[]>([])
  const [scanning, setScanning] = useState(false)

  // Legacy support for QR codes printed before slugs existed (?id=<restaurantId>)
  const { mutate: legacyVerify, isPending: legacyPending } = useMutation({
    mutationFn: async (restaurantId: string) => {
      const res = await axiosInstance.post(apiRoutes.verify, { restaurantId })
      return res.data
    },
    onSuccess: (data) => {
      if (data?.success) {
        localStorage.setItem('saucy-user-token', data.data?.token)
        setUser(data?.data)
        router.navigate({ to: '/setup/welcome' })
      }
    },
  })

  useEffect(() => {
    if (id) {
      legacyVerify(id)
      return
    }
    const list = getVisitedRestaurants()
    setRestaurants(list)
    if (list.length === 0) setScanning(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (id) {
    return (
      <div className="flex justify-center items-center h-screen">
        {legacyPending && <SpinnerLoader />}
      </div>
    )
  }

  const goToRestaurant = (slug: string) => {
    router.navigate({ to: '/r/$slug', params: { slug } })
  }

  const handleScan = (slug: string) => {
    setScanning(false)
    goToRestaurant(slug)
  }

  const handleRemove = (slug: string) => {
    removeVisitedRestaurant(slug)
    setRestaurants(getVisitedRestaurants())
  }

  if (scanning) {
    return (
      <QrScanner
        onScan={handleScan}
        onClose={() => restaurants.length > 0 && setScanning(false)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-6 pt-2">
        <h1 className="text-xl font-bold text-gray-900">Your Restaurants</h1>
        <button
          onClick={() => setScanning(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-full shadow"
        >
          <QrCode className="h-4 w-4" />
          Scan
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {restaurants.map((r) => (
          <div
            key={r.slug}
            className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform"
          >
            <button
              onClick={() => goToRestaurant(r.slug)}
              className="w-full text-left"
            >
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                {r.image ? (
                  <img
                    src={r.image}
                    alt={r.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <QrCode className="h-10 w-10 text-gray-300" />
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {r.name}
                </p>
              </div>
            </button>
            <button
              onClick={() => handleRemove(r.slug)}
              className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow"
            >
              <Trash2 className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
