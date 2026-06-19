package formconfig

import "fmt"

type OptionsSource struct {
	Type     string `json:"type"`
	Endpoint string `json:"endpoint,omitempty"`
}

type FieldConfig struct {
	Key           string        `json:"key"`
	Label         string        `json:"label"`
	Visible       bool          `json:"visible"`
	Required      bool          `json:"required"`
	SortOrder     int           `json:"sortOrder"`
	OptionsSource OptionsSource `json:"optionsSource"`
}

type FormFieldsPayload struct {
	Fields []FieldConfig `json:"fields"`
}

var allowedKeys = map[string][]string{
	"dish_item": {"allergens", "diets", "addons", "ingredients"},
}

// ValidateKeys rejects any field whose Key is not in the allowlist for formKey,
// and rejects formKey itself if it has no allowlist entry.
func ValidateKeys(formKey string, fields []FieldConfig) error {
	allowed, ok := allowedKeys[formKey]
	if !ok {
		return fmt.Errorf("unknown form key %q", formKey)
	}
	allowedSet := make(map[string]bool, len(allowed))
	for _, k := range allowed {
		allowedSet[k] = true
	}
	for _, f := range fields {
		if !allowedSet[f.Key] {
			return fmt.Errorf("field key %q is not allowed for form %q", f.Key, formKey)
		}
	}
	return nil
}

// ValidateSortOrder requires SortOrder values across fields to form an exact
// 0..n-1 permutation — no gaps, no duplicates, no out-of-range values.
func ValidateSortOrder(fields []FieldConfig) error {
	seen := make([]bool, len(fields))
	for _, f := range fields {
		if f.SortOrder < 0 || f.SortOrder >= len(fields) || seen[f.SortOrder] {
			return fmt.Errorf("sortOrder must be a 0..%d permutation with no gaps or duplicates", len(fields)-1)
		}
		seen[f.SortOrder] = true
	}
	return nil
}
