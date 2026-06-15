import { chatStoreAtom, userAtom } from '@/atoms/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { renderMediaUrl } from '@/lib/utils'
import { useAtom } from 'jotai'
import { ArrowUp, ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useOptimizedChat } from '@/hooks/chat'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'

// Types
interface Dish {
  id: string
  name: string
  description: string
  image?: string
  price?: number
  type: 'food' | 'drink'
}

interface ParsedMessage {
  type: 'dishResults'
  dishes: Dish[]
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export const Route = createFileRoute('/main/chat/$itemId')({
  component: Chat,
  validateSearch: (search) => {
    return {
      item: search.item as any,
      menuId: search.menuId,
    }
  },
})

// Components
const ChatHeader = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const { itemId } = Route.useParams()
  const { menuId } = Route.useSearch()

  return (
    <section className="w-full flex items-center h-24 bg-background">
      <div
        onClick={() =>
          router.navigate({
            from: '/main/chat/$itemId',
            to: '/main/food/$itemId',
            params: { itemId: itemId as string },
            search: {
              menuId: menuId as string,
              categoryItem: false,
            },
          })
        }
        className="w-fit px-5 flex items-center gap-x-1 cursor-pointer"
      >
        <ChevronLeft className="w-5 h-5 font-bold" />
        <span className="text-lg font-normal">{t('ai.header')}</span>
      </div>
    </section>
  )
}

const WelcomeScreen = ({
  onPresetClick,
}: {
  onPresetClick: (text: string) => void
}) => {
  const { t } = useTranslation()
  const aiPretext = t('aiPretext', { returnObjects: true })

  if (!Array.isArray(aiPretext)) return null

  return (
    <div className="w-full flex flex-col h-full items-start mb-0 justify-end">
      <section className="w-fit flex gap-2 overflow-auto hide-scrollbar">
        {aiPretext.map((item: any, index: number) => (
          <div
            key={index}
            onClick={() =>
              onPresetClick(`${item.title} ${item.subtext}`.trim())
            }
            className="w-72 h-auto bg-muted rounded-xl p-4 cursor-pointer hover:bg-accent transition"
          >
            <span className="text-md font-medium block text-foreground mb-1">
              {item.title}
            </span>
            <span className="font-normal text-muted-foreground block">
              {item.subtext}
            </span>
          </div>
        ))}
      </section>
    </div>
  )
}

