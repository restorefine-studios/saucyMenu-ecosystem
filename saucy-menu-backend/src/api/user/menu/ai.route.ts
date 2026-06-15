import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import Elysia, { t } from "elysia";
import { userAuthPlugin } from "../../../middleware/auth";
import { db } from "../../../db";

const router = new Elysia({ prefix: '/ai', tags: ['ai'] }).use(userAuthPlugin)

router.post('/', async ({ store: { user }, body: { messages } }) => {
    const menuItemQueryResults = await db.query.menuItems.findMany({
        where: (table, { eq }) => eq(table.restaurantId, user?.restaurantId as string),
        with: {
            tags: {
                with: {
                    tag: {
                        columns: {
                            name: true,
                            type: true
                        }
                    }
                }
            }
        }
    })


    await Promise.all([menuItemQueryResults])
    const systemPrompt = `
You are a restaurant assistant. Only answer using the menu items provided in the JSON below. Do not invent menu items.

Here is the menu:

${JSON.stringify(menuItemQueryResults.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.description || 'No description',
        image: item?.images![0] ? process.env.MEDIA_SERVICE_URL + item?.images![0] : null,
        tags: item.tags.map((tag) => ({
            name: tag.tag.name,
            type: tag.tag.type || 'unknown'
        })) || [],
    })), null, 2)}

If a dish or drink matches the user's query, respond **only** with a JSON object like:

{
  "type": "menuItemResults",
  "menuItems": [
    {
      "name": "Menu Item Name",
      "price": "Price",
      "image": "Image URL",
      "description": "Short description"
      "id": "Menu Item ID",
      "type":"Item Type"
    }
  ]
}

Example user question:
"What gluten-free menu items with chicken do you have?"

Expected format:
{
  "type": "menuItemResults",
  "menuItems": [
    {
      "name": "Grilled Chicken Salad",
      "price": "12.99",
      "image": "https://...",
      "description": "Grilled chicken on mixed greens..."
      "id": "Menu Item ID",
      "type":"Item Type"
    }
  ]
}
Do not include any other explanation. If nothing matches, say it politely as a single text message.
`;
    const stream = streamText({
        model: openai('gpt-4o-mini'),
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages as any,
        ]
    })

    return stream.textStream

    // // UI Message Stream Response will use SSE
    // return stream.toUIMessageStreamResponse() 
}, {
    body: t.Object({
        messages: t.Array(t.Object({
            role: t.String(),
            content: t.String(),
        }))
    })
})

router.post('/:menuItemId', async ({ store: { user }, params: { menuItemId }, body: { messages }, set }) => {
    const menuItem = await db.query.menuItems.findFirst({
        where: (table, { eq, and }) => and(eq(table.id, menuItemId), eq(table.restaurantId, user?.restaurantId as string)),
        with: {
            tags: {
                with: {
                    tag: {
                        columns: {
                            name: true,
                            type: true
                        }
                    }
                }
            },
            addons: {
                with: {
                    addon: {
                        columns: {
                            name: true,
                            price: true
                        }
                    }
                }
            },
            allergens: {
                with: {
                    allergen: {
                        columns: {
                            name: true,
                        }
                    }
                }
            },

        }
    })

    const systemPrompt = `
    You are a restaurant assistant. Only answer using the menu item provided in the JSON below. Do not invent menu items. Answer the question in the user's language and do it like a waiter would. You don't take orders, you only answer questions about the menu item and ask the users to order at the restaurant.

    Here is the menu item:

    ${JSON.stringify(menuItem, null, 2)}

    Example user question:
    "What is the price of the menu item?"
    `
    const stream = streamText({
        model: openai('gpt-4o-mini'),
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages as any,
        ]
    })
    set.headers['Content-Type'] = 'text/plain; charset=utf-8'
    // Return the stream with proper headers
    return stream.textStream


}, {
    body: t.Object({
        messages: t.Array(t.Object({
            role: t.String(),
            content: t.String(),
        }))
    })
})

export default router   