"use client";

import React, { useEffect, useRef, useState } from "react";

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

export default function AsaChatInterface({ userId: _userId }: ChatInterfaceProps) {
  void _userId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [hasCheckedHealth, setHasCheckedHealth] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const failuresRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  // Load conversationId from localStorage
  useEffect(() => {
    mountedRef.current = true;
    const saved = localStorage.getItem("conversation_id");
    if (saved) setConversationId(saved);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Health polling
  useEffect(() => {
    let intervalId: number | null = null;
    const check = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT);
      try {
        const res = await fetch(HEALTH_URL, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
          failuresRef.current += 1;
        } else {
          const j = await res.json().catch(() => ({}));
          // Consider connected if backend responds ok OR json.ok === true OR ollama_running === true
          const connected = j.ok === true || j.ollama_running === true;
          if (connected) failuresRef.current = 0;
          else failuresRef.current += 1;
        }
      } catch {
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
  }, []);

  // scroll to bottom on messages change
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
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

  // send message to backend expecting { conversation_id?, messages: [{role,content}] }
  const send = async () => {
    if (!input.trim()) return;
    if (isLoading) return;
    if (isConnected === false) return;

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

    const payload = {
      conversation_id: conversationId ?? undefined,
      messages: payloadMessages,
    };

    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      // persist conversation id if returned
      if (j.conversation_id) {
        setConversationId(j.conversation_id);
        try {
          localStorage.setItem("conversation_id", j.conversation_id);
        } catch {}
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

  // Health offline / unknown UI (minimal)
  if (hasCheckedHealth && isConnected === false) {
    return (
      <div className="p-6 bg-[var(--card)] text-[var(--foreground)] min-h-[200px] rounded-2xl shadow-sm border border-[var(--border)]">
        <div className="mb-2 text-[var(--destructive)] font-medium">AI Service Unavailable</div>
        <div className="text-sm text-[var(--muted-foreground)]">
          Ensure backend and Ollama are running. Check server logs and /health.
        </div>
      </div>
    );
  }

  if (!hasCheckedHealth) {
    return (
      <div className="p-6 bg-[var(--card)] text-[var(--foreground)] min-h-[200px] rounded-2xl shadow-sm border border-[var(--border)]">
        <div className="animate-pulse text-[var(--muted-foreground)]">Checking AI service…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--card)] text-[var(--foreground)]">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
 <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-100 bg-white/95 p-6 shadow-xl shadow-sky-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-black/50">
              <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] md:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                    Always here
                  </p>
                  <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Start a conversation</h3>
                  <div className="mt-5 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-5 py-4 text-base text-slate-800 shadow-inner dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 dark:text-slate-200">
                    “Hello! I&apos;m ASA, your wellbeing companion. How are you feeling today? Always here to listen.”
                  </div>
                </div>
                {ASSISTANT_WELCOME_IMAGE_URL && (
                  <div className="relative flex w-full justify-center -mb-6">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-6 bottom-0 h-24 rounded-full bg-gradient-to-r from-cyan-300/70 via-cyan-100/70 to-indigo-100/70 blur-3xl opacity-70 animate-pulse"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ASSISTANT_WELCOME_IMAGE_URL}
                      alt="Asa calming illustration"
                      className="relative w-full max-w-xs object-contain"
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
                  <div className="flex-shrink-0 self-start">
                    {ASSISTANT_AVATAR_URL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ASSISTANT_AVATAR_URL}
                        alt="Asa AI avatar"
                        className="h-10 w-10 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-sky-500 via-sky-600 to-cyan-500 text-xs font-semibold tracking-wider text-white shadow-sm dark:border-slate-700">
                        ASA
                      </div>
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-3xl border px-4 py-3 text-sm leading-relaxed shadow-sm transition-colors
                    ${m.role === "user"
                      ? "bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#14b8a6] text-white border-transparent shadow-lg shadow-sky-500/25"
                      : "bg-slate-100 text-slate-900 border-slate-200 shadow-md dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"}
                  `}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                  <div
                    className={`mt-2 text-xs ${m.role === "user" ? "text-white/80" : "text-slate-500 dark:text-slate-400"}`}
                  >
                    @{m.role} · {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 border-t border-[var(--border)] bg-[var(--card)]">
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
            Try a prompt
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DEMO_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handlePromptInsert(prompt)}
                className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200"
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
            placeholder="Type a message..."
            className="w-full resize-none min-h-[44px] max-h-[200px] p-3 rounded-2xl bg-[var(--input-background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            rows={1}
            disabled={isLoading}
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-[var(--muted-foreground)]">
              {isLoading ? "Sending..." : "Press Enter to send, Shift+Enter for newline"}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={send}
                disabled={isLoading}
                className="inline-flex items-center px-5 py-2 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm hover:opacity-90 disabled:opacity-60"
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
// ...existing code...
}