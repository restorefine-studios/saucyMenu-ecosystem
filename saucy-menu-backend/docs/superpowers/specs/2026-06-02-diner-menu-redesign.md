# Diner Menu UI Redesign + Admin Feature Toggles

**Date:** 2026-06-02  
**Status:** Approved  
**Scope:** end-user-app menu page + restaurant-admin item toggles

---

## 1. Overview

Redesign the diner menu page (`/main/menus/index.tsx`) to match the new design: featured carousels, sectioned layout, sticky nav, filter pills, and placeholder-aware item cards. Add quick-toggle chips on restaurant-admin item cards for all four feature flags.

No new DB columns. No backend changes beyond the existing classified-items endpoint.

---

## 2. Data Layer

**No DB migrations required.** All four flags already exist on `menu_items`:
- `is_chefs_recommended`
- `is_popular`  
- `is_limited_time`
- `is_new`

**API calls on diner menu load:**
1. `GET /user/menu` — restaurant info + menu list
2. `GET /user/auth/restaurant` — restaurant name + banner URL
3. `GET /user/menu-items/classified-items` — returns all four featured groups in one call
4. Per section (lazy as user scrolls): `GET /user/menu-items?menuId=X&sectionId=Y`

**Admin toggle PATCH:** `PUT /admin/menu-items/:id` with single field payload e.g. `{ "isChefsRecommended": true }`. Uses the existing update endpoint — no new route needed.

---

## 3. Page Layout (end-user-app)

File: `src/routes/main/menus/index.tsx` — full rewrite.

Top-to-bottom render order:

```
1. Restaurant banner (full-width, 200px tall)
   - Uses restaurant.bannerUrl if set
   - Placeholder gradient + "Image not added yet" if null
   - Restaurant name overlaid bottom-left

2. Filter pills (sticky block, row 1)
   - Pills: All | Gluten-Free | Vegan | Dairy-Free | Allergen-Free
   - Active pill = orange filled; inactive = grey outlined
   - Filtering: non-matching cards get opacity-40 + pointer-events-none

3. Section nav tabs (sticky block, row 2, same sticky container as row 1)
   - One tab per menu section
   - Tapping smooth-scrolls to that section's anchor
   - Active tab underlined in orange

4. LIMITED TIME carousel (hidden if no items tagged isLimitedTime)
   - Full-width landscape banner cards
   - Auto-plays every 4 seconds, loops
   - Dot indicators at bottom
   - Badge: "LIMITED TIME" orange pill top-left
   - Shows: image (placeholder if none), name, description, price

5. Chef's Recommendations (hidden if no items tagged isChefsRecommended)
   - Section heading: "Chef's Recommendations"
   - Horizontal scroll row of cards
   - Badge: "CHEF'S CHOICE" orange top-left

6. What's Popular (hidden if no items tagged isPopular)
   - Section heading: "What's Popular"
   - Horizontal scroll row of cards
   - Badge: "BEST SELLER" orange top-left

7. Regular sections (one per menu section, in sort_order)
   - Section heading = section name
   - 3-column grid desktop / 2-column mobile
   - Plain cards, no badge
   - Section has scroll anchor id for sticky nav

8. Bottom spacing (pb-24 reserved for future footer)
```

---

## 4. Item Card Component

Single reusable `<MenuItemCard>` component with a `variant` prop:

| Variant | Badge | Layout |
|---|---|---|
| `featured` | "LIMITED TIME" | Full-width landscape |
| `chefs` | "CHEF'S CHOICE" | Normal portrait |
| `popular` | "BEST SELLER" | Normal portrait |
| `default` | None | Normal portrait |

**Card contents (all variants except featured):**
- Image square (top): real image or grey placeholder with "Image not added yet" centered
- Name + price on one line
- Description (2-line clamp)
- Star row (5 stars, `opacity-50`, non-interactive)
- `+ Add` button (disabled, grey outlined)

**Featured card contents:**
- Left: name (large), description, price, "Order Special" pill button (disabled)
- Right: circular image crop or placeholder
- Orange/dark gradient background

**Filter greyout:** When diet filter active, card wrapper gets `opacity-40 pointer-events-none` if item has no matching tag.

---

## 5. Restaurant Admin Changes

### 5a. Add `isLimitedTime` to add/edit form

File: `src/pages/admin/menus/items/add/index.tsx`  
File: `src/pages/admin/menus/items/edit-dish/index.tsx`

Add a boolean toggle for `isLimitedTime` in the same section as `isChefsRecommended`, `isPopular`, `isNew`. Label: **"Limited Time"**. Same UI pattern as the existing three.

### 5b. Quick-toggle chips on item cards in the items list

File: `src/pages/admin/menus/items/components/item-card.tsx`

Add four chip buttons below each item card:

```
[Chef's Pick] [Popular] [New] [Limited Time]
```

- **Orange filled** = flag is `true`
- **Grey outlined** = flag is `false`  
- Tapping instantly calls `PUT /admin/menu-items/:id` with `{ "isChefsRecommended": true/false }` (single field)
- Optimistic UI update — flip chip immediately, revert on error
- No confirmation dialog, no form open

---

## 6. Component File Structure

```
end-user-app/src/
  routes/main/menus/
    index.tsx                ← full rewrite (main menu page)
  components/
    MenuItemCard.tsx          ← new reusable card component
    FeaturedCarousel.tsx      ← new limited-time carousel
    SectionNav.tsx            ← new sticky section nav
    FilterPills.tsx           ← new diet filter pills

restaurant-admin/src/pages/admin/menus/items/
  components/
    item-card.tsx             ← add toggle chips
  add/index.tsx               ← add isLimitedTime toggle
  edit-dish/index.tsx         ← add isLimitedTime toggle
```

---

## 7. Behaviour Details

- **Carousel timing:** 4 second auto-play, pauses on user interaction, resumes after 8 seconds idle
- **Sticky offset:** filter pills + section nav combined height ~96px; section scroll targets offset by this amount
- **Empty sections:** any featured group with 0 items is completely hidden (no heading, no empty state)
- **Performance:** classified-items fetched once on mount; regular section items fetched lazily per section on first scroll into view
- **No ordering/cart:** all interactive elements on item cards (Add button, stars) are rendered disabled — UI placeholders only
