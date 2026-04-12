"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MessageSquare, Plus, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

type Role = "user" | "assistant";
type Status = "sending" | "sent" | "error";

interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string; // ISO string
  status: Status;
}

interface ChatInterfaceProps {
  userId?: string;
  onMessageSent?: () => void;
  canSendMessage?: () => boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const HEALTH_URL = `${API_BASE}/health`;
const CHAT_URL = `${API_BASE}/api/chat`;
const HEALTH_INTERVAL = 5000;
const HEALTH_TIMEOUT = 2000;
const FAILURES_TO_OFFLINE = 2;
const MAX_CONTEXT_MESSAGES = 12; // send only latest turns to backend
const ASSISTANT_AVATAR_URL = process.env.NEXT_PUBLIC_ASA_AVATAR_URL ?? "";
const ASSISTANT_WELCOME_IMAGE_URL = process.env.NEXT_PUBLIC_ASA_WELCOME_IMAGE_URL ?? "";
const DEMO_PROMPTS = [
  "I am feeling anxious because...",
  "I need motivation with...",
  "I'm feeling overwhelmed by...",
  "I'm grateful for...",
  "I'm feeling stuck with...",
];

export default function AsaChatInterface({ userId: _userId, onMessageSent, canSendMessage }: ChatInterfaceProps) {
  const { session, user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [hasCheckedHealth, setHasCheckedHealth] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [useLocalMode, setUseLocalMode] = useState(false);

  const failuresRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (typeof window === 'undefined' || !session?.access_token) return;
    try {
      console.log("Fetching conversations from:", `${API_BASE}/api/conversations`);
      const res = await fetch(`${API_BASE}/api/conversations`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      } else {
        console.error("Failed to fetch conversations:", res.status, res.statusText);
      }
    } catch (e) {
      console.error("Failed to load conversations", e);
    }
  }, [session]);

  // Load messages for specific conversation
  const loadMessages = useCallback(async (id: string) => {
    if (typeof window === 'undefined') return;
    if (id === "conv_local_default") {
      setMessages([]);
      return;
    }
    if (!session?.access_token) return;
    
    console.log("Fetching messages for conversation:", id, "from:", `${API_BASE}/api/conversations/${id}/messages`);
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${id}/messages`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.created_at,
          status: "sent" as Status
        }));
        setMessages(mapped);
      } else {
        console.error("Failed to fetch messages:", res.status, res.statusText);
      }
    } catch (e) {
      console.error("Failed to load messages", e);
    } finally {
      setIsLoading(false);
    }
  }, [session, API_BASE]);

  const startNewChat = () => {
    if (typeof window === 'undefined') return;
    setConversationId(null);
    setMessages([]);
    localStorage.removeItem("conversation_id");
    window.dispatchEvent(new Event('chat-updated'));
  };

  const selectConversation = (id: string) => {
    if (typeof window === 'undefined') return;
    setConversationId(id);
    localStorage.setItem("conversation_id", id);
    loadMessages(id);
    window.dispatchEvent(new Event('chat-updated'));
  };

  useEffect(() => {
    if (session) {
      loadConversations();
    }
  }, [session, loadConversations]);

  // Load conversationId and mode preference from localStorage
  useEffect(() => {
    mountedRef.current = true;
    const saved = localStorage.getItem("conversation_id");
    if (saved) {
      setConversationId(saved);
      if (session) loadMessages(saved);
    }
    
    const savedMode = localStorage.getItem("use_local_mode");
    if (savedMode !== null) setUseLocalMode(JSON.parse(savedMode));
    
    return () => {
      mountedRef.current = false;
    };
  }, [session, loadMessages]); // added dependency loadMessages if session changes

  useEffect(() => {
    const handleChatUpdated = () => {
      if (typeof window === 'undefined') return
      const saved = localStorage.getItem("conversation_id");
      if (saved) {
        setConversationId(saved);
        loadMessages(saved);
      } else {
        setConversationId(null);
        setMessages([]);
      }
    };
    window.addEventListener('chat-updated', handleChatUpdated);
    return () => window.removeEventListener('chat-updated', handleChatUpdated);
  }, [loadMessages]);

  // Health polling - only check when in local mode
  useEffect(() => {
    // If in online mode, skip health checks
    if (!useLocalMode) {
      setHasCheckedHealth(true);
      setIsConnected(null);  // Don't show status in online mode
      return;
    }
    
    let intervalId: number | null = null;
    const check = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT);
      
      try {
        const res = await fetch(HEALTH_URL, { signal: controller.signal });
        clearTimeout(timeout);
        
        // Always consume response body to prevent memory leaks
        const text = await res.text();
        
        if (!res.ok) {
          failuresRef.current += 1;
        } else {
          try {
            const j = JSON.parse(text);
            // Consider connected if backend responds ok OR json.ok === true OR ollama_running === true
            const connected = j.ok === true || j.ollama_running === true;
            failuresRef.current = connected ? 0 : failuresRef.current + 1;
          } catch {
            // JSON parse failed but body was consumed
            failuresRef.current += 1;
          }
        }
      } catch {
        // Network error or abort
        clearTimeout(timeout);
        failuresRef.current += 1;
      } finally {
        const nowOffline = failuresRef.current >= FAILURES_TO_OFFLINE;
        if (!mountedRef.current) return;
        setHasCheckedHealth(true);
        setIsConnected((prev) => {
          if (nowOffline) return false;
          if (failuresRef.current === 0) return true;
          return prev;
        });
      }
    };

    // initial
    check().catch(() => {});
    // poll
    intervalId = window.setInterval(() => {
      check().catch(() => {});
    }, HEALTH_INTERVAL);
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [useLocalMode]);

  // scroll to bottom on messages change
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  // auto resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(220, el.scrollHeight)}px`;
  }, [input]);

