import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowUp, X } from 'lucide-react'
import { apiUrl } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { MenuItemCard } from '@/components/MenuItemCard'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function useMenuAIChat() {
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
      const res = await fetch(`${apiUrl}user/ai`, {
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
  }, [messages, isLoading])

  useEffect(() => () => { abortRef.current?.abort() }, [])

  return { messages, input, setInput, isLoading, send }
}

function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) return <ReactMarkdown>{content}</ReactMarkdown>

  // If it looks like JSON but isn't complete yet — hide until parseable
  const trimmed = content.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed?.type === 'menuItemResults' && Array.isArray(parsed.menuItems)) {
        return (
          <div className="flex flex-col gap-2 w-full -mx-1">
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
      // incomplete JSON while streaming — show nothing
      return null
    }
  }

  return <ReactMarkdown>{content}</ReactMarkdown>
}

const SUGGESTIONS = [
  "What do you recommend?",
  "Any vegetarian options?",
  "What's gluten free?",
  "What's most popular?",
]

export function MenuAIDrawer() {
  const [open, setOpen] = useState(false)
  const { messages, input, setInput, isLoading, send } = useMenuAIChat()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    send(input)
  }

  return (
    <>
      {/* Floating trigger button */}
      <div data-tour="ai-button" className="fixed bottom-6 right-4 z-40 ai-ring" style={{ width: 76, height: 76 }}>
        <button
          onClick={() => setOpen(true)}
          className="absolute inset-[3px] rounded-full flex items-center justify-center bg-white active:scale-95 transition-transform"
          aria-label="Ask Saucy AI"
        >
          <img src="/saucy-ai-icon.svg" alt="Saucy AI" className="w-14 h-14" />
        </button>
      </div>

      <style>{`
        @keyframes ai-spin { to { --ai-angle: 360deg; } }
        @property --ai-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        .ai-ring {
          border-radius: 9999px;
          background: conic-gradient(from var(--ai-angle), #f7941d, #fbbf24, #fff7ed, #fbbf24, #f7941d);
          animation: ai-spin 3s linear infinite;
          box-shadow: 0 0 20px 6px rgba(247,148,29,0.5), 0 0 44px 10px rgba(251,191,36,0.2);
        }
      `}</style>

      <Drawer open={open} onOpenChange={setOpen} direction="bottom">
        <DrawerContent className="h-[82vh] flex flex-col px-0 pb-0">

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-2 pb-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#FFF4E8] flex items-center justify-center">
                <img src="/saucy-ai-icon.svg" alt="" className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Saucy AI</p>
                <p className="text-[10px] text-gray-400">Ask me anything about the menu</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col h-full justify-end pb-2">
                <p className="text-xs text-gray-400 text-center mb-4">Try asking something</p>
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
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-[#FFF4E8] flex items-center justify-center shrink-0">
                        <img src="/saucy-ai-icon.svg" alt="" className="w-4 h-4" />
                      </div>
                    )}
                    {(() => {
                      const isJson = msg.role === 'assistant' && msg.content.trim().startsWith('{')
                      return (
                        <div className={`max-w-[90%] text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'px-3.5 py-2.5 bg-[#F7941D] text-white rounded-2xl rounded-br-sm'
                            : isJson
                            ? 'w-full'
                            : 'px-3.5 py-2.5 bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm'
                        }`}>
                          <MessageContent content={msg.content} isUser={msg.role === 'user'} />
                        </div>
                      )
                    })()}
                  </div>
                ))}
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
          <form onSubmit={handleSubmit} className="shrink-0 px-4 py-3 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about the menu..."
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

          <div className="h-safe-bottom shrink-0" />
        </DrawerContent>
      </Drawer>
    </>
  )
}
