import { createClient } from '../utils/supabase/server'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Toaster } from 'sonner'
import './globals.css'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors">
        <ThemeProvider defaultTheme="system">
          <AuthProvider session={session}>
            {children}
            <Toaster 
              position="top-center"
              duration={5000}
              richColors
              closeButton
              theme="system"
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}