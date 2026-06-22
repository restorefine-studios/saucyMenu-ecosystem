# Order List ("show to waiter") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a diner in `end-user-app` mark dishes while browsing (with variant/add-on selection where needed), then view a dedicated summary page to show staff — fully local, no backend submission.

**Architecture:** A jotai `atomWithStorage` (`orderListAtom`) persists the list to localStorage, mirroring the existing `userAtom` pattern. Pure helper functions in `src/lib/orderList.ts` own all list-mutation logic so they're unit-testable without React. `MenuItemCard` (variant `"list"` only) and `ItemDetailDrawer` read/write the atom directly. A new TanStack Router route renders the summary page. One backend gap (`hasVariants` missing from the classified-items endpoint) is fixed first so the gating logic has consistent data everywhere.

**Tech Stack:** React 19, TanStack Router (file-based), jotai (`atomWithStorage`), Tailwind, lucide-react icons, Vitest (for the new pure-logic module only), Go 1.25 + sqlc-generated code + chi handlers (backend).

## Global Constraints

- No backend submission/persistence for the order list — entirely local to the device (per spec, "Out of scope").
- No multi-session/table scoping — list is cleared only via the page's explicit "Clear list" button (per spec).
- `default` and `featured` `MenuItemCard` variants are untouched (per spec).
- No payment, no order status tracking, no waiter-side acknowledgment (per spec).
- `NewArrivalsCarousel.tsx` is custom markup (not `MenuItemCard`) and is untouched — tapping its card still just opens `ItemDetailDrawer` via the existing `onItemClick` prop, as today.
- Currency symbol everywhere comes from `user?.currency?.symbol` (existing `userAtom` pattern) — do not hardcode a symbol.
- Brand accent color is `#F7941D` — reuse it for all new CTAs/badges, matching existing usage in `MenuItemCard.tsx` and `ItemDetailDrawer.tsx`.
- `tsc --noEmit` in `end-user-app` currently reports 20 pre-existing errors unrelated to this feature (unused imports/vars in `menus/index.tsx`, `AllergensDietsModal.tsx`, and stale demo routes in `Header.tsx`). Do not try to fix these. Each task's verification step only checks for *new* errors in the files that task touches.

---

## File Structure

