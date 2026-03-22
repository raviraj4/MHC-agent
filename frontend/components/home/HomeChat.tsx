"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AsaChatInterface from "@/app/chat/AsaChatInterface";

const DEMO_MESSAGE_LIMIT = 10;
const STORAGE_KEY = "demo_messages_sent";

interface DemoStats {
  messagesSent: number;
  resetTime: number;
}

export default function HomeChat() {
  const [demoStats, setDemoStats] = useState<DemoStats>({
    messagesSent: 0,
    resetTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  const [isLimitExceeded, setIsLimitExceeded] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState(DEMO_MESSAGE_LIMIT);

  // Load demo stats from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const stats = JSON.parse(stored) as DemoStats;
      // Reset if 24 hours have passed
      if (Date.now() > stats.resetTime) {
        const newStats = {
          messagesSent: 0,
          resetTime: Date.now() + 24 * 60 * 60 * 1000,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
        setDemoStats(newStats);
        setRemainingMessages(DEMO_MESSAGE_LIMIT);
        setIsLimitExceeded(false);
      } else {
        setDemoStats(stats);
        const remaining = Math.max(0, DEMO_MESSAGE_LIMIT - stats.messagesSent);
        setRemainingMessages(remaining);
        setIsLimitExceeded(remaining <= 0);
      }
    }
  }, []);

  // Handle message sent - track demo usage
  const handleMessageSent = () => {
    setDemoStats((prev) => {
      const updated = {
        ...prev,
        messagesSent: prev.messagesSent + 1,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      const remaining = Math.max(0, DEMO_MESSAGE_LIMIT - updated.messagesSent);
      setRemainingMessages(remaining);
      setIsLimitExceeded(remaining <= 0);
      return updated;
    });
  };

  // Check if user can send message
  const canSendMessage = () => {
    return remainingMessages > 0;
  };

  return (
    <div className="ambient-mesh min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="relative z-[1] flex h-screen flex-col">
        {/* Header with Login Button */}
        <header className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/60">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-cyan-500 text-white font-bold text-sm">
                A
              </div>
              <div>
                <h1 className="text-lg font-semibold">Asa - Mental Health Companion</h1>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Demo Mode • {remainingMessages} message{remainingMessages !== 1 ? "s" : ""} remaining
                </p>
              </div>
            </div>
            <Link
              href="/auth/login"
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity text-sm font-medium whitespace-nowrap"
            >
              Sign In to Cloud
            </Link>
          </div>
        </header>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <AsaChatInterface 
            userId={undefined}
            onMessageSent={handleMessageSent}
            canSendMessage={canSendMessage}
          />
        </div>
      </div>

      {/* Limit Exceeded Overlay */}
      {isLimitExceeded && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center">
          <div className="bg-[var(--card)] rounded-2xl p-8 max-w-sm mx-4 shadow-lg">
            <h2 className="text-2xl font-semibold mb-3">Demo Message Limit Reached</h2>
            <p className="text-[var(--muted-foreground)] mb-6">
              You've reached the daily demo message limit. Sign in to your account to continue unlimited conversations with Asa.
            </p>
            <Link
              href="/auth/login"
              className="w-full px-4 py-3 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity text-center font-medium block"
            >
              Sign In Now
            </Link>
            <button
              onClick={() => {
                // Reset demo stats
                localStorage.removeItem(STORAGE_KEY);
                setDemoStats({
                  messagesSent: 0,
                  resetTime: Date.now() + 24 * 60 * 60 * 1000,
                });
                setRemainingMessages(DEMO_MESSAGE_LIMIT);
                setIsLimitExceeded(false);
              }}
              className="w-full mt-3 px-4 py-3 rounded-lg border border-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors text-center font-medium"
            >
              Reset Demo (Today Only)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}