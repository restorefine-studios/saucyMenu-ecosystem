# Order list ("show to waiter") — design

## Context

`end-user-app` is a QR-menu diner app: no online ordering, no payment. The ask is a way for a diner to mark multiple dishes as they browse, then show a summary screen to waiting staff at the end, who take the order verbally/manually. Everything here is local to the device — nothing is submitted to the backend.

## Data model & storage

New type `OrderListItem`:

```ts
interface OrderListItem {
  key: string          // itemId + variantId + sorted addon ids — identifies a unique line
  itemId: string
  name: string
  image?: string
  basePrice: number     // item price, or variant price if a variant was chosen
  variantId?: string
  variantName?: string
  addons: { id: string; name: string; price: number }[]
  quantity: number
}
```

Stored in `src/atoms/orderList.ts`:

```ts
export const orderListAtom = atomWithStorage<OrderListItem[]>('orderList', [])
```

Same persistence pattern as `userAtom` (jotai `atomWithStorage`, backed by localStorage, survives refresh). No restaurant/session scoping — the list is cleared only via an explicit "Clear list" action on the summary page. Re-adding the same item+variant+addons combo increments `quantity` on the existing line rather than creating a duplicate.

Helper functions live alongside the atom (or in a small `src/lib/orderList.ts`):
- `addToOrderList(list, item, variant?, addons?, qty=1)` → returns new list with the line added/merged
- `setQuantity(list, key, qty)` → updates quantity, removes the line if qty reaches 0
- `removeFromOrderList(list, key)`
- `clearOrderList()` → `[]`

## MenuItemCard changes (`variant="list"` only)

This is the only variant actually used across the app's browsing surfaces (main menu list, `MenuAIDrawer` suggestions, chat item recommendation). `default` and `featured` variants are not part of this feature.

Per card, bottom-right:
- **Not yet in the list, no variants/add-ons** → small pill button "Add". Tap calls `addToOrderList` with qty 1 directly, no drawer.
- **Already in the list, no variants/add-ons** → button becomes an inline stepper `- {qty} +`. Reflects `quantity` from `orderListAtom` for that item's key. Decrementing to 0 removes the line.
- **Item has variants or add-ons** (`variants.length > 0 || addons.length > 0`) → "Add" always opens `ItemDetailDrawer` for that item (same as tapping the card), regardless of whether it's already in the list. No inline stepper on the card for these items — quantity/option changes happen in the drawer.

## ItemDetailDrawer changes

Variants/add-ons are currently display-only. Add selection state local to the drawer (reset when `itemId` changes):
- **Variants**: single-select (radio-style chips), pre-select the first available variant if any exist. Selecting one changes the displayed price to the variant's price.
- **Add-ons**: multi-select (checkbox-style chips). Selected add-ons' prices are summed and added to the displayed price.

Footer: keep the floating AI button as-is. Add a sticky bottom bar above it (or integrated into the same footer area):
- Quantity stepper (`- {qty} +`, default 1, min 1)
- Button: `Add to list — {currency}{computedPrice × qty}`. Tap calls `addToOrderList` with the chosen variant/add-ons/qty, then closes the drawer.

If the item is already in the list with the exact same variant+addons combo, opening the drawer pre-fills the stepper with the existing quantity, and the button reads "Update" instead of "Add to list" (still just calls `addToOrderList`/`setQuantity` under the hood since merging by `key` handles both cases).

## Header entry point

In `src/routes/main/menus/index.tsx`, inside the existing top-right floating button group on the banner (next to the `?` tour button and share button), add a `ClipboardList` (lucide) icon button. Badge: small count circle showing the sum of all `quantity` in `orderListAtom`, shown only when the list is non-empty. Tap navigates to `/main/order-list`.

## Order list page

New route: `src/routes/main/order-list.tsx`.

- Standard back-chevron header (matches the app's existing page header pattern, e.g. `items.tsx`), title "Your Order List".
- Body: one row per `OrderListItem` — name, variant name + add-on names as subtext (matches the "tags" subtext style already used in `MenuItemCard`'s list variant), line total, quantity stepper (`-  qty  +`), remove (X) control.
- Empty state: simple "No items added yet" message with an icon, same visual language as other empty states in the app (e.g. the `emptyfolder.svg` pattern used in super-admin, or a comparable existing end-user-app empty state if one exists).
- Footer: grand total (sum of `basePrice + sum(addon prices)` × `quantity` across all lines) and a "Clear list" button that calls `clearOrderList()` and stays on the page (now showing the empty state).
- Back button returns to whatever page was navigated from (standard router history back), no special scroll-restoration work needed beyond what the router already does.

## Out of scope

- No backend submission/persistence — this is local-only and ephemeral per device.
- No multi-session/table scoping — clearing is manual via the page's "Clear list" button.
- `default` and `featured` MenuItemCard variants are untouched.
- No payment, no order status tracking, no waiter-side acknowledgment.
