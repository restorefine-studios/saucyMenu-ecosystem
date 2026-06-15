package user

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"

	authm "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
	oaiclient "github.com/restorefine-studios/saucy-menu-backend-go/internal/integrations/openai"
)

type AIHandler struct {
	q          *sqlc.Queries
	openai     *oaiclient.Client
	mediaURL   string
}

func NewAIHandler(q *sqlc.Queries, openai *oaiclient.Client, mediaURL string) *AIHandler {
	return &AIHandler{q: q, openai: openai, mediaURL: mediaURL}
}

// POST /user/ai/
func (h *AIHandler) MenuChat(w http.ResponseWriter, r *http.Request) {
	user := authm.GetEndUser(r.Context())
	var body struct {
		Messages []oaiclient.Message `json:"messages"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	rid, err := parseUUID(user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid restaurantId in token")
		return
	}

	ctx := r.Context()
	items, err := h.q.ListMenuItemsForAI(ctx, rid)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch menu items")
		return
	}

	// Batch fetch tags for AI context
	itemIDs := make([]pgtype.UUID, len(items))
	for i, it := range items {
		itemIDs[i] = it.ID
	}
	tagRows, _ := h.q.ListItemTagsForAI(ctx, itemIDs)
	tagsMap := map[string][]map[string]string{}
	for _, t := range tagRows {
		id := pgUUIDToString(t.MenuItemID)
		tagsMap[id] = append(tagsMap[id], map[string]string{
			"name": t.Name,
			"type": string(t.Type),
		})
	}

	menuJSON := make([]map[string]any, 0, len(items))
	for _, it := range items {
		mid := pgUUIDToString(it.ID)
		var image string
		if len(it.Images) > 0 && it.Images[0] != "" {
			image = h.mediaURL + it.Images[0]
		}
		menuJSON = append(menuJSON, map[string]any{
			"id":          mid,
			"name":        it.Name,
			"price":       httpx.NumericToString(it.Price),
			"description": ptrStr(it.Description),
			"image":       image,
			"type":        it.Type,
			"tags":        tagsMap[mid],
		})
	}

	menuStr, _ := json.MarshalIndent(menuJSON, "", "  ")
	systemPrompt := fmt.Sprintf(`You are a restaurant assistant. Only answer using the menu items provided in the JSON below. Do not invent menu items.

Here is the menu:

%s

If a dish or drink matches the user's query, respond **only** with a JSON object like:

{
  "type": "menuItemResults",
  "menuItems": [
    {
      "name": "Menu Item Name",
      "price": "Price",
      "image": "Image URL",
      "description": "Short description",
      "id": "Menu Item ID",
      "type": "Item Type"
    }
  ]
}

Do not include any other explanation. If nothing matches, say it politely as a single text message.`, string(menuStr))

	if err := h.openai.StreamChat(ctx, w, systemPrompt, body.Messages); err != nil {
		// Stream already started — can't write a JSON error
		return
	}
}

// POST /user/ai/:menuItemId
func (h *AIHandler) ItemChat(w http.ResponseWriter, r *http.Request) {
	user := authm.GetEndUser(r.Context())
	var body struct {
		Messages []oaiclient.Message `json:"messages"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	rid, err := parseUUID(user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid restaurantId in token")
		return
	}
	itemID, err := parseUUID(chi.URLParam(r, "menuItemId"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid menuItemId")
		return
	}

	ctx := r.Context()
	item, err := h.q.GetMenuItemForAI(ctx, sqlc.GetMenuItemForAIParams{
		ID:           itemID,
		RestaurantID: rid,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "menu item not found")
		return
	}

	itemJSON, _ := json.MarshalIndent(item, "", "  ")
	systemPrompt := fmt.Sprintf(`You are a restaurant assistant. Only answer using the menu item provided in the JSON below. Do not invent menu items. Answer the question in the user's language and do it like a waiter would. You don't take orders, you only answer questions about the menu item and ask the users to order at the restaurant.

Here is the menu item:

%s`, string(itemJSON))

	if err := h.openai.StreamChat(ctx, w, systemPrompt, body.Messages); err != nil {
		return
	}
}
