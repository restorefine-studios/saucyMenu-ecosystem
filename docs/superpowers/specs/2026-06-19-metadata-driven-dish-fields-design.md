# Metadata-driven picker fields for dish-item forms

## Context

`restaurant-admin`'s dish add/edit form (`menus/items/add/`) has four near-identical
picker fields — `allergens.tsx`, `diets.tsx`, `addons.tsx`, `ingredients.tsx` — each
hardcoding its own label, options source, and checkbox/tag-input markup. Adding,
reordering, hiding, or relabeling one of these fields today requires an engineer to
edit code and deploy.

This design makes those four fields driven by metadata that super-admin can edit at
runtime (reorder, show/hide, relabel, toggle required), without code changes or a
deploy.

### Explicitly out of scope

- The old `menu/` (singular) drink forms — not migrated in this effort. Follow-up.
- Core dish fields (name, price, description, images, discount) — stay hardcoded;
  they have unique layout/logic that doesn't fit a generic field shape.
- Per-restaurant field customization — config is global, one shared definition for
  all restaurants. Restaurants still manage their own *option values* (their own
  allergen/addon list) as today; only the field *definitions* are global.
- Adding entirely new field keys/types at runtime — the four `key`s are fixed.
  Super-admin can reorder/hide/relabel/require the existing four, not invent a
  fifth. Inventing a new field still requires an engineer to add a key to the
  backend allowlist and a corresponding component (or, for lookup fields, just an
  endpoint) — see Future Work.
- Multi-language labels for relabeled fields — relabeling sets one literal string
  used regardless of admin language; i18n is dropped for that field once relabeled.

## Data model

New table in `saucy-menu-backend-go`:

```sql
CREATE TABLE form_field_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_key TEXT UNIQUE NOT NULL,
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
```

Seed one row, `form_key = 'dish_item'`, with the current four fields in current
order:

```json
{
  "fields": [
    { "key": "allergens", "label": "Allergens", "visible": true, "required": false,
      "sortOrder": 0, "optionsSource": { "type": "lookup", "endpoint": "/allergens" } },
    { "key": "diets", "label": "Diets", "visible": true, "required": false,
      "sortOrder": 1, "optionsSource": { "type": "lookup", "endpoint": "/tags?type=diet" } },
    { "key": "addons", "label": "Add-ons", "visible": true, "required": false,
      "sortOrder": 2, "optionsSource": { "type": "lookup", "endpoint": "/addons" } },
    { "key": "ingredients", "label": "Ingredients", "visible": true, "required": false,
      "sortOrder": 3, "optionsSource": { "type": "freetext" } }
  ]
}
```

`key` identifies which underlying data the field binds to (matches existing
`MenuItem` relations/columns) and is immutable from the UI. `optionsSource.type`
is `"lookup"` (fetch options from an endpoint — allergens/diets/addons) or
`"freetext"` (no options call — ingredients, a plain `string[]` on `MenuItem`).

## Backend API

`saucy-menu-backend-go`, two endpoints:

- `GET /admin/form-config/:formKey` — authenticated restaurant-admin or
  super-admin. Returns `config` as-is. Used by restaurant-admin to render the
  form and by super-admin to populate its edit screen.

- `PUT /admin/form-config/:formKey` — super-admin only (role-gated). Body is the
  full `fields` array; whole-document replace, no partial patch. Validates before
  writing:

  ```go
  var allowedKeys = map[string][]string{
      "dish_item": {"allergens", "diets", "addons", "ingredients"},
  }

  func validateSortOrder(fields []FieldConfig) error {
      seen := make([]bool, len(fields))
      for _, f := range fields {
          if f.SortOrder < 0 || f.SortOrder >= len(fields) || seen[f.SortOrder] {
              return errors.New("sortOrder must be a 0..n-1 permutation with no gaps or duplicates")
          }
          seen[f.SortOrder] = true
      }
      return nil
  }
  ```

  Reject any submitted `key` not in `allowedKeys[formKey]` with 400. Reject if
  `validateSortOrder` fails. Only then overwrite `config`, stamp
  `updated_at`/`updated_by`.

## restaurant-admin: generic renderer

New `MetaPickerField` component replaces `allergens.tsx` / `diets.tsx` /
`addons.tsx` / `ingredients.tsx` in `menus/items/add/components/`:

```tsx
function MetaPickerField({ config, value, onChange }: {
  config: FieldConfig
  value: string[]
  onChange: (v: string[]) => void
}) {
  if (!config.visible) return null

  if (config.optionsSource.type === 'freetext') {
    return <TagInput label={config.label} value={value} onChange={onChange} required={config.required} />
  }

  const { data: options = [] } = useQuery({
    queryKey: ['lookup', config.optionsSource.endpoint],
    queryFn: () => fetch(config.optionsSource.endpoint).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  return <CheckboxGrid label={config.label} options={options} value={value} onChange={onChange} required={config.required} />
}
```

`CheckboxGrid` and `TagInput` are extracted from the existing four components'
JSX (markup largely unchanged), parameterized by `label`/`options`/`required`
instead of hardcoded per-component. `options` defaults to `[]` while the lookup
query is loading, so `CheckboxGrid` always receives an array and never flashes
broken UI on first render.

The parent form (`menus/items/add/index.tsx`) fetches the `dish_item` config once
(`GET /admin/form-config/dish_item`, same `staleTime: 5 * 60 * 1000` — it only
changes when super-admin edits it), sorts by `sortOrder`, and maps over visible
fields rendering one `MetaPickerField` per entry — replacing the four hardcoded
`<Allergens/>` / `<Diets/>` / `<Addons/>` / `<Ingredients/>` imports with one loop.

**Error handling:** if the config fetch fails, fall back to a hardcoded default
(all four fields, current order, visible, not required). Core form fields
(name/price/images) are unaffected since they aren't metadata-driven.

## super-admin: management UI

New page, `super-admin/src/pages/admin/FormFields/` (exact location TBD at
implementation time, following existing super-admin routing conventions):

- Fetches `GET /admin/form-config/dish_item`, renders the four fields as a
  reorderable list (drag handle — reuse whatever drag library is already in the
  codebase if one exists; otherwise simple up/down buttons rather than adding a
  new dependency for four list items).
- Per field: text input for `label`, toggle for `visible`, toggle for `required`.
- Drag/reorder only changes in-memory array order. `sortOrder` is never read or
  written during drag — it's derived fresh from final array position at save
  time:

  ```ts
  function handleSave(reorderedFields: FieldConfig[]) {
    const payload = {
      fields: reorderedFields.map((f, i) => ({ ...f, sortOrder: i })),
    }
    return putFormConfig('dish_item', payload)
  }
  ```

- No add/delete controls — the four `key`s are fixed, matching the backend
  allowlist.

## Testing

- Backend: unit tests for `validateSortOrder` (valid permutation, gap, duplicate,
  out-of-range) and the `allowedKeys` rejection path (unknown key → 400).
- restaurant-admin: render `MetaPickerField` with a `lookup` config and a
  `freetext` config, assert correct sub-component renders; assert `visible: false`
  renders nothing; assert fallback default renders when config fetch fails.
- super-admin: reorder list, save, assert `sortOrder` in the PUT payload matches
  final array position regardless of original `sortOrder` values in the fetched
  config.

## Future work (not in this design)

- Migrate the old `menu/` (singular) drink forms onto this same system.
- Per-restaurant field overrides, if a real need emerges.
- Support for adding genuinely new field keys/types without an engineer change.
