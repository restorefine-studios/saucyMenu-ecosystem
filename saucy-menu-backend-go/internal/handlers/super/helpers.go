package super

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

func parseUUID(s string) (pgtype.UUID, error) {
	s = strings.ReplaceAll(s, "-", "")
	if len(s) != 32 {
		return pgtype.UUID{}, fmt.Errorf("invalid UUID")
	}
	var uid pgtype.UUID
	for i := 0; i < 16; i++ {
		var b byte
		if _, err := fmt.Sscanf(s[i*2:i*2+2], "%02x", &b); err != nil {
			return pgtype.UUID{}, err
		}
		uid.Bytes[i] = b
	}
	uid.Valid = true
	return uid, nil
}

func pgUUIDToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func pgTimestampToString(t pgtype.Timestamp) string {
	if !t.Valid {
		return ""
	}
	return t.Time.UTC().Format(time.RFC3339)
}

func ptrStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// generateSlug converts a restaurant name to a URL-friendly slug.
// "Harpreet Dai ko Hyakula" → "harpreet-dai-ko-hyakula"
func generateSlug(name string) string {
	slug := strings.ToLower(strings.TrimSpace(name))
	// Replace any non-alphanumeric chars with hyphens
	re := regexp.MustCompile(`[^a-z0-9]+`)
	slug = re.ReplaceAllString(slug, "-")
	return strings.Trim(slug, "-")
}

func generateCode(n int) string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = chars[uint8(time.Now().UnixNano()>>uint(i*3))%uint8(len(chars))]
	}
	return string(b)
}
