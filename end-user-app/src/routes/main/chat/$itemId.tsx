import { useState, useRef, useEffect, useCallback } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowUp, ChevronLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { apiUrl, renderMediaUrl } from '@/lib/utils'
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { MenuItemCard } from '@/components/MenuItemCard'

export const Route = createFileRoute('/main/chat/$itemId')({
  component: ItemChat,
  validateSearch: (search) => ({
    item: search.item as any,
    menuId: search.menuId as string | undefined,
  }),
})

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function useItemChat(itemId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return
    abortRef.current?.abort()

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text }
    const allMessages = [...messages, userMsg]
    setMessages(allMessages)
    setInput('')
    setIsLoading(true)
    abortRef.current = new AbortController()

    try {
      const token = localStorage.getItem('saucy-user-token')
      const lang = localStorage.getItem('i18nextLng') ?? 'en'
      const res = await fetch(`${apiUrl}user/ai/${itemId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          lang,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error('Request failed')

      const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }
      setMessages(prev => [...prev, assistantMsg])

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant') last.content = buffer
          return updated
        })
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }])
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [messages, isLoading, itemId])

  useEffect(() => () => { abortRef.current?.abort() }, [])

  return { messages, input, setInput, isLoading, send }
}

function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) return <ReactMarkdown>{content}</ReactMarkdown>

  const trimmed = content.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed?.type === 'menuItemResults' && Array.isArray(parsed.menuItems)) {
        return (
          <div className="flex flex-col gap-2 w-full">
            {parsed.menuItems.map((item: any) => (
              <MenuItemCard
                key={item.id}
                id={item.id}
                name={item.name}
                description={item.description}
                price={item.price}
                images={item.image ? [item.image] : []}
                variant="list"
              />
            ))}
          </div>
        )
      }
    } catch {
      return null
    }
  }

  return <ReactMarkdown>{content}</ReactMarkdown>
}

const SUGGESTIONS = [
  "What's in this dish?",
  "Is it spicy?",
  "Any allergens I should know?",
  "How is it prepared?",
]

function ItemChat() {
  const router = useRouter()
  const { itemId } = Route.useParams()
  const { item } = Route.useSearch()
  const [user] = useAtom(userAtom)
  const { messages, input, setInput, isLoading, send } = useItemChat(itemId)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const imageUrl = item?.images?.[0] ? renderMediaUrl(item.images[0]) : null
  const price = item?.price ?? ''
  const currencySymbol = user?.currency?.symbol ?? ''

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    send(input)
  }

  return (
    <div className="h-screen flex flex-col bg-white">

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-safe-top pb-3 pt-3 border-b border-gray-100 shrink-0">
        <button
          onClick={() => router.history.back()}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#FFF4E8] flex items-center justify-center shrink-0">
            <img src="/saucy-ai-icon.svg" alt="" className="w-4 h-4" />
          </div>
          <p className="text-sm font-bold text-gray-900 truncate">Saucy AI</p>
        </div>
      </div>

      {/* Pinned item card */}
      {item && (
        <div className="mx-4 mt-3 mb-1 flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-3 shrink-0">
          {imageUrl ? (
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100">
              <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <span className="text-2xl">🍽️</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 capitalize leading-snug truncate">{item.name}</p>
            {item.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
            )}
          </div>
          {price && (
            <p className="text-sm font-bold text-[#F7941D] shrink-0">{currencySymbol}{price}</p>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col h-full justify-end pb-2">
            <p className="text-xs text-gray-400 text-center mb-4">Ask me anything about this dish</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-3 py-1.5 rounded-full bg-orange-50 text-[#F7941D] text-xs font-medium border border-orange-100 active:scale-95 transition-transform"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => {
              const isJson = msg.role === 'assistant' && msg.content.trim().startsWith('{')
              return (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-[#FFF4E8] flex items-center justify-center shrink-0">
                      <img src="/saucy-ai-icon.svg" alt="" className="w-4 h-4" />
                    </div>
                  )}
                  <div className={`max-w-[85%] text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'px-3.5 py-2.5 bg-[#F7941D] text-white rounded-2xl rounded-br-sm'
                      : isJson
                      ? 'w-full'
                      : 'px-3.5 py-2.5 bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm'
                  }`}>
                    <MessageContent content={msg.content} isUser={msg.role === 'user'} />
                  </div>
                </div>
              )
            })}
            {isLoading && (
              <div className="flex items-end gap-2">
                <div className="w-6 h-6 rounded-full bg-[#FFF4E8] flex items-center justify-center shrink-0">
                  <img src="/saucy-ai-icon.svg" alt="" className="w-4 h-4" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 px-4 py-3 border-t border-gray-100 bg-white pb-safe-bottom">
        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Ask about ${item?.name ?? 'this dish'}...`}
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-full bg-[#F7941D] flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
          >
            <ArrowUp className="w-4 h-4 text-white" />
          </button>
        </div>
      </form>

    </div>
  )
}
