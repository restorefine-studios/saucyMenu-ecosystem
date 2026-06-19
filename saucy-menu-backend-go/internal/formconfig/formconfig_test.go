package formconfig

import "testing"

func TestValidateSortOrder(t *testing.T) {
	cases := []struct {
		name    string
		fields  []FieldConfig
		wantErr bool
	}{
		{"valid permutation", []FieldConfig{{SortOrder: 0}, {SortOrder: 1}, {SortOrder: 2}, {SortOrder: 3}}, false},
		{"duplicate", []FieldConfig{{SortOrder: 0}, {SortOrder: 0}, {SortOrder: 1}, {SortOrder: 2}}, true},
		{"gap", []FieldConfig{{SortOrder: 0}, {SortOrder: 1}, {SortOrder: 3}}, true},
		{"negative", []FieldConfig{{SortOrder: -1}, {SortOrder: 0}}, true},
		{"out of range", []FieldConfig{{SortOrder: 0}, {SortOrder: 5}}, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := ValidateSortOrder(c.fields)
			if c.wantErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !c.wantErr && err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
		})
	}
}

func TestValidateKeys(t *testing.T) {
	cases := []struct {
		name    string
		formKey string
		fields  []FieldConfig
		wantErr bool
	}{
		{"all valid", "dish_item", []FieldConfig{{Key: "allergens"}, {Key: "diets"}, {Key: "addons"}, {Key: "ingredients"}}, false},
		{"unknown key", "dish_item", []FieldConfig{{Key: "allergens"}, {Key: "made_up_field"}}, true},
		{"unknown form", "drink_item", []FieldConfig{{Key: "allergens"}}, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := ValidateKeys(c.formKey, c.fields)
			if c.wantErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !c.wantErr && err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
		})
	}
}
