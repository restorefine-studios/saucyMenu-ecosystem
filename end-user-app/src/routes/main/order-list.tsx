import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { orderListAtom } from '@/atoms/orderList'
import {
  clearOrderList,
  getOrderListLineTotal,
  getOrderListTotal,
  removeFromOrderList,
  setOrderListQuantity,
} from '@/lib/orderList'
import { renderMediaUrl } from '@/lib/utils'
import { ChevronLeft, ClipboardList, Minus, Plus, Trash2 } from 'lucide-react'

export const Route = createFileRoute('/main/order-list')({ component: OrderListPage })

function OrderListPage() {
  const router = useRouter()
  const [user] = useAtom(userAtom)
  const [orderList, setOrderList] = useAtom(orderListAtom)
  const total = getOrderListTotal(orderList)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.history.back()}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-base font-semibold text-gray-900">Your order list</h1>
      </div>

      {orderList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <ClipboardList className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">
            Your list is empty. Add dishes from the menu to show them to your server.
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {orderList.map(item => {
              const imageUrl = item.image ? renderMediaUrl(item.image) : null
              return (
                <div key={item.key} className="flex items-stretch gap-3 bg-white rounded-2xl border border-gray-100 p-3">
                  <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">🍽️</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                      {item.variantName && (
                        <p className="text-xs text-gray-500">{item.variantName}</p>
                      )}
                      {item.addons.length > 0 && (
                        <p className="text-xs text-gray-400 line-clamp-1">
                          {item.addons.map(a => a.name).join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 bg-gray-100 rounded-full px-1 py-1">
                        <button
                          onClick={() => setOrderList(list => setOrderListQuantity(list, item.key, item.quantity - 1))}
                          className="w-7 h-7 rounded-full bg-white flex items-center justify-center"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5 text-gray-700" />
                        </button>
                        <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => setOrderList(list => setOrderListQuantity(list, item.key, item.quantity + 1))}
                          className="w-7 h-7 rounded-full bg-white flex items-center justify-center"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5 text-gray-700" />
                        </button>
                      </div>

                      <span className="text-sm font-bold text-gray-900">
                        {user?.currency?.symbol}{getOrderListLineTotal(item).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setOrderList(list => removeFromOrderList(list, item.key))}
                    className="self-start text-gray-400"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-lg font-bold text-gray-900">
                {user?.currency?.symbol}{total.toFixed(2)}
              </span>
            </div>
            <button
              onClick={() => setOrderList(clearOrderList())}
              className="w-full border border-gray-200 text-gray-600 font-semibold rounded-full py-3 text-sm"
            >
              Clear list
            </button>
          </div>
        </>
      )}
    </div>
  )
}
