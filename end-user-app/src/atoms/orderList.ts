import { atomWithStorage } from 'jotai/utils'
import type { OrderListItem } from '@/lib/orderList'

export const orderListAtom = atomWithStorage<OrderListItem[]>('orderList', [])
