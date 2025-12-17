'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CgProfile } from 'react-icons/cg'
import Image from 'next/image'
export default function AppLayout({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail: string
}) {
  const pathname = usePathname()
  const navCTA = (() => {
    if (pathname?.startsWith('/profile') || pathname?.startsWith('/chat')) {
      return { href: '/dashboard', label: 'Back to Dashboard' }
    }
    if (pathname?.startsWith('/dashboard')) {
      return { href: '/chat', label: 'Open Chat' }
    }
    return { href: '/dashboard', label: 'Go to Dashboard' }
  })()

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <div className="flex h-screen">
        {/* Sidebar - Chat History */}
        <aside className="w-80 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] flex flex-col">
          {/* Sidebar Header */}
          <div className="p-5 border-b border-[var(--sidebar-border)]">
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--sidebar-primary-foreground)]/70">
              Timeline
            </p>
            <h2 className="mt-2 text-lg font-semibold text-[var(--sidebar-foreground)]">
              Chat History
            </h2>
          </div>
          
          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="rounded-2xl border border-[var(--sidebar-border)] bg-[color:var(--sidebar-accent)] px-4 py-3 shadow-sm cursor-pointer hover:border-[var(--sidebar-ring)]">
              <p className="text-sm font-medium text-[var(--sidebar-foreground)] truncate">
                Today&apos;s Reflection
              </p>
              <p className="text-xs text-[var(--muted-foreground)] truncate">
                How are you feeling today?
              </p>
            </div>
          </div>
          
          {/* Sidebar Footer */}
          <div className="p-4 border-t border-[var(--sidebar-border)] text-center text-xs text-[var(--muted-foreground)]">
            Your conversations are private and secure
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-[var(--background)]">
          {/* Top Bar */}
          <header className="border-b border-[var(--border)] bg-[color:var(--sidebar)]/90 backdrop-blur">
            <div className="flex justify-between items-center h-16 px-6">
              <div className="flex items-center gap-3">
                <Image alt="Asa" width={64} height={32} src="/asa-blue.svg" />
                <div className="space-y-0.5">
                  <p className="text-xs uppercase tracking-[0.45em] text-[var(--muted-foreground)]">Assistant</p>
                  {/* <h1 className="text-xl font-semibold text-[var(--foreground)]">Asa</h1> */}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Link
                  href={navCTA.href}
                  className="hidden sm:inline-flex items-center rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-medium text-[var(--primary-foreground)] shadow-sm transition hover:opacity-90"
                >
                  {navCTA.label}
                </Link>
                <div className="hidden sm:block text-xs text-[var(--muted-foreground)]">{userEmail}</div>
                <Link
                  href="/profile"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm hover:border-[var(--sidebar-ring)]"
                >
                  <CgProfile className="text-lg" />
                </Link>
              </div>
            </div>
          </header>

          {/* Chat Area */}
          <main className="flex-1 overflow-hidden bg-[var(--background)]">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}