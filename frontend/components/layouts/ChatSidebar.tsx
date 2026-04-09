'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { MessageSquare, Plus, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"

interface Conversation {
  id: string
  title: string
  updated_at: string
}

export default function ChatSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { session } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Get active conversation ID from URL if on chat page
  const activeId = pathname?.startsWith('/chat') ? (typeof window !== 'undefined' ? localStorage.getItem('conversation_id') : null) : null

  const loadConversations = useCallback(async () => {
    if (typeof window === 'undefined' || !session?.access_token) return
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/conversations`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch (e) {
      console.error("Failed to load conversations in sidebar", e)
    } finally {
      setIsLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (session) {
      loadConversations()
    }
  }, [session, loadConversations])

  // Listen for storage changes to sync active conversation
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorage = () => {
      // Re-fetch to ensure title updates/new chats appear
      loadConversations()
    }
    window.addEventListener('storage', handleStorage)
    // Also listen for custom events if we emit them from Chat component
    window.addEventListener('chat-updated', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('chat-updated', handleStorage)
    }
  }, [loadConversations])

  const startNewChat = () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem('conversation_id')
    // Dispatch events immediately to update active UI state
    window.dispatchEvent(new Event('chat-updated'))
    window.dispatchEvent(new Event('storage')) // for storage listeners
    
    if (pathname !== '/chat') {
        router.push('/chat')
    }
    console.log("New Chat request dispatched. localStorage cleared.")
  }

  const selectConversation = (id: string) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('conversation_id', id)
    if (pathname !== '/chat') {
        router.push('/chat')
    }
    window.dispatchEvent(new Event('chat-updated'))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-(--border) lg:border-none">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-(--muted-foreground)">
          Conversations
        </p>
        <button 
          onClick={startNewChat}
          className="p-1.5 rounded-lg text-(--primary) hover:bg-(--primary)/10 transition-colors"
          title="New Chat"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        {isLoading && conversations.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-(--muted-foreground)" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-(--muted-foreground) italic">No recent chats</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv.id)}
              className={`w-full group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                activeId === conv.id
                  ? 'bg-(--primary)/10 font-semibold text-(--primary) shadow-sm'
                  : 'text-(--muted-foreground) hover:bg-(--muted)/60 hover:text-(--foreground)'
              }`}
            >
              <MessageSquare className={`h-4 w-4 shrink-0 transition-transform duration-200 ${activeId === conv.id ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="truncate flex-1 text-left">{conv.title || "Untitled Chat"}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
