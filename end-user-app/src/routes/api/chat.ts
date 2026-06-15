import { createFileRoute } from '@tanstack/react-router'
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const Route = createFileRoute('/api/chat')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                const openai = createOpenAI({
                    apiKey: process.env.OPENAI_API_KEY,
                })
                // console.log('request', request)
                // console.log('OPENAI_API_KEY', process.env.OPENAI_API_KEY)
                const body = await request.json()
                const messages = body.messages
                const menuItem = body.menuItem
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

                return stream.toTextStreamResponse()
            }
        }
    }
})
