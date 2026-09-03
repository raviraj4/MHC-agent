'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { CgProfile } from 'react-icons/cg'
import { HiOutlineMenuAlt2, HiOutlineChatAlt2, HiOutlineHome } from 'react-icons/hi'
import { IoClose, IoSparkles } from 'react-icons/io5'
import { HiOutlineBookOpen } from 'react-icons/hi2'
import { BirdIcon } from 'lucide-react'
import ChatSidebar from './ChatSidebar'
import { GiTalk } from 'react-icons/gi'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/utils/supabase/client'
import NotificationBell from '@/components/ui/NotificationBell'

export default function AppLayout({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail: string
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [role, setRole] = useState<'admin' | 'therapist' | 'user' | null>(null)
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!user) {
      setRole(null)
      return
    }

    const loadRole = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      setRole(data?.role === 'admin' || data?.role === 'therapist' || data?.role === 'user' ? data.role : null)
    }

    loadRole()
  }, [supabase, user])

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
    { href: '/chat', label: 'Chat with ASA', icon: HiOutlineChatAlt2 },
    { href: '/journal', label: 'Journal', icon: HiOutlineBookOpen },
    { href: '/playground', label: 'CBT Playground', icon: IoSparkles },
    { href: '/explore', label: 'Talk to a Pro', icon: GiTalk },
  ]

  return (
    <div className="ambient-mesh h-dvh overflow-hidden bg-(--background) text-(--foreground)">
      <div className="relative z-[1] flex h-full min-h-0">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col
          glass-strong
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:h-full lg:translate-x-0
        `}>
          {/* Brand */}
          <div className="flex items-center justify-between px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-cyan-500 shadow-lg shadow-(--primary)/20">
                <BirdIcon className="text-lg text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-(--foreground)">ASA</h2>
                <p className="text-[10px] text-(--muted-foreground)">Wellbeing companion</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="rounded-xl p-2 text-(--muted-foreground) transition-colors hover:bg-(--muted) lg:hidden"
            >
              <IoClose className="text-xl" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-1 space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname?.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-(--primary)/10 font-semibold text-(--primary) shadow-sm shadow-(--primary)/5'
                      : 'text-(--muted-foreground) hover:bg-(--muted)/60 hover:text-(--foreground)'
                  }`}
                >
                  <Icon className={`text-lg transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Divider */}
          <div className="mx-5 mt-5 h-px bg-(--border)" />
          
          {/* Recent Chats section extracted to component */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <ChatSidebar />
          </div>

          {/* Footer */}
          <div className="p-4">
            <div className="rounded-2xl bg-gradient-to-br from-(--primary)/5 via-(--secondary)/5 to-transparent p-3.5 text-center">
              <p className="text-xs text-(--muted-foreground)">
                <span className="mr-1">🔒</span> Your conversations are private
              </p>
            </div>
          </div>
        </aside>

        {/* ── Main area ── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className="-ml-2 rounded-xl p-2 text-(--muted-foreground) transition-colors hover:bg-(--muted) lg:hidden"
              >
                <HiOutlineMenuAlt2 className="text-xl" />
              </button>
              {/* Mobile logo */}
              <div className="flex items-center gap-2 lg:hidden">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-300 to-cyan-500 ">
                  <BirdIcon className="text-sm text-white" />
                </div>
                <span className="text-sm font-bold">ASA</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {role === 'admin' && (
                <Link
                  href="/admin"
                  className="rounded-xl px-3 py-2 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-(--muted)"
                >
                  Admin Dashboard
                </Link>
              )}
              {role === 'therapist' && (
                <Link
                  href="/therapist-dashboard"
                  className="rounded-xl px-3 py-2 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-(--muted)"
                >
                  Therapist Dashboard
                </Link>
              )}
              <NotificationBell />
              <span className="hidden max-w-[180px] truncate text-xs text-(--muted-foreground) md:block">
                {userEmail}
              </span>
              <Link
                href="/profile"
                className="rounded-xl p-2 text-(--muted-foreground) transition-colors hover:bg-(--muted) hover:text-(--foreground)"
              >
                <CgProfile className="text-xl" />
              </Link>
            </div>
          </header>

          {/* Content */}
          <main className="min-h-0 flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
