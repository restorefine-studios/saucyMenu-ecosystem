# Translation Files - Missing Keys Analysis

## Critical Structural Issue: aiPretext Format

**English (en.json)**: Uses ARRAY format with 5 objects

```json
"aiPretext": [
  {"title": "...", "subtext": "..."},
  {"title": "...", "subtext": "..."},
  ...
]
```

**All other languages**: Use OBJECT format with numbered keys

```json
"aiPretext": {
  "0": {"title": "...", "subtext": "..."},
  "1": {"title": "...", "subtext": "..."},
  ...
}
```

---

## Missing Keys by Language

### Chinese (zh.json) - 28 Missing Keys

#### Missing from languageSelect:

- `loading`
- `notFound`

#### Missing from foodProfile:

- `addons`
- `variants`

#### Missing entirely:

- `menuItems` (entire section - 4 keys)
  - `title`
  - `searchPlaceholder`
  - `loadingMessage.more`
  - `loadingMessage.scroll`

- `ai.logoAlt`

- `common` (entire section - 3 keys)
  - `mins`
  - `back`
  - `notFound`

- `menus` (entire section - 4 keys)
  - `addAllergensDiets`
  - `seeOurMenus`
  - `chefsRecommendations`
  - `whatsPopular`

- `modal` (entire section - 10 keys)
  - `addAllergensDiets`
  - `description`
  - `cancel`
  - `updating`
  - `applyFilters`
  - `allergens`
  - `searchAllergens`
  - `diets`
  - `searchDiets`
  - `preferencesUpdated`
  - `failedUpdate`

- `ui` (entire section - 10 keys)
  - `starRating.outOf`
  - `starRating.star`
  - `starRating.stars`
  - `spiceLevel.mild`
  - `spiceLevel.medium`
  - `spiceLevel.hot`
  - `spiceLevel.extraHot`
  - `spiceLevel.extreme`
  - `nullState.title`
  - `nullState.subtitle`
  - `spinner.loading`

---

### Romanian (ro.json) - 28 Missing Keys

**Same missing keys as Chinese (zh.json)**

---

### Portuguese (pt.json) - 28 Missing Keys

**Same missing keys as Chinese (zh.json)**

---

### Polish (pl.json) - 28 Missing Keys

**Same missing keys as Chinese (zh.json)**

---

### Dutch (nl.json) - 28 Missing Keys

**Same missing keys as Chinese (zh.json)**

---

### Japanese (ja.json) - 28 Missing Keys

**Same missing keys as Chinese (zh.json)**

---

### Italian (it.json) - 28 Missing Keys

**Same missing keys as Chinese (zh.json)**

---

### Spanish (es.json) - 28 Missing Keys

**Same missing keys as Chinese (zh.json)**

---

### German (de.json) - 28 Missing Keys

**Same missing keys as Chinese (zh.json)**

---

### Arabic (ar.json) - 28 Missing Keys

**Same missing keys as Chinese (zh.json)**

---

### Hindi (hi.json) - 26 Missing Keys

**Note: Hindi has correct aiPretext ARRAY format like English**

#### Missing from foodProfile:

- `addons`
- `variants`

#### Missing entirely:

- `menuItems` (entire section - 4 keys)
  - `title`
  - `searchPlaceholder`
  - `loadingMessage.more`
  - `loadingMessage.scroll`

- `ai.logoAlt`

- `common` (entire section - 3 keys)
  - `mins`
  - `back`
  - `notFound`

- `menus` (entire section - 4 keys)
  - `addAllergensDiets`
  - `seeOurMenus`
  - `chefsRecommendations`
  - `whatsPopular`

- `modal` (entire section - 10 keys)
  - `addAllergensDiets`
  - `description`
  - `cancel`
  - `updating`
  - `applyFilters`
  - `allergens`
  - `searchAllergens`
  - `diets`
  - `searchDiets`
  - `preferencesUpdated`
  - `failedUpdate`

- `ui` (entire section - 10 keys)
  - `starRating.outOf`
  - `starRating.star`
  - `starRating.stars`
  - `spiceLevel.mild`
  - `spiceLevel.medium`
  - `spiceLevel.hot`
  - `spiceLevel.extraHot`
  - `spiceLevel.extreme`
  - `nullState.title`
  - `nullState.subtitle`
  - `spinner.loading`

---

### French (fr.json) - 29 Missing Keys

**Same as Chinese PLUS:**

#### Additional Missing:

- `optionsSelect.backBtn`

---

## Summary Statistics

| Language                  | Missing Keys | aiPretext Format | Completeness |
| ------------------------- | ------------ | ---------------- | ------------ |
| English                   | 0            | Array            | 100%         |
| Hindi                     | 26           | Array            | 87.2%        |
| French                    | 29           | Object           | 85.7%        |
| All Others (10 languages) | 28           | Object           | 86.2%        |

## Missing Sections Breakdown

### menuItems (4 keys) - Missing in 11 languages

- `title`
- `searchPlaceholder`
- `loadingMessage.more`
- `loadingMessage.scroll`

### ui (10 keys) - Missing in 11 languages

- `starRating.outOf`
- `starRating.star`
- `starRating.stars`
- `spiceLevel.mild`
- `spiceLevel.medium`
- `spiceLevel.hot`
- `spiceLevel.extraHot`
- `spiceLevel.extreme`
- `nullState.title`
- `nullState.subtitle`
- `spinner.loading`

### modal (10 keys) - Missing in 11 languages

- `addAllergensDiets`
- `description`
- `cancel`
- `updating`
- `applyFilters`
- `allergens`
- `searchAllergens`
- `diets`
- `searchDiets`
- `preferencesUpdated`
- `failedUpdate`

### menus (4 keys) - Missing in 11 languages

- `addAllergensDiets`
- `seeOurMenus`
- `chefsRecommendations`
- `whatsPopular`

### common (3 keys) - Missing in 11 languages

- `mins`
- `back`
- `notFound`

### Other Individual Keys

- `foodProfile.addons` - Missing in 11 languages
- `foodProfile.variants` - Missing in 11 languages
- `ai.logoAlt` - Missing in 11 languages
- `languageSelect.loading` - Missing in 11 languages
- `languageSelect.notFound` - Missing in 11 languages
- `optionsSelect.backBtn` - Missing in 1 language (French)

---

## Priority Action Plan

### URGENT Priority

1. **Fix aiPretext structure**: Convert all object-format aiPretext to array format (11 languages)
2. **Add menuItems section**: Critical for menu functionality (11 languages)

### HIGH Priority

3. **Add ui section**: Required for UI components (11 languages)
4. **Add modal section**: Required for modal dialogs (11 languages)
5. **Add common section**: Common UI elements (11 languages)
6. **Add menus section**: Menu-related navigation (11 languages)

### MEDIUM Priority

7. **Add remaining individual keys** to complete translations
8. **Review French file** for the missing `optionsSelect.backBtn` key
