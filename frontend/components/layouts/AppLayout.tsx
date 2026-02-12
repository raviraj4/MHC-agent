'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { CgProfile } from 'react-icons/cg'
import { HiOutlineMenuAlt2, HiOutlineChatAlt2, HiOutlineHome
 } from 'react-icons/hi'
import { IoClose, IoSparkles, IoShieldCheckmarkOutline } from 'react-icons/io5'

export default function AppLayout({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail: string
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const navCTA = (() => {
    if (pathname?.startsWith('/profile') || pathname?.startsWith('/chat')) {
      return { href: '/dashboard', label: 'Dashboard', icon: HiOutlineHome }
    }
    if (pathname?.startsWith('/dashboard')) {
      return { href: '/chat', label: 'Chat', icon: HiOutlineChatAlt2 }
    }
    return { href: '/dashboard', label: 'Dashboard', icon: HiOutlineHome }
  })()

  const NavIcon = navCTA.icon

  return (
    <div className="ambient-page-bg min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex h-screen">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-72 border-r border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-sm flex flex-col transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0
        `}>
          {/* Sidebar Header */}
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
                <IoSparkles className="text-white text-lg" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">ASA</h2>
                <p className="text-[10px] text-[var(--muted-foreground)]">Your wellbeing companion</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="lg:hidden p-2 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <IoClose className="text-xl" />
            </button>
          </div>
          
          {/* Navigation */}
           <nav className="px-3 mb-4">
            <Link 
              href="/dashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                pathname?.startsWith('/dashboard') 
                  ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium' 
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <HiOutlineHome className="text-lg" />
              Dashboard
            </Link>
            <Link 
              href="/chat"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                pathname?.startsWith('/chat') 
                  ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium' 
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <HiOutlineChatAlt2 className="text-lg" />
              Chat with ASA
            </Link>
          </nav>

          {/* Divider */}
          <div className="mx-5 h-px bg-[var(--muted)]" />
          
          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-medium">
              Recent Chats
            </p>
            <div className="space-y-1">
              <div className="rounded-xl bg-[var(--muted)]/50 px-3 py-2.5 cursor-pointer hover:bg-[var(--muted)] transition-colors">
                <p className="text-sm text-[var(--foreground)] truncate">
                  Today&apos;s Reflection
                </p>
                <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">
                  How are you feeling today?
                </p>
              </div>
            </div>
          </div>
          
          {/* Sidebar Footer */}
          <div className="p-4">
            <div className="rounded-xl bg-gradient-to-br from-[var(--primary)]/5 to-transparent p-3">
              <p className="text-xs text-[var(--muted-foreground)] text-center">
                🔒 Your conversations are private
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-14 flex items-center justify-between px-4 lg:px-6 bg-[var(--card)]/80 backdrop-blur-md sticky top-0 z-30"> <div className="flex items-center gap-3">
              {/* Hamburger for mobile */}
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className="lg:hidden p-2 -ml-2 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                <HiOutlineMenuAlt2 className="text-xl" />
              </button>
              
              {/* Logo - visible on mobile */}
              <div className="lg:hidden flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
                  <IoSparkles className="text-white text-sm" />
                </div>
                <span className="font-semibold text-sm">ASA</span>
              </div>
            </div>
            
              {/* Quick action button */}
            <div className="flex items-center gap-2">
            {/*   <Link
                href={navCTA.href}
                className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--muted)]/80 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors"
              >
                <NavIcon className="text-sm" />
                {navCTA.label}
              </Link> */}
              
              {/* User email - hidden on small screens */}
              <span className="hidden md:block text-xs text-[var(--muted-foreground)] max-w-[150px] truncate">
                {userEmail}
              </span>
              
              {/* Profile button */}
              <Link
                href="/profile"
                className="p-2 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <CgProfile className="text-xl" />
              </Link>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
