/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiUrl } from '@/lib/utils'
import { useCallback, useEffect, useRef, useState } from 'react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// Optimized chat hook using Elysia backend
export const useOptimizedChat = (item: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [input, setInput] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content,
      }

      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setIsLoading(true)

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      try {
        const token = localStorage.getItem('saucy-user-token')

        if (!token) {
          throw new Error('No authentication token found')
        }

        if (!apiUrl) {
          throw new Error('API URL not configured')
        }

        const response = await fetch(`/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            menuItem: item,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`API request failed: ${response.status} ${errorText}`)
        }

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
        }

        setMessages((prev) => [...prev, assistantMessage])

        // Handle streaming response
        const reader = response.body?.getReader()
        if (!reader) throw new Error('No reader available')

        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk

          // Try to parse as JSON to see if it's dish results
          let isDishResults = false
          try {
            const parsed = JSON.parse(buffer.trim())
            isDishResults =
              parsed?.type === 'dishResults' && Array.isArray(parsed.dishes)
          } catch {
            // Not complete JSON yet, continue streaming
          }

          // Update the assistant message
          setMessages((prev) => {
            const updated = [...prev]
            const lastMessage = updated[updated.length - 1]
            if (lastMessage && lastMessage.role === 'assistant') {
              // If it's dish results, don't show until complete
              if (isDishResults) {
                lastMessage.content = buffer // Complete JSON
              } else {
                // For regular text, show as it streams (but only if not starting with {)
                if (!buffer.trim().startsWith('{')) {
                  lastMessage.content = buffer
                } else {
                  // Don't show incomplete JSON
                  lastMessage.content = ''
                }
              }
            }
            return updated
          })
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Request aborted')
          return
        }

        console.error('Chat error:', error)
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
          },
        ])
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [messages, isLoading],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value)
    },
    [],
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      sendMessage(input)
    },
    [input, sendMessage],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    messages,
    setMessages,
    input,
    isLoading,
    handleInputChange,
    handleSubmit,
    sendMessage,
  }
}
