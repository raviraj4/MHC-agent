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

export default function AsaChatInterface({ userId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
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
          const connected =
            res.ok || j.ok === true || j.ollama_running === true;
          if (connected) failuresRef.current = 0;
          else failuresRef.current += 1;
        }
      } catch {
        failuresRef.current += 1;
      } finally {
        const nowOffline = failuresRef.current >= FAILURES_TO_OFFLINE;
        if (!mountedRef.current) return;
        setIsConnected(
          nowOffline ? false : failuresRef.current === 0 ? true : isConnected
        );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const payloadMessages = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
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

  const retry = async (id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (!msg) return;
    // set it to sending and resend only that message in context
    updateMessageStatus(id, "sending");
    setInput(msg.content);
    // call send() which will append a duplicate user message; alternatively implement a resend path
    await send();
  };

  // Health offline / unknown UI (minimal)
  if (isConnected === false) {
    return (
      <div className="p-6">
        <div className="mb-4 text-red-600 font-medium">
          AI Service Unavailable
        </div>
        <div className="text-sm text-gray-600">
          Ensure backend and Ollama are running. Check server logs and /health.
        </div>
      </div>
    );
  }

  if (isConnected === null) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-gray-600">Checking AI service…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`mb-3 ${m.role === "user" ? "text-right" : "text-left"}`}
          >
            <div className="inline-block px-4 py-3 rounded-2xl text-slate-700 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 shadow-sm">
  <div>
    <div className="text-base leading-relaxed">
      {m.content}
    </div>
    <p className="text-sm text-blue-500/70 mt-2">@{m.role}, {m.timestamp}</p>
  </div>
</div>
            {m.status === "sending" && (
              <div className="text-xs text-gray-500">sending…</div>
            )}
            {m.status === "error" && (
              <div className="text-xs text-red-600">
                failed.{" "}
                <button onClick={() => retry(m.id)} className="underline">
                  retry
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 border-t">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="w-full p-3 rounded-md text-black bg-gray-100"
          rows={1}
          disabled={isLoading}
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={send}
            disabled={isLoading}
            className="bg-amber-400 hover:bg-amber-500 px-4 py-2 rounded"
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
