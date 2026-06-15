package httpx

import (
	"math"
	"net/http"
)

type PageMeta struct {
	Total  int64 `json:"total"`
	Limit  int   `json:"limit"`
	Offset int   `json:"offset"`
	Page   int   `json:"page"`
	Pages  int   `json:"pages"`
}

type PagedResponse struct {
	Data any      `json:"data"`
	Meta PageMeta `json:"meta"`
}

func Paginate(data any, total int64, limit, offset int) PagedResponse {
	if limit <= 0 {
		limit = 10
	}
	pages := int(math.Ceil(float64(total) / float64(limit)))
	page := offset/limit + 1
	return PagedResponse{
		Data: data,
		Meta: PageMeta{Total: total, Limit: limit, Offset: offset, Page: page, Pages: pages},
	}
}

// WritePagedSuccess writes a paginated response matching the Bun backend's spread format:
// { success: true, data: [...], meta: {...} }
func WritePagedSuccess(w http.ResponseWriter, status int, data any, total int64, limit, offset int) {
	paged := Paginate(data, total, limit, offset)
	writeJSON(w, status, map[string]any{
		"success": true,
		"data":    paged.Data,
		"meta":    paged.Meta,
	})
}

// WritePaginatedSpread matches the Bun `paginate()` spread format used by
// reviews, audit, and old dishes pages:
// { success, data: [...], pagination: { totalItems, limit, offset, hasNextPage, hasPreviousPage } }
func WritePaginatedSpread(w http.ResponseWriter, status int, data any, total int64, limit, offset int) {
	writeJSON(w, status, map[string]any{
		"success": true,
		"data":    data,
		"pagination": map[string]any{
			"totalItems":      total,
			"limit":           limit,
			"offset":          offset,
			"hasNextPage":     int64(offset+limit) < total,
			"hasPreviousPage": offset > 0,
		},
	})
}

// WritePaginatedNested matches the Bun `paginationResponse()` nested format used by
// new menu items pages (item-list.tsx):
// { success, data: { result: [...], pagination: { total, limit, offset, hasNextPage, hasPreviousPage } } }
func WritePaginatedNested(w http.ResponseWriter, status int, data any, total int64, limit, offset int) {
	writeJSON(w, status, map[string]any{
		"success": true,
		"data": map[string]any{
			"result": data,
			"pagination": map[string]any{
				"total":           total,
				"limit":           limit,
				"offset":          offset,
				"hasNextPage":     int64(offset+limit) < total,
				"hasPreviousPage": offset > 1,
			},
		},
	})
}