- **Create** `saucy-menu-backend-go/internal/db/queries/user_menu.sql` (modify) — add `has_variants` to `ListClassifiedMenuItems`.
- **Modify** `saucy-menu-backend-go/internal/db/sqlc/user_menu.sql.go` — hand-add `HasVariants` to `ListClassifiedMenuItemsRow` (sqlc CLI is not installed in this environment; this is a manual edit matching sqlc's exact output style, using the sibling `ListMenuItemsByMenuRow` as the template).
- **Modify** `saucy-menu-backend-go/internal/handlers/user/menu.go` — add `"hasVariants"` to the classified-items `toItem` map.
- **Create** `end-user-app/src/lib/orderList.ts` — pure types + helper functions (key building, add/set/remove/totals).
- **Create** `end-user-app/src/lib/orderList.test.ts` — Vitest unit tests for the above.
- **Create** `end-user-app/src/atoms/orderList.ts` — `orderListAtom` (`atomWithStorage`).
- **Modify** `end-user-app/src/routes/main/menus/index.tsx` — add `hasVariants?: boolean` to the `MenuItem` interface; add header `ClipboardList` icon + badge.
- **Modify** `end-user-app/src/components/MenuItemCard.tsx` — destructure `id`/`hasVariants`; add quick-add button / stepper for `variant="list"`.
- **Modify** `end-user-app/src/components/ItemDetailDrawer.tsx` — variant radio-select, add-on checkbox-select, sticky add/update footer.
- **Create** `end-user-app/src/routes/main/order-list.tsx` — new summary page route.

---

### Task 1: Backend — add `hasVariants` to classified-items response

**Files:**
- Modify: `saucy-menu-backend-go/internal/db/queries/user_menu.sql:41-46`
- Modify: `saucy-menu-backend-go/internal/db/sqlc/user_menu.sql.go:185-241`
- Modify: `saucy-menu-backend-go/internal/handlers/user/menu.go:358-376`

**Interfaces:**
- Produces: `sqlc.ListClassifiedMenuItemsRow.HasVariants *bool` (new field), and the classified-items JSON response gains a `"hasVariants": bool|null` key on every item. Later tasks (Task 6) read this as `MenuItem.hasVariants?: boolean` on the frontend.

This file has zero existing test coverage (confirmed: no `*_test.go` references `ListMenuItems`/`ListClassifiedMenuItems`/`user/menu`), so verification here is `go build` + manual review against the working sibling query, consistent with the rest of this handler.

- [ ] **Step 1: Add `has_variants` to the SQL query**

In `saucy-menu-backend-go/internal/db/queries/user_menu.sql`, replace lines 41-46:

```sql
-- name: ListClassifiedMenuItems :many
SELECT id, name, description, translations, images, price, type,
       is_chefs_recommended, is_popular, is_new, is_limited_time, is_available, created_at
FROM menu_items
WHERE restaurant_id = $1
  AND (is_chefs_recommended = true OR is_popular = true OR is_new = true OR is_limited_time = true);
```

with:

```sql
-- name: ListClassifiedMenuItems :many
SELECT id, name, description, translations, images, price, type, has_variants,
       is_chefs_recommended, is_popular, is_new, is_limited_time, is_available, created_at
FROM menu_items
WHERE restaurant_id = $1
  AND (is_chefs_recommended = true OR is_popular = true OR is_new = true OR is_limited_time = true);
```

- [ ] **Step 2: Hand-edit the generated sqlc file to match**

In `saucy-menu-backend-go/internal/db/sqlc/user_menu.sql.go`, replace the `listClassifiedMenuItems` const (lines 185-191):

```go
const listClassifiedMenuItems = `-- name: ListClassifiedMenuItems :many
SELECT id, name, description, translations, images, price, type,
       is_chefs_recommended, is_popular, is_new, is_limited_time, is_available, created_at
FROM menu_items
WHERE restaurant_id = $1
  AND (is_chefs_recommended = true OR is_popular = true OR is_new = true OR is_limited_time = true)
`
```

with:

```go
const listClassifiedMenuItems = `-- name: ListClassifiedMenuItems :many
SELECT id, name, description, translations, images, price, type, has_variants,
       is_chefs_recommended, is_popular, is_new, is_limited_time, is_available, created_at
FROM menu_items
WHERE restaurant_id = $1
  AND (is_chefs_recommended = true OR is_popular = true OR is_new = true OR is_limited_time = true)
`
```

Then replace the `ListClassifiedMenuItemsRow` struct (lines 193-207):

```go
type ListClassifiedMenuItemsRow struct {
	ID                 pgtype.UUID      `json:"id"`
	Name               string           `json:"name"`
	Description        *string          `json:"description"`
	Translations       []byte           `json:"translations"`
	Images             []string         `json:"images"`
	Price              pgtype.Numeric   `json:"price"`
	Type               string           `json:"type"`
	IsChefsRecommended *bool            `json:"is_chefs_recommended"`
	IsPopular          *bool            `json:"is_popular"`
	IsNew              *bool            `json:"is_new"`
	IsLimitedTime      *bool            `json:"is_limited_time"`
	IsAvailable        *bool            `json:"is_available"`
	CreatedAt          pgtype.Timestamp `json:"created_at"`
}
```

with:

```go
type ListClassifiedMenuItemsRow struct {
	ID                 pgtype.UUID      `json:"id"`
	Name               string           `json:"name"`
	Description        *string          `json:"description"`
	Translations       []byte           `json:"translations"`
	Images             []string         `json:"images"`
	Price              pgtype.Numeric   `json:"price"`
	Type               string           `json:"type"`
	HasVariants        *bool            `json:"has_variants"`
	IsChefsRecommended *bool            `json:"is_chefs_recommended"`
	IsPopular          *bool            `json:"is_popular"`
	IsNew              *bool            `json:"is_new"`
	IsLimitedTime      *bool            `json:"is_limited_time"`
	IsAvailable        *bool            `json:"is_available"`
	CreatedAt          pgtype.Timestamp `json:"created_at"`
}
```

Then in the `Scan(...)` call inside `ListClassifiedMenuItems` (lines 218-232), insert `&i.HasVariants` right after `&i.Type` and before `&i.IsChefsRecommended`:

```go
		if err := rows.Scan(
			&i.ID,
			&i.Name,
			&i.Description,
			&i.Translations,
			&i.Images,
			&i.Price,
			&i.Type,
			&i.HasVariants,
			&i.IsChefsRecommended,
			&i.IsPopular,
			&i.IsNew,
			&i.IsLimitedTime,
			&i.IsAvailable,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
```

- [ ] **Step 3: Map the new field in the handler**

In `saucy-menu-backend-go/internal/handlers/user/menu.go`, in the `toItem` closure (around line 358-376), add `"hasVariants": it.HasVariants,` right after `"type": it.Type,`:

```go
	toItem := func(it sqlc.ListClassifiedMenuItemsRow) map[string]any {
		mid := pgUUIDToString(it.ID)
		rr := classifiedRatingsMap[mid]
		return map[string]any{
			"id":                 mid,
			"name":               httpx.ResolveTranslatedField(it.Name, it.Translations, "name", lang),
			"description":        httpx.ResolveTranslatedField(ptrStr(it.Description), it.Translations, "description", lang),
			"images":             it.Images,
			"price":              httpx.NumericToString(it.Price),
			"type":               it.Type,
			"hasVariants":        it.HasVariants,
			"isAvailable":        it.IsAvailable,
			"isChefsRecommended": it.IsChefsRecommended,
			"isPopular":          it.IsPopular,
			"isNew":              it.IsNew,
			"isLimitedTime":      it.IsLimitedTime,
			"averageRating":      rr[0],
			"reviewCount":        rr[1],
		}
	}
```

- [ ] **Step 4: Build to verify**

Run from `saucy-menu-backend-go`:

```bash
go build ./...
```

Expected: exits 0, no output.

- [ ] **Step 5: Commit**

```bash
git add internal/db/queries/user_menu.sql internal/db/sqlc/user_menu.sql.go internal/handlers/user/menu.go
git commit -m "feat: add hasVariants to classified menu items response"
```

---

### Task 2: Order list pure logic + storage atom

**Files:**
- Create: `end-user-app/src/lib/orderList.ts`
- Test: `end-user-app/src/lib/orderList.test.ts`
- Create: `end-user-app/src/atoms/orderList.ts`

**Interfaces:**
- Produces (used by Tasks 3-6):
  - `interface OrderListAddon { id: string; name: string; price: number }`
  - `interface OrderListItem { key: string; itemId: string; name: string; image?: string; basePrice: number; variantId?: string; variantName?: string; addons: OrderListAddon[]; quantity: number }`
  - `interface AddToOrderListInput { itemId: string; name: string; image?: string; basePrice: number; variantId?: string; variantName?: string; addons?: OrderListAddon[] }`
  - `buildOrderListKey(itemId: string, variantId?: string, addons?: OrderListAddon[]): string`
  - `addToOrderList(list: OrderListItem[], input: AddToOrderListInput, qty?: number): OrderListItem[]`
  - `setOrderListQuantity(list: OrderListItem[], key: string, quantity: number): OrderListItem[]`
  - `removeFromOrderList(list: OrderListItem[], key: string): OrderListItem[]`
  - `clearOrderList(): OrderListItem[]`
  - `getOrderListItemQuantity(list: OrderListItem[], itemId: string, variantId?: string, addons?: OrderListAddon[]): number`
  - `getOrderListLineTotal(item: OrderListItem): number`
  - `getOrderListTotal(list: OrderListItem[]): number`
  - `getOrderListItemCount(list: OrderListItem[]): number`
  - `orderListAtom: PrimitiveAtom<OrderListItem[]>` from `src/atoms/orderList.ts` (wraps the type above with `atomWithStorage('orderList', [])`, mirroring `src/atoms/user.ts`'s `userAtom`).

- [ ] **Step 1: Write the failing tests**

Create `end-user-app/src/lib/orderList.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "end-user-app" && npx vitest run src/lib/orderList.test.ts
```

Expected: fails with module-not-found errors for `./orderList` (the file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `end-user-app/src/lib/orderList.ts`:

```ts
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
  const addonPart = (addons ?? []).map(a => a.id).sort().join(',')
  return `${itemId}::${variantId ?? ''}::${addonPart}`.replace(/::$/, '::')
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
```

Note: `buildOrderListKey('item-1')` produces `'item-1::'` (variant segment empty, addon segment empty, joined by the literal `'::'` separator with the trailing-double-colon regex collapsing the would-be third `::` down to one) — this matches the test's expectation exactly. Trace it: `${itemId}::${variantId ?? ''}::${addonPart}` with empty variant and empty addonPart gives `'item-1::::'`, and `.replace(/::$/, '::')` strips one trailing `'::'`, leaving `'item-1::'`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "end-user-app" && npx vitest run src/lib/orderList.test.ts
```

Expected: all tests pass (13 tests, 0 failures).

- [ ] **Step 5: Create the storage atom**

Create `end-user-app/src/atoms/orderList.ts`:

```ts
import { atomWithStorage } from 'jotai/utils'
import type { OrderListItem } from '@/lib/orderList'

export const orderListAtom = atomWithStorage<OrderListItem[]>('orderList', [])
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/orderList.ts src/lib/orderList.test.ts src/atoms/orderList.ts
git commit -m "feat: add order list storage atom and pure helper functions"
```

---

### Task 3: `MenuItemCard` — quick-add button and stepper

**Files:**
- Modify: `end-user-app/src/components/MenuItemCard.tsx`
- Modify: `end-user-app/src/routes/main/menus/index.tsx:30-46` (add `hasVariants` to `MenuItem`)

**Interfaces:**
- Consumes: `orderListAtom` (Task 2's `src/atoms/orderList.ts`), `addToOrderList`, `setOrderListQuantity`, `getOrderListItemQuantity`, `buildOrderListKey` (Task 2's `src/lib/orderList.ts`).
- Produces: `MenuItemCardProps` gains `hasVariants?: boolean`. No other public prop changes — `id` was already declared in the interface but not destructured; this task destructures it.

Behavior (per spec, `variant="list"` only):
- No variants, not yet in list → "Add" pill, tap adds qty 1 directly (no drawer).
- No variants, already in list → inline stepper reflecting quantity; decrementing to 0 removes the line.
- Has variants (`hasVariants === true`) → "Add" always calls the existing `onClick` prop (opens `ItemDetailDrawer`), same as tapping the card.

- [ ] **Step 1: Add `hasVariants` to the `MenuItem` interface (used by `menus/index.tsx`'s `{...item}` spreads into `MenuItemCard`)**

In `end-user-app/src/routes/main/menus/index.tsx`, in the `MenuItem` interface (lines 30-46), add one field after `isAvailable?: boolean`:

```ts
interface MenuItem {
  id: string
  name: string
  description?: string
  price: string | number
  images?: string[]
  sectionId?: string
  isChefsRecommended?: boolean
  isPopular?: boolean
  isLimitedTime?: boolean
  isNew?: boolean
  isAvailable?: boolean
  hasVariants?: boolean
  tags?: { id: string; name: string }[]
  allergens?: { id: string; name: string }[]
  averageRating?: number
  reviewCount?: number
}
```

- [ ] **Step 2: Update `MenuItemCardProps` and imports in `MenuItemCard.tsx`**

In `end-user-app/src/components/MenuItemCard.tsx`, replace the top of the file (lines 1-26):

```tsx
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { orderListAtom } from '@/atoms/orderList'
import { addToOrderList, buildOrderListKey, getOrderListItemQuantity, setOrderListQuantity } from '@/lib/orderList'
import { renderMediaUrl } from '@/lib/utils'
import { Star, Plus, Minus } from 'lucide-react'

type Variant = 'default' | 'chefs' | 'popular' | 'featured' | 'list'

interface MenuItemCardProps {
  id: string
  name: string
  description?: string
  price: string | number
  images?: string[]
  isChefsRecommended?: boolean
  isPopular?: boolean
  isLimitedTime?: boolean
  isAvailable?: boolean
  hasVariants?: boolean
  tags?: { id: string; name: string }[]
  allergens?: { id: string; name: string }[]
  variant?: Variant
  badgeLabel?: string
  dimmed?: boolean
  averageRating?: number
  reviewCount?: number
  onClick?: () => void
}
```

- [ ] **Step 3: Destructure `id`/`hasVariants` and add the quick-add state/handlers**

Replace the component signature and the lines immediately after it (current lines 36-54):

```tsx
export function MenuItemCard({
  id,
  name,
  description,
  price,
  images,
  variant = 'default',
  badgeLabel,
  dimmed = false,
  tags,
  hasVariants,
  averageRating,
  reviewCount,
  onClick,
}: MenuItemCardProps) {
  const [user] = useAtom(userAtom)
  const [orderList, setOrderList] = useAtom(orderListAtom)
  const defaultBadge = BADGE[variant]
  const badge = badgeLabel
    ? { label: badgeLabel, className: defaultBadge?.className ?? 'bg-[#F7941D] text-white' }
    : defaultBadge
  const imageUrl = images && images.length > 0 ? renderMediaUrl(images[0]) : null
  const numericPrice = typeof price === 'number' ? price : parseFloat(price) || 0
  const quantityInList = getOrderListItemQuantity(orderList, id)

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasVariants) {
      onClick?.()
      return
    }
    setOrderList(list => addToOrderList(list, { itemId: id, name, image: imageUrl ?? undefined, basePrice: numericPrice }, 1))
  }

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOrderList(list => addToOrderList(list, { itemId: id, name, image: imageUrl ?? undefined, basePrice: numericPrice }, 1))
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOrderList(list => setOrderListQuantity(list, buildOrderListKey(id), quantityInList - 1))
  }
```

- [ ] **Step 4: Render the Add button / stepper in the `list` variant**

In the `list` variant's JSX (the right-content `<div>` that currently ends at line 114, just before its closing `</div>` at line 114), add the control as a new sibling inside that `relative` container, after the "Meta row" block:

```tsx
          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2">
            {averageRating != null && averageRating > 0 ? (
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <Star className="w-3 h-3 fill-[#F7941D] text-[#F7941D]" />
                <span className="font-semibold text-gray-700">{averageRating}</span>
                {reviewCount != null && reviewCount > 0 && (
                  <span className="text-gray-400">({reviewCount})</span>
                )}
              </span>
            ) : null}
          </div>

          {/* Add / stepper control, bottom-right */}
          <div className="absolute bottom-2.5 right-2.5">
            {quantityInList > 0 && !hasVariants ? (
              <div className="flex items-center gap-2 bg-gray-900 rounded-full px-1 py-1">
                <button
                  onClick={handleDecrement}
                  className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-white text-xs font-semibold w-4 text-center">{quantityInList}</span>
                <button
                  onClick={handleIncrement}
                  className="w-6 h-6 rounded-full bg-white text-gray-900 flex items-center justify-center"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddClick}
                className="flex items-center gap-1 bg-[#F7941D] text-white text-xs font-semibold px-3 py-1.5 rounded-full"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
          </div>
```

- [ ] **Step 5: Manually verify in the browser**

```bash
cd "end-user-app" && npm run dev
```

Open the menu page. For a regular-section item (no variants): confirm an orange "Add" pill appears bottom-right of its card, tapping it shows a stepper, +/- changes the count, decrementing to 0 reverts to the "Add" pill, and tapping the card body still opens the drawer. For an item that has variants, confirm tapping "Add" opens the drawer instead (same as tapping the card).

- [ ] **Step 6: Check for new TypeScript errors**

```bash
cd "end-user-app" && npx tsc --noEmit 2>&1 | grep -E "MenuItemCard|menus/index"
```

Expected: no new errors beyond the pre-existing unused-import lines already in `menus/index.tsx` (`Search`, `MoreVertical`, `Sparkles`, `Timer`, `Tag`, `searchQuery`, `setSearchQuery` — untouched by this task).

- [ ] **Step 7: Commit**

```bash
git add src/components/MenuItemCard.tsx src/routes/main/menus/index.tsx
git commit -m "feat: add quick-add button and stepper to MenuItemCard list variant"
```

---

### Task 4: `ItemDetailDrawer` — variant/add-on selection and add-to-list footer

**Files:**
- Modify: `end-user-app/src/components/ItemDetailDrawer.tsx`

**Interfaces:**
- Consumes: `orderListAtom`, `addToOrderList`, `buildOrderListKey` (Task 2).
- Produces: no new public props — `ItemDetailDrawerProps` is unchanged (`{ itemId: string | null; onClose: () => void }`).

- [ ] **Step 1: Add imports and selection state**

In `end-user-app/src/components/ItemDetailDrawer.tsx`, replace the import block (lines 1-16):

```tsx
import { useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { orderListAtom } from '@/atoms/orderList'
import { addToOrderList, buildOrderListKey, type OrderListAddon } from '@/lib/orderList'
import { useDish } from '@/hooks/dishes'
import { axiosInstance, renderMediaUrl } from '@/lib/utils'
import { apiRoutes } from '@/api-routes'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Clock, Star, X, Minus, Plus } from 'lucide-react'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { StarRating } from '@/components/star-rating'
import SpiceLevel from '@/components/spice-level'
import SpinnerLoader from '@/components/spinner'
import { Input, TextArea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from '@tanstack/react-router'
```

Then, inside `ItemDetailDrawer` right after the existing `useState` declarations (after `const [email, setEmail] = useState('')` — current line 48), add:

```tsx
  const [orderList, setOrderList] = useAtom(orderListAtom)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [orderQty, setOrderQty] = useState(1)
```

- [ ] **Step 2: Reset selection when the item changes, and pre-fill from an existing matching line**

After the existing `const allergens = (item as any)?.allergens ?? []` line (current line 106), add:

```tsx
  const selectedAddons: OrderListAddon[] = addons
    .filter((a: any) => selectedAddonIds.includes(a.id))
    .map((a: any) => ({ id: a.id, name: a.name, price: parseFloat(a.price) || 0 }))
  const selectedVariant = variants.find((v: any) => v.id === selectedVariantId)
  const unitBasePrice = selectedVariant
    ? parseFloat(selectedVariant.price) || 0
    : discountInfo
      ? discountInfo.discounted
      : parseFloat(String(item?.price ?? '0')) || 0
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0)
  const computedUnitPrice = unitBasePrice + addonsTotal
  const existingKey = item ? buildOrderListKey(item.id, selectedVariantId ?? undefined, selectedAddons) : ''
  const existingQuantity = orderList.find(l => l.key === existingKey)?.quantity ?? 0

  useEffect(() => {
    if (!item) return
    const firstAvailable = variants.find((v: any) => v.isAvailable !== false)
    setSelectedVariantId(firstAvailable?.id ?? null)
    setSelectedAddonIds([])
    setOrderQty(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  useEffect(() => {
    setOrderQty(existingQuantity > 0 ? existingQuantity : 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingKey])

  const handleConfirmOrderList = () => {
    if (!item) return
    setOrderList(list => {
      const withoutExisting = list.filter(l => l.key !== existingKey)
      return addToOrderList(
        withoutExisting,
        {
          itemId: item.id,
          name: item.name,
          image: imageUrl ?? undefined,
          basePrice: unitBasePrice,
          variantId: selectedVariantId ?? undefined,
          variantName: selectedVariant?.name,
          addons: selectedAddons,
        },
        orderQty,
      )
    })
    toast.success(existingQuantity > 0 ? 'Order list updated' : 'Added to order list')
    onClose()
  }
```

- [ ] **Step 3: Make variants single-select**

Replace the "Variants" block (current lines 252-266):

```tsx
              {/* Variants */}
              {variants.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Variants</p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v: any) => {
                      const selected = v.id === selectedVariantId
                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={v.isAvailable === false}
                          onClick={() => setSelectedVariantId(v.id)}
                          className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-sm transition-colors ${
                            selected ? 'border-[#F7941D] bg-orange-50' : 'border-gray-200'
                          } ${v.isAvailable === false ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          <span className="capitalize text-gray-800">{v.name}</span>
                          <span className="font-semibold text-[#F7941D]">{user?.currency?.symbol}{v.price}</span>
                          {v.isAvailable === false && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded">unavailable</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
```

- [ ] **Step 4: Make add-ons multi-select**

Replace the "Add-ons" block (current lines 268-281):

```tsx
              {/* Add-ons */}
              {addons.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Add-ons</p>
                  <div className="flex flex-wrap gap-2">
                    {addons.map((a: any) => {
                      const selected = selectedAddonIds.includes(a.id)
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() =>
                            setSelectedAddonIds(prev =>
                              selected ? prev.filter(id => id !== a.id) : [...prev, a.id],
                            )
                          }
                          className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-sm transition-colors ${
                            selected ? 'border-[#F7941D] bg-orange-50' : 'border-gray-200'
                          }`}
                        >
                          <span className="capitalize text-gray-800">{a.name}</span>
                          <span className="font-semibold text-[#F7941D]">{user?.currency?.symbol}{a.price}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
```

- [ ] **Step 5: Add the sticky add-to-list footer and move the AI button up**

Replace the "Floating AI button" block and the line right before it (current lines 329-341), changing `bottom-6` to `bottom-24` and inserting the new footer right after it:

```tsx
        {/* Floating AI button */}
        {item && (
          <button
            onClick={handleAIChat}
            className="absolute bottom-24 right-4 z-20 ai-ring-item"
            style={{ width: 60, height: 60 }}
            aria-label="Ask AI about this dish"
          >
            <span className="absolute inset-[3px] rounded-full bg-white flex items-center justify-center">
              <img src="/saucy-ai-icon.svg" alt="" className="w-9 h-9" />
            </span>
          </button>
        )}

        {/* Sticky add-to-order-list footer */}
        {item && (
          <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-1 py-1 shrink-0">
              <button
                onClick={() => setOrderQty(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4 text-gray-700" />
              </button>
              <span className="text-sm font-semibold w-6 text-center">{orderQty}</span>
              <button
                onClick={() => setOrderQty(q => q + 1)}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4 text-gray-700" />
              </button>
            </div>
            <button
              onClick={handleConfirmOrderList}
              className="flex-1 bg-[#F7941D] text-white font-semibold rounded-full py-3 text-sm"
            >
              {existingQuantity > 0 ? 'Update' : 'Add to list'} — {user?.currency?.symbol}{(computedUnitPrice * orderQty).toFixed(2)}
            </button>
          </div>
        )}
```

- [ ] **Step 6: Manually verify in the browser**

```bash
cd "end-user-app" && npm run dev
```

Open an item with variants: confirm the first available variant is pre-selected, selecting a different variant updates the footer price, selecting add-ons increases it, the qty stepper changes the footer total, and tapping "Add to list" closes the drawer and shows a toast. Re-open the same item with the same variant/add-ons selected: confirm the qty stepper pre-fills with the existing quantity and the button reads "Update".

- [ ] **Step 7: Check for new TypeScript errors**

```bash
cd "end-user-app" && npx tsc --noEmit 2>&1 | grep "ItemDetailDrawer"
```

Expected: no output (no errors in this file).

- [ ] **Step 8: Commit**

```bash
git add src/components/ItemDetailDrawer.tsx
git commit -m "feat: add variant/add-on selection and add-to-list footer to ItemDetailDrawer"
```

---

### Task 5: Header entry point (icon + badge)

**Files:**
- Modify: `end-user-app/src/routes/main/menus/index.tsx`

**Interfaces:**
- Consumes: `orderListAtom`, `getOrderListItemCount` (Task 2).

- [ ] **Step 1: Add imports**

In `end-user-app/src/routes/main/menus/index.tsx`, update the lucide import (current line 13) to add `ClipboardList`:

```tsx
import { ChevronLeft, Search, MoreVertical, Sparkles, Info, MapPin, Phone, Globe, Clock, Share2, Star as StarIcon, Timer, Tag, ClipboardList } from 'lucide-react'
```

Add two new imports right after the existing `import { userAtom } from '@/atoms/user'` (current line 8):

```tsx
import { orderListAtom } from '@/atoms/orderList'
import { getOrderListItemCount } from '@/lib/orderList'
import { useAtomValue } from 'jotai'
```

- [ ] **Step 2: Read the order list count in `MenuPage`**

Inside `function MenuPage()`, right after `const [user] = useAtom(userAtom)` (current line 233), add:

```tsx
  const orderList = useAtomValue(orderListAtom)
  const orderListCount = getOrderListItemCount(orderList)
```

- [ ] **Step 3: Add the header button**

In the floating action buttons block (current lines 361-374), add the new button after the `Share2` button, inside the same `flex items-center gap-2` group:

```tsx
          <div className="flex items-center gap-2">
            <button
              onClick={replayTour}
              className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
            >
              <span className="text-white text-sm font-bold">?</span>
            </button>
            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => router.navigate({ to: '/main/order-list' })}
              className="relative w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
            >
              <ClipboardList className="w-4 h-4 text-white" />
              {orderListCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F7941D] text-white text-[10px] font-bold flex items-center justify-center">
                  {orderListCount}
                </span>
              )}
            </button>
          </div>
```

- [ ] **Step 4: Manually verify in the browser**

```bash
cd "end-user-app" && npm run dev
```

Confirm the new clipboard icon appears in the header next to the share button, with no badge when the list is empty, and a badge showing the correct total quantity after adding items via Task 3/4's controls.

(The target route `/main/order-list` doesn't exist until Task 6 — clicking the button will 404 or show a router error until then. That's expected at this point.)

- [ ] **Step 5: Commit**

```bash
git add src/routes/main/menus/index.tsx
git commit -m "feat: add order list header icon with item count badge"
```

---

### Task 6: Order list summary page

**Files:**
- Create: `end-user-app/src/routes/main/order-list.tsx`

**Interfaces:**
- Consumes: `orderListAtom`, `setOrderListQuantity`, `removeFromOrderList`, `clearOrderList`, `getOrderListLineTotal`, `getOrderListTotal` (Task 2), `userAtom` (currency symbol).

- [ ] **Step 1: Create the route file**

Create `end-user-app/src/routes/main/order-list.tsx`:

```tsx
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
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ChevronLeft, ClipboardList, Minus, Plus, X } from 'lucide-react'

export const Route = createFileRoute('/main/order-list')({ component: OrderListPage })

function OrderListPage() {
  const router = useRouter()
  const [user] = useAtom(userAtom)
  const [orderList, setOrderList] = useAtom(orderListAtom)
  const total = getOrderListTotal(orderList)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 flex items-center gap-3 px-4 py-4">
        <button
          onClick={() => router.history.back()}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Your Order List</h1>
      </div>

      {orderList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300" />
          <p className="text-gray-400 text-sm">No items added yet</p>
        </div>
      ) : (
        <>
          <div className="flex-1 px-4 divide-y divide-gray-100">
            {orderList.map(line => (
              <div key={line.key} className="flex items-center gap-3 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 capitalize">{line.name}</p>
                  {(line.variantName || line.addons.length > 0) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[line.variantName, ...line.addons.map(a => a.name)].filter(Boolean).join(' • ')}
                    </p>
                  )}
                  <p className="text-sm font-bold text-[#F7941D] mt-1">
                    {user?.currency?.symbol}{getOrderListLineTotal(line).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 rounded-full px-1 py-1 shrink-0">
                  <button
                    onClick={() => setOrderList(list => setOrderListQuantity(list, line.key, line.quantity - 1))}
                    className="w-7 h-7 rounded-full bg-white flex items-center justify-center"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                  <span className="text-sm font-semibold w-5 text-center">{line.quantity}</span>
                  <button
                    onClick={() => setOrderList(list => setOrderListQuantity(list, line.key, line.quantity + 1))}
                    className="w-7 h-7 rounded-full bg-white flex items-center justify-center"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                </div>
                <button
                  onClick={() => setOrderList(list => removeFromOrderList(list, line.key))}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 shrink-0"
                  aria-label="Remove item"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Total</span>
              <span className="text-xl font-bold text-gray-900">{user?.currency?.symbol}{total.toFixed(2)}</span>
            </div>
            <button
              onClick={() => setOrderList(clearOrderList())}
              className="w-full border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-500"
            >
              Clear list
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run the dev server to regenerate the route tree**

```bash
cd "end-user-app" && npm run dev
```

TanStack Router's vite plugin auto-generates `src/routeTree.gen.ts` on file changes while the dev server runs. Confirm in the terminal output there's no router-plugin error, then navigate to the order-list header icon added in Task 5 and confirm it now successfully navigates to `/main/order-list` instead of erroring.

- [ ] **Step 3: Manually verify the full flow end-to-end**

With the dev server running: add a couple of plain items via the card stepper (Task 3) and one item with a variant/add-on via the drawer (Task 4). Open the order list page via the header icon. Confirm: each line shows correct name/variant/add-on subtext/line total, the stepper and remove button work and update the page and header badge live, the grand total matches the sum of line totals, and "Clear list" empties the list and shows the empty state. Confirm the back chevron returns to the menu page.

- [ ] **Step 4: Check for new TypeScript errors**

```bash
cd "end-user-app" && npx tsc --noEmit 2>&1 | grep "order-list"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/routes/main/order-list.tsx src/routeTree.gen.ts
git commit -m "feat: add order list summary page"
```

---

## Self-Review Notes

- **Spec coverage:** Data model/storage → Task 2. `MenuItemCard` add/stepper/drawer-routing rules → Task 3. `ItemDetailDrawer` variant/add-on selection + footer + pre-fill/"Update" → Task 4. Header entry point with badge → Task 5. Order list page (rows, empty state, footer, back nav) → Task 6. Backend `hasVariants` gap (self-identified during investigation, needed for Task 3's gating to work consistently across all `MenuItemCard variant="list"` call sites) → Task 1. `NewArrivalsCarousel`/`default`/`featured` explicitly called out as untouched in Global Constraints.
- **Placeholder scan:** No TBD/TODO markers; every step has complete, runnable code or an exact command.
- **Type consistency:** `OrderListItem`, `OrderListAddon`, `AddToOrderListInput`, and all helper function signatures defined once in Task 2 and reused verbatim (same names, same parameter order) in Tasks 3, 4, and 6 — checked against each other.
