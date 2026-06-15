package httpx

import (
	"strconv"

	"github.com/jackc/pgx/v5/pgtype"
)

// NumericToString converts a pgtype.Numeric to a decimal string (e.g. "12.99").
// Safe for prices (2 decimal places, max 10 digits). Uses float64 conversion.
func NumericToString(n pgtype.Numeric) string {
	if !n.Valid {
		return "0.00"
	}
	f, err := n.Float64Value()
	if err != nil || !f.Valid {
		return "0.00"
	}
	return strconv.FormatFloat(f.Float64, 'f', 2, 64)
}