const DishResults = ({ dishes }: { dishes: Dish[] }) => {
  const [user] = useAtom(userAtom)

  return (
    <div className="grid gap-3">
      {dishes.map((dish) => (
        <Link
          to="/main/food"
          params={{
            itemId: dish.id,
          }}
          key={dish.id}
          className="bg-card rounded-lg overflow-hidden border border-border shadow-sm flex hover:shadow-md transition-all duration-200"
        >
          <div className="w-24 h-full sm:w-28 sm:h-28 shrink-0">
            <img
              src={renderMediaUrl(dish.image as string) ?? ''}
              alt={dish.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 p-3 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-card-foreground">{dish.name}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                {dish.description}
              </p>
            </div>
            {dish.type !== 'drink' && dish.price && (
              <div className="mt-2">
                <span className="text-green-600 font-semibold text-sm">
                  {user?.currency?.symbol} {dish.price}
                </span>
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}

const MessageBubble = ({
  message,
  isUser,
}: {
  message: ChatMessage
  isUser: boolean
}) => {
  let parsed: ParsedMessage | null = null
  try {
    parsed = JSON.parse(message.content)
  } catch {
    // Not JSON, render as text
  }

  const isDishResults =
    parsed?.type === 'dishResults' && Array.isArray(parsed.dishes)

  return (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <>
          <div className="bg-foreground h-8 w-8 p-2 rounded-full flex items-center justify-center self-end mr-2">
            <img
              src="/saucy-logo.png"
              // alt={t('ai.logoAlt')}
              className="object-contain dark:invert"
            />
          </div>
          <div className="w-3 h-3 bg-[#FFEAD0] dark:bg-muted rotate-45 ml-[-1.5] self-end mb-2"></div>
        </>
      )}

      <div
        className={`max-w-[80%] p-4 rounded-xl border relative font-medium ${
          isUser
            ? 'bg-[#F7941D] text-white dark:bg-[#F7941D]'
            : 'bg-[#FFEAD0] dark:bg-muted text-foreground -ml-2'
        }`}
      >
        {isDishResults ? (
          <DishResults dishes={parsed!.dishes} />
        ) : (
          <ReactMarkdown>{message.content}</ReactMarkdown>
        )}
      </div>
    </div>
  )
}

const ThinkingIndicator = () => {
  const { t } = useTranslation()

  return (
    <div className="flex mb-4 justify-start">
      <div className="bg-foreground h-8 w-8 p-2 rounded-full flex items-center justify-center self-end mr-2">
        <img
          src="/saucy-logo.png"
          alt={t('ai.logoAlt')}
          className="object-contain dark:invert"
        />
      </div>
      <div className="w-3 h-3 bg-[#FF8C00] rotate-45 ml-[-1.5] self-end mb-3"></div>
      <div className="max-w-[80%] p-3 rounded-lg relative bg-[#FF8C00] dark:bg-[#FF8C00] text-white -ml-2">
        {t('ai.thinking')}
      </div>
    </div>
  )
}

const ChatInput = ({
  input,
  onInputChange,
  onSubmit,
  disabled,
}: {
  input: string
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  disabled?: boolean
}) => {
  const { t } = useTranslation()

  return (
    <form onSubmit={onSubmit}>
      <div className="w-full h-24 p-4 border-t border-border bg-background">
        <div className="w-full flex items-center backdrop-blur-sm bg-muted rounded-full overflow-hidden">
          <Input
            type="text"
            placeholder={t('ai.searchPlaceholder')}
            className="flex-1 h-14 indent-3 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            value={input}
            onChange={onInputChange}
            disabled={disabled}
          />
          <div className="pr-2">
            <Button
              type="submit"
              size="icon"
              className="rounded-full bg-foreground h-10 w-10"
              disabled={disabled}
            >
              <ArrowUp className="size-5 text-background" />
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

// Custom hooks
const useChatPersistence = (chatId: string) => {
  const [chatStore, setChatStore] = useAtom(chatStoreAtom)
  const savedMessages = chatStore[chatId] || []

  const persistMessages = useCallback(
    (messages: ChatMessage[]) => {
      if (chatId) {
        setChatStore((prev: any) => ({
          ...prev,
          [chatId]: messages,
        }))
      }
    },
    [chatId, setChatStore],
  )

  return { savedMessages, persistMessages }
}

const useAutoScroll = (messages: ChatMessage[], isLoading: boolean) => {
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = useCallback(() => {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' })
      } else if (containerRef.current) {
        // Fallback: scroll the container directly
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  return { bottomRef, containerRef, scrollToBottom }
}

// Main component
function Chat() {
  const { item } = Route.useSearch()
  const {
    messages,
    setMessages,
    input,
    isLoading,
    handleInputChange,
    handleSubmit,
    sendMessage,
  } = useOptimizedChat(item as string)

  const chatId = item?.id ?? ''

  const { savedMessages, persistMessages } = useChatPersistence(
    chatId as string,
  )
  const { bottomRef, containerRef } = useAutoScroll(messages, isLoading)

  // Load previous messages when chatId changes
  useEffect(() => {
    if (chatId && savedMessages.length > 0) {
      setMessages(savedMessages)
    }
  }, [chatId, setMessages])

  // Persist messages on change
  useEffect(() => {
    if (messages.length > 0) {
      persistMessages(messages)
    }
  }, [messages, persistMessages])

  const handlePresetClick = useCallback(
    (text: string) => {
      sendMessage(text)
    },
    [sendMessage],
  )

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      handleSubmit(e)
      // TODO: Put this somewhere else like on the server
      // await recordusage()
    },
    [handleSubmit],
  )

  return (
    <main className="h-[90vh] flex flex-col justify-between">
      <ChatHeader />

      <section
        ref={containerRef}
        className="flex-initial overflow-y-auto p-5 bg-background text-sm h-screen"
      >
        {messages.length === 0 ? (
          <WelcomeScreen onPresetClick={handlePresetClick} />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isUser={message.role === 'user'}
              />
            ))}
            {isLoading && <ThinkingIndicator />}
            <div ref={bottomRef} />
          </>
        )}
      </section>

      <ChatInput
        input={input}
        onInputChange={handleInputChange}
        onSubmit={handleFormSubmit}
        disabled={isLoading}
      />
    </main>
  )
}
