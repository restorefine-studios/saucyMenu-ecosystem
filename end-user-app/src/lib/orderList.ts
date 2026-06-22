export interface OrderListAddon {
  id: string
  name: string
  price: number
}

export interface OrderListItem {
  key: string
  itemId: string
  name: string
  image?: string
  basePrice: number
  variantId?: string
  variantName?: string
  addons: OrderListAddon[]
  quantity: number
}

export interface AddToOrderListInput {
  itemId: string
  name: string
  image?: string
  basePrice: number
  variantId?: string
  variantName?: string
  addons?: OrderListAddon[]
}

export function buildOrderListKey(itemId: string, variantId?: string, addons?: OrderListAddon[]): string {
  let key = `${itemId}::${variantId ?? ''}`
  const addonPart = (addons ?? []).map(a => a.id).sort().join(',')
  if (addonPart) key += `::${addonPart}`
  return key
}

export function addToOrderList(list: OrderListItem[], input: AddToOrderListInput, qty = 1): OrderListItem[] {
  const addons = input.addons ?? []
  const key = buildOrderListKey(input.itemId, input.variantId, addons)
  const existing = list.find(l => l.key === key)
  if (existing) {
    return list.map(l => (l.key === key ? { ...l, quantity: l.quantity + qty } : l))
  }
  return [
    ...list,
    {
      key,
      itemId: input.itemId,
      name: input.name,
      image: input.image,
      basePrice: input.basePrice,
      variantId: input.variantId,
      variantName: input.variantName,
      addons,
      quantity: qty,
    },
  ]
}

export function setOrderListQuantity(list: OrderListItem[], key: string, quantity: number): OrderListItem[] {
  if (quantity <= 0) return list.filter(l => l.key !== key)
  return list.map(l => (l.key === key ? { ...l, quantity } : l))
}

export function removeFromOrderList(list: OrderListItem[], key: string): OrderListItem[] {
  return list.filter(l => l.key !== key)
}

export function clearOrderList(): OrderListItem[] {
  return []
}

export function getOrderListItemQuantity(
  list: OrderListItem[],
  itemId: string,
  variantId?: string,
  addons?: OrderListAddon[],
): number {
  const key = buildOrderListKey(itemId, variantId, addons)
  return list.find(l => l.key === key)?.quantity ?? 0
}

export function getOrderListLineTotal(item: OrderListItem): number {
  const addonsTotal = item.addons.reduce((sum, a) => sum + a.price, 0)
  return (item.basePrice + addonsTotal) * item.quantity
}

export function getOrderListTotal(list: OrderListItem[]): number {
  return list.reduce((sum, item) => sum + getOrderListLineTotal(item), 0)
}

export function getOrderListItemCount(list: OrderListItem[]): number {
  return list.reduce((sum, item) => sum + item.quantity, 0)
}
