
'use client'

import React, { useEffect, useRef, useState } from 'react'

type Role = 'user' | 'assistant'
type Status = 'sending' | 'sent' | 'error'

interface Message {
  id: string
  role: Role
  content: string
  timestamp: string // ISO string for safe serialization
  status: Status
}

interface ChatInterfaceProps {
  userId?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'
const HEALTH_URL = `${API_BASE}/health`
const CHAT_URL = `${API_BASE}/api/chat`
const HEALTH_INTERVAL = 5000
const HEALTH_TIMEOUT = 2000
const FAILURES_TO_OFFLINE = 2

export default function ChatInterface({ userId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState<boolean | null>(null)

  const [conversationId, setConversationId] = useState<string | null>(null)

  const failuresRef = useRef(0)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const mountedRef = useRef(true)

  // Load conversationId from localStorage
  useEffect(() => {
    mountedRef.current = true
    const saved = localStorage.getItem('conversation_id')
    if (saved) setConversationId(saved)
    return () => { mountedRef.current = false }
  }, [])

  // Health polling
  useEffect(() => {

    const check = async () => {
      const ac = new AbortController()
      const tid = setTimeout(() => ac.abort(), HEALTH_TIMEOUT)
      try {
        const res = await fetch(HEALTH_URL, { signal: ac.signal })
        clearTimeout(tid)
        if (!res.ok) {
          failuresRef.current++
          if (failuresRef.current >= FAILURES_TO_OFFLINE) {
            setIsConnected(false)
          }
          return
        }
        const json = await res.json().catch(() => null)
        const healthy = !!(json && json.ollama_running === true)
        if (healthy) {
          failuresRef.current = 0
          setIsConnected(true)
        } else {
          failuresRef.current++
          if (failuresRef.current >= FAILURES_TO_OFFLINE) {
            setIsConnected(false)
          }
        }
      } catch (e) {
        failuresRef.current++
        if (failuresRef.current >= FAILURES_TO_OFFLINE) {
          setIsConnected(false)
        }
      }
    }

    // initial
    check().catch(() => {})
    // poll
    const intervalId = window.setInterval(() => { check().catch(() => {}) }, HEALTH_INTERVAL)

  return () => {
    clearInterval(intervalId)
  }
  }, [])

  // scroll to bottom on messages change
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // auto resize textarea
  useEffect(() => {
    if (!textareaRef.current) return
    const el = textareaRef.current
    el.style.height = 'auto'
    el.style.height = `${Math.min(220, el.scrollHeight)}px`
  }, [input])

  // helpers
  const nowIso = () => new Date().toISOString()
  const makeId = (prefix = 'msg') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`

  const updateMessageStatus = (id: string, status: Status) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, status } : m)))
  }

  const appendMessage = (m: Message) => setMessages(prev => [...prev, m])

  // send message to backend expecting { conversation_id?, messages: [{role,content}] }
  const send = async () => {
    if (!input.trim()) return
    if (isLoading) return
    if (isConnected !== true) return

    setIsLoading(true)
    const userIdSafe = userId ?? undefined

    const userMsg: Message = {
      id: userIdSafe || 'def',
      role: 'user',
      content: input.trim(),
      timestamp: nowIso(),
      status: 'sending'
    }

    appendMessage(userMsg)
    setInput('')

    const payload = {
      conversation_id: conversationId,
      messages: [{ role: 'user', content: userMsg.content }]
    }

    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => 'Unknown error')
        throw new Error(txt || 'Chat error')
      }

      const data = await res.json()

      // prefer data.message.content (ChatResponse shape). fallback to data.response
      const assistantContent =
        data?.message?.content ?? data?.response ?? 'Empty response'

      // update user message status -> sent
      updateMessageStatus(userMsg.id, 'sent')

      const aiMsg: Message = {
        id: makeId('ai'),
        role: 'assistant',
        content: assistantContent,
        timestamp: nowIso(),
        status: 'sent'
      }

      // store conversation id if returned
      if (data?.conversation_id && data.conversation_id !== conversationId) {
        setConversationId(data.conversation_id)
        try { localStorage.setItem('conversation_id', data.conversation_id) } catch {}
      }

      appendMessage(aiMsg)
    } catch (err) {
      console.error('send error', err)
      // mark user message as error
      updateMessageStatus(userMsg.id, 'error')
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const retry = (id: string) => {
    const msg = messages.find(m => m.id === id)
    if (!msg) return
    // remove failed message and populate input for quick retry
    setMessages(prev => prev.filter(m => m.id !== id))
    setInput(msg.content)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  // UI when health unknown: show loader; when offline show helpful instructions
  if (isConnected === false) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-yellow-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI Service Unavailable</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Please ensure the AI backend and Ollama are running.</p>
          <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
            <p>1. Ensure Ollama is running (it usually auto-starts). Use <code className="bg-gray-100 px-1 rounded">ollama list</code> to check.</p>
            <p>2. Start Backend: <code className="bg-gray-100 px-1 rounded">uvicorn main:app --reload --port 8000</code></p>
            <p>3. Open browser console / network to see /health requests.</p>
          </div>
        </div>
      </div>
    )
  }

  // While health unknown, show a simple loader area (prevents flicker)
  if (isConnected === null) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-pulse text-gray-500">Checking AI backend...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <div className="text-4xl mb-4">💭</div>
            <h3 className="text-xl font-semibold mb-2">Welcome</h3>
            <p className="text-sm">Type a message to start the conversation.</p>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-2xl p-4 transition-all duration-200
                ${m.role === 'user' ? (m.status === 'error' ? 'bg-red-500 text-white' : 'bg-blue-600 text-white') : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'}
                ${m.status === 'sending' ? 'opacity-80' : ''}`}>
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className={`text-xs ${m.role === 'user' ? (m.status === 'error' ? 'text-red-200' : 'text-blue-200') : 'text-gray-500'}`}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {m.status === 'error' && m.role === 'user' && (
                    <button onClick={() => retry(m.id)} className="text-xs bg-white text-red-600 px-2 py-1 rounded hover:bg-gray-100">Retry</button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
              <div className="flex space-x-2 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        <div className="flex space-x-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share what's on your mind..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[44px] max-h-48"
              rows={1}
              disabled={isLoading || isConnected === false}
            />
          </div>

          <button
            onClick={send}
            disabled={!input.trim() || isLoading || isConnected === false}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <span>Send</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">Press Enter to send, Shift+Enter for newline</div>
      </div>
    </div>
  )
}
