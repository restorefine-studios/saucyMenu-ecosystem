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
	systemPrompt := fmt.Sprintf(`You are a knowledgeable and friendly restaurant assistant. You have full access to this restaurant's menu below and you should use it to give genuinely helpful answers.

Here is the menu:

%s

Guidelines:

1. RECOMMENDATIONS — When asked for recommendations, suggestions, or what's good, always pick the best items from the menu based on their descriptions, tags, and type. Never refuse. Respond with this JSON only (no extra text):

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

2. QUESTIONS ABOUT DISHES — When asked about ingredients, allergens, dietary suitability, spice level, or dish details, answer conversationally in plain text. Use the item's description and tags to reason about likely allergens (e.g. bread = gluten, butter = dairy, garlic = allium). Be specific and honest — if the description mentions an ingredient, call it out. Always add a note to confirm with staff for severe allergies.

3. SEARCH / FILTER — If the user wants dishes matching a criteria (vegetarian, halal, gluten free, under a price, etc.), return matching items as JSON (same format as rule 1).

4. GENERAL CHAT — Answer naturally and helpfully. You know this menu inside out.

Never say you cannot help when the answer can be reasonably inferred from the menu data.`, string(menuStr))

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
	systemPrompt := fmt.Sprintf(`You are a knowledgeable restaurant assistant helping a diner learn about a specific dish. Answer questions about the dish using only the information provided below. Be conversational and helpful.

Rules:
- Answer in the same language the user writes in.
- Only use the dish data provided — do not invent details.
- Never suggest ordering, placing an order, or ask if the user wants to order. This is an information app, not an ordering system.
- Never end your response with prompts like "Would you like to order?" or "Shall I add this to your order?" or anything similar.
- If asked something not covered by the dish data, say you don't have that detail and suggest asking the staff directly.

Here is the dish:

%s`, string(itemJSON))

	if err := h.openai.StreamChat(ctx, w, systemPrompt, body.Messages); err != nil {
		return
	}
}