  // helpers
  const nowIso = () => new Date().toISOString();
  const makeId = (prefix = "msg") =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const updateMessageStatus = (id: string, status: Status) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status } : m))
    );
  };

  const appendMessage = (m: Message) => setMessages((prev) => [...prev, m]);
  const handlePromptInsert = (prompt: string) => {
    setInput((prev) => {
      if (!prev) return prompt;
      return prev.trimEnd().length === 0 ? prompt : `${prev.trimEnd()} ${prompt}`;
    });
    textareaRef.current?.focus();
  };

  // send message to backend expecting { conversation_id?, messages: [{role,content}], preferred_provider? }
  const send = async () => {
    if (!input.trim()) return;
    if (isLoading) return;
    // Only block sending if not connected AND not in online mode
    if (isConnected === false && !useLocalMode) return;
    if (canSendMessage && !canSendMessage()) return;

    setIsLoading(true);
    const userMsg: Message = {
      id: makeId("user"),
      role: "user",
      content: input.trim(),
      timestamp: nowIso(),
      status: "sending",
    };
    appendMessage(userMsg);
    setInput("");

    // prepare payload - map all messages (including current) to role/content
    const recentContext = messages.slice(-MAX_CONTEXT_MESSAGES);
    const payloadMessages = [
      ...recentContext.map((m) => ({ role: m.role, content: m.content })),
      { role: userMsg.role, content: userMsg.content },
    ];

    const payload: any = {
      conversation_id: conversationId || undefined,
      messages: payloadMessages,
    };
    
    // Auth headers
    const headers: any = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
      console.log("Sending with Session Token:", session.access_token.slice(0, 10) + "...");
    } else {
      console.warn("No Auth Session Found - Persistence will fail!");
    }

    // Add preferred provider if in local mode
    if (useLocalMode) {
      payload.preferred_provider = "ollama";
    }

    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        updateMessageStatus(userMsg.id, "error");
        throw new Error(`backend error ${res.status}`);
      }

      const j = await res.json();
      // backend returns { conversation_id, message: { role, content }, message_id, model }
      const assistant = j.message || { role: "assistant", content: "" };
      const assistantMsg: Message = {
        id: makeId("assistant"),
        role: assistant.role ?? "assistant",
        content: assistant.content ?? "",
        timestamp: nowIso(),
        status: "sent",
      };

      // update state
      updateMessageStatus(userMsg.id, "sent");
      appendMessage(assistantMsg);

      // Call callback to track demo usage
      onMessageSent?.();

      // persist conversation id if returned
      if (j.conversation_id && j.conversation_id !== "conv_local_default") {
        console.log("Backend returned Persistent Conversation ID:", j.conversation_id);
        const isNew = conversationId !== j.conversation_id;
        setConversationId(j.conversation_id);
        try {
          localStorage.setItem("conversation_id", j.conversation_id);
          if (isNew) {
            console.log("Dispatching chat-updated and storage events for new persistent conversation");
            window.dispatchEvent(new Event('chat-updated'));
            window.dispatchEvent(new Event('storage')); // Force sidebar re-fetch
          }
        } catch (e) {
          console.error("Storage error:", e);
        }
      } else if (j.conversation_id === "conv_local_default") {
        console.log("Chat running in local-only mode (not being saved to Supabase)");
      } else {
        console.warn("Backend did NOT return a conversation_id!");
      }
    } catch (e) {
      console.error("send error", e);
      updateMessageStatus(userMsg.id, "error");
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  /* Loading splash */
  if (!hasCheckedHealth) {
    return (
      <div className="flex h-full items-center justify-center bg-(--background)">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            <span className="typing-dot h-2.5 w-2.5 rounded-full bg-(--primary)" />
            <span className="typing-dot h-2.5 w-2.5 rounded-full bg-(--primary)" />
            <span className="typing-dot h-2.5 w-2.5 rounded-full bg-(--primary)" />
          </div>
          <p className="text-sm text-(--muted-foreground)">Connecting to ASA…</p>
        </div>
      </div>
    );
  }

  const isOffline = hasCheckedHealth && isConnected === false && useLocalMode;
  const showOnlineStatus = useLocalMode;  // Only show online/offline status in local mode

  return (
    <div className="flex h-full w-full overflow-hidden bg-(--background) ambient-mesh text-(--foreground)">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 h-full overflow-hidden relative">
        {/* Header with back arrow */}
        <header className="relative z-10 border-b border-(--border) glass">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
            {userId && (
              <button
                onClick={() => router.push("/dashboard")}
                aria-label="Back to dashboard"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-(--muted-foreground) transition hover:bg-(--muted)"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="flex-1">
              <p className="text-[10px] font-medium uppercase tracking-widest text-(--muted-foreground)">Chat with ASA</p>
              <h2 className="text-lg font-semibold">Your wellbeing companion</h2>
            </div>
            
            {/* Compact local/online toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-(--muted)/40 rounded-lg p-1.5">
                <button
                  onClick={() => {
                    setUseLocalMode(false);
                    localStorage.setItem("use_local_mode", JSON.stringify(false));
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                    !useLocalMode
                      ? 'bg-(--primary) text-white'
                      : 'text-(--muted-foreground) hover:text-(--foreground)'
                  }`}
                >
                  Online
                </button>
                <button
                  onClick={() => {
                    setUseLocalMode(true);
                    localStorage.setItem("use_local_mode", JSON.stringify(true));
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                    useLocalMode
                      ? 'bg-(--primary) text-white'
                      : 'text-(--muted-foreground) hover:text-(--foreground)'
                  }`}
                >
                  Local
                </button>
              </div>
              
              {/* Status indicator - only in local mode */}
              {showOnlineStatus && (
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${isOffline ? 'bg-amber-400' : isConnected ? 'bg-emerald-400' : 'bg-(--muted)'}`} />
                  <span className="text-xs text-(--muted-foreground)">{isOffline ? 'Offline' : isConnected ? 'Online' : 'Checking…'}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Offline Banner - only show in local mode */}
        {isOffline && showOnlineStatus && (
          <div className="px-4 py-3 bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-medium">Asa seems to be offline</span>
            </div>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/80 ml-6">
              We&apos;re trying to reconnect. Check that the backend and Ollama are running.
            </p>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-(--primary)" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-(--border) bg-(--card) p-8 shadow-lg">
                <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] md:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-(--primary)">
                      Always here
                    </p>
                    <h3 className="text-2xl font-semibold">Start a conversation</h3>
                    <div className="mt-5 rounded-2xl border border-(--border) bg-(--muted)/50 px-5 py-4 text-base text-(--foreground) shadow-sm">
                      “Hello! I&apos;m ASA, your wellbeing companion. How are you feeling today? Always here to listen.”
                    </div>
                  </div>
                  {ASSISTANT_WELCOME_IMAGE_URL && (
                    <div className="relative flex w-full justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ASSISTANT_WELCOME_IMAGE_URL}
                        alt="Asa calming illustration"
                        className="relative w-full max-w-50 object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-end gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role !== "user" && (
                  <div className="shrink-0 self-start">
                    {ASSISTANT_AVATAR_URL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ASSISTANT_AVATAR_URL}
                        alt="Asa AI avatar"
                        className="h-9 w-9 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-sky-500 to-cyan-400 text-[10px] font-semibold tracking-wider text-white">
                        ASA
                      </div>
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                    ${m.role === "user"
                      ? "bg-linear-to-r from-sky-500 to-cyan-400 text-white"
                      : "bg-(--card) border border-(--muted-foreground)/30 text-(--foreground) shadow-sm"}
                  `}
                >
                  <div className="whitespace-pre-wrap wrap-break-word">
                    {m.content}
                  </div>
                  <div
                    className={`mt-1.5 text-[10px] ${m.role === "user" ? "text-white/70" : "text-(--muted-foreground)"}`}
                  >
                   {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="relative z-1 p-4 glass border-t border-(--border)">
        <div className="mb-3">
          <p className="text-[10px] font-medium uppercase tracking-widest text-(--muted-foreground)">
            Try a prompt
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DEMO_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handlePromptInsert(prompt)}
                disabled={isOffline}
                className="rounded-lg border border-(--border) bg-(--card) px-3 py-1.5 text-xs font-medium text-(--foreground) transition hover:bg-(--muted) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)/60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isOffline ? "Asa is offline — waiting to reconnect..." : "Type a message..."}
            className="w-full resize-none min-h-11 max-h-40 p-3 rounded-xl border border-(--border) bg-(--card) text-(--foreground) placeholder:text-(--muted-foreground) focus:outline-none focus:ring-2 focus:ring-(--ring) disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            rows={1}
            disabled={isLoading || isOffline}
          />
          <div className="mt-2.5 flex items-center justify-between">
            <div className="text-[10px] text-(--muted-foreground)">
              {isOffline ? "Reconnecting..." : isLoading ? "Sending..." : "Press Enter to send, Shift+Enter for newline"}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={send}
                disabled={isLoading || isOffline}
                className="inline-flex items-center px-4 py-2 rounded-xl border border-(--primary)/20 bg-(--primary) text-sm font-medium text-(--primary-foreground) hover:opacity-90 disabled:opacity-60 transition"
              >
                {isOffline ? "Offline" : isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
