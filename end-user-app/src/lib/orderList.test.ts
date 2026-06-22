import { describe, it, expect } from 'vitest'
import {
  addToOrderList,
  buildOrderListKey,
  clearOrderList,
  getOrderListItemCount,
  getOrderListItemQuantity,
  getOrderListLineTotal,
  getOrderListTotal,
  removeFromOrderList,
  setOrderListQuantity,
  type OrderListItem,
} from './orderList'

describe('buildOrderListKey', () => {
  it('builds a stable key from itemId only when no variant/addons', () => {
    expect(buildOrderListKey('item-1')).toBe('item-1::')
  })

  it('includes the variant id', () => {
    expect(buildOrderListKey('item-1', 'variant-a')).toBe('item-1::variant-a')
  })

  it('sorts addon ids so order does not matter', () => {
    const a = buildOrderListKey('item-1', undefined, [
      { id: 'b', name: 'B', price: 1 },
      { id: 'a', name: 'A', price: 1 },
    ])
    const b = buildOrderListKey('item-1', undefined, [
      { id: 'a', name: 'A', price: 1 },
      { id: 'b', name: 'B', price: 1 },
    ])
    expect(a).toBe(b)
  })
})

describe('addToOrderList', () => {
  it('adds a new line with the given quantity', () => {
    const result = addToOrderList([], { itemId: 'item-1', name: 'Burger', basePrice: 10 }, 2)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ itemId: 'item-1', name: 'Burger', basePrice: 10, quantity: 2, addons: [] })
  })

  it('merges into an existing line with the same key by summing quantity', () => {
    const first = addToOrderList([], { itemId: 'item-1', name: 'Burger', basePrice: 10 }, 1)
    const second = addToOrderList(first, { itemId: 'item-1', name: 'Burger', basePrice: 10 }, 1)
    expect(second).toHaveLength(1)
    expect(second[0].quantity).toBe(2)
  })

  it('treats different variants as separate lines', () => {
    const first = addToOrderList([], { itemId: 'item-1', name: 'Burger', basePrice: 10, variantId: 'small', variantName: 'Small' }, 1)
    const second = addToOrderList(first, { itemId: 'item-1', name: 'Burger', basePrice: 12, variantId: 'large', variantName: 'Large' }, 1)
    expect(second).toHaveLength(2)
  })
})

describe('setOrderListQuantity', () => {
  it('updates the quantity for a matching key', () => {
    const list = addToOrderList([], { itemId: 'item-1', name: 'Burger', basePrice: 10 }, 1)
    const key = list[0].key
    const result = setOrderListQuantity(list, key, 5)
    expect(result[0].quantity).toBe(5)
  })

  it('removes the line when quantity drops to 0', () => {
    const list = addToOrderList([], { itemId: 'item-1', name: 'Burger', basePrice: 10 }, 1)
    const key = list[0].key
    const result = setOrderListQuantity(list, key, 0)
    expect(result).toHaveLength(0)
  })
})

describe('removeFromOrderList', () => {
  it('removes the line matching the key', () => {
    const list = addToOrderList([], { itemId: 'item-1', name: 'Burger', basePrice: 10 }, 1)
    const result = removeFromOrderList(list, list[0].key)
    expect(result).toHaveLength(0)
  })
})

describe('clearOrderList', () => {
  it('returns an empty array', () => {
    expect(clearOrderList()).toEqual([])
  })
})

describe('getOrderListItemQuantity', () => {
  it('returns 0 when the item is not in the list', () => {
    expect(getOrderListItemQuantity([], 'item-1')).toBe(0)
  })

  it('returns the quantity for a matching item/variant/addons combo', () => {
    const list = addToOrderList([], { itemId: 'item-1', name: 'Burger', basePrice: 10 }, 3)
    expect(getOrderListItemQuantity(list, 'item-1')).toBe(3)
  })
})

describe('getOrderListLineTotal and getOrderListTotal', () => {
  const line: OrderListItem = {
    key: 'item-1::',
    itemId: 'item-1',
    name: 'Burger',
    basePrice: 10,
    addons: [{ id: 'a', name: 'Cheese', price: 2 }],
    quantity: 3,
  }

  it('computes a line total as (basePrice + addons) * quantity', () => {
    expect(getOrderListLineTotal(line)).toBe(36)
  })

  it('sums line totals across the list', () => {
    expect(getOrderListTotal([line, { ...line, key: 'item-2::', itemId: 'item-2' }])).toBe(72)
  })
})

describe('getOrderListItemCount', () => {
  it('sums quantities across all lines', () => {
    const list = addToOrderList(
      addToOrderList([], { itemId: 'item-1', name: 'Burger', basePrice: 10 }, 2),
      { itemId: 'item-2', name: 'Fries', basePrice: 5 },
      3,
    )
    expect(getOrderListItemCount(list)).toBe(5)
  })
})
