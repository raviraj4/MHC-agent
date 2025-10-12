'use client'

import { useTheme } from '../providers/ThemeProvider'
import ThemeToggle from '../ui/ThemeToggle'
import LogoutButton from '@/app/auth/LogoutButton'

export default function AppLayout({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail: string
}) {
  // const { resolvedTheme } = useTheme()

  return (
    
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="flex h-screen">
        {/* Sidebar - Chat History */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Chat History
            </h2>
          </div>
          
          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {/* Placeholder for chat list */}
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  Today&apos;s Reflection
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  How are you feeling today?
                </p>
              </div>
              {/* More chats will go here */}
            </div>
          </div>
          
          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Your conversations are private and secure
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center h-16 px-6">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  AI Companion
                </h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {userEmail}
                </span>
                
                {/* <ThemeToggle /> */}
                
                <LogoutButton />
              </div>
            </div>
          </header>

          {/* Chat Area */}
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}