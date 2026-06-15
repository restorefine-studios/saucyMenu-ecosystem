# Restaurant Admin UI Redesign

**Date:** 2026-06-03  
**Status:** Approved  
**Scope:** restaurant-admin — Navbar, Dashboard, Menus, Reviews, Audit, Settings, Subscription

---

## 1. Design System

**Colour tokens:**
- Primary: `#F7941D` — navbar bg, active nav, CTAs, badges
- Background: `#FFFFFF` — all page content
- Surface: `#F9FAFB` — card backgrounds, alternating table rows
- Border: `#E5E7EB` — card borders, dividers
- Text primary: `#111827`
- Text secondary: `#6B7280`
- Text on orange: `#FFFFFF`

**Cards:** `rounded-2xl shadow-sm border border-gray-100 p-6`  
**Page padding:** `px-8 py-6`  
**Gap between cards:** `gap-6`  
**Typography:** Inter — bold headings, medium labels, normal body

---

## 2. Top Navbar

Fixed, full-width, `bg-[#F7941D]`, replaces current sidebar.

```
[ SaucyMenu logo ]   [Dashboard][Menus][Reviews][Audit][Settings]
                     Restaurant Name (centered, bold white)
                                               [🔍][🔔][👤 avatar]
```

- **Left:** Logo + "Saucy Menu" in white
- **Center:** Restaurant name from `GET /admin/auth/profile` — bold, white, slightly larger
- **Nav links:** White text. Active = white underline + font-bold. Links: Dashboard, Menus, Reviews, Subscription, Audit, Settings
- **Right:** Search icon, notification bell (future: badge), avatar circle with initials. Avatar click → dropdown: Profile, Settings, Logout

**Implementation:** Replace `ScreenWrapper` + sidebar with a shared `AdminLayout` component wrapping all pages. Remove old sidebar completely.

---

## 3. Dashboard

Three zones, top to bottom:

### Zone 1 — Stats (4 equal cards)
| Stat | Icon | Value source |
|---|---|---|
| Sessions | 👥 | `GET /admin/stats/` → totalUsers |
| Dishes | 🍽 | `GET /admin/stats/` → totalDishes |
| AI Credits | 🤖 | `GET /admin/stats/` → totalAiCredits |
| Reviews | ⭐ | count from reviews endpoint |

Each card: icon, large number, secondary label, subtle trend indicator.

### Zone 2 — Quick actions (horizontal strip)
Pill buttons: `+ Add Menu Item`, `📤 Bulk Upload`, `👁 View Menu (live)`, `💳 Subscription`

### Zone 3 — Two columns
- **Left (60%):** Customer sessions chart by month — `GET /admin/stats/customers/chart`
- **Right (40%):** Activity feed — most recent events (new sessions, reviews, subscription) with icon + timestamp

---

## 4. Menus Page

Single page with sticky tab bar below navbar.

**Tabs:** `[Menus] [Items] [Classifications] [Addons]`  
Active tab: orange underline + bold.

### Menus tab
Card grid — each card: menu name, section count, item count, active toggle, Edit + Delete buttons.

### Items tab
Table: thumbnail, name, section, price, tags (diet badges), status toggle, Edit button.  
Searchable. Filter by section dropdown. Pagination.  
Each row has the 4 feature chip toggles (Chef's, Popular, New, Limited) inline — same as current item-card pattern.

### Classifications tab
Two columns side by side:
- **Diets:** list with add/delete
- **Allergens:** list with add/delete

### Addons tab
Simple list: addon name, price, inline edit/delete.

---

## 5. Reviews Page

**Header row:** Total reviews count + large average star rating (e.g. ★ 4.8 — 24 reviews)  
**Filter pills:** All | ★ | ★★ | ★★★ | ★★★★ | ★★★★★  
**Table:** item thumbnail, item name, star visual, comment text (truncated), date  
Empty state: "No reviews yet — share your QR code to get started"

---

## 6. Audit Page

**Filter bar:** Action type (All / CREATE / UPDATE / DELETE), date range  
**Table:** 
- Action badge (CREATE=green, UPDATE=amber, DELETE=red)
- Entity type
- Entity name/id
- Performed by (user name)
- Timestamp (relative + absolute on hover)

Newest first. Pagination.

---

## 7. Settings Page

Tabbed: `[Brand] [Password] [Email]`

**Brand tab:** restaurant name, description, logo upload (placeholder), banner upload (placeholder), currency select, language select, address  
**Password tab:** current password, new password, confirm — with strength indicator  
**Email tab:** current email shown, new email input, OTP verification flow

---

## 8. Subscription Page

Keep existing logic, restyle cards to match new system:
- `rounded-2xl` cards consistent with rest
- Plan header uses gradient (keep existing gradients)
- Feature list uses new typography
- Active/Cancels state uses new green/orange badge style

---

## 9. Shared Components to Build

| Component | Used by |
|---|---|
| `AdminLayout` | All pages — wraps with navbar |
| `AdminNavbar` | Inside AdminLayout |
| `StatCard` | Dashboard |
| `ActivityFeed` | Dashboard |
| `QuickActions` | Dashboard |
| `PageTabs` | Menus, Settings |
| `DataTable` | Items, Reviews, Audit |

---

## 10. Implementation Order

1. `AdminLayout` + `AdminNavbar` — affects all pages immediately
2. Dashboard
3. Menus (tabs)
4. Reviews
5. Audit  
6. Settings
7. Subscription restyle
