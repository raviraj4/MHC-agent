import { Manrope } from 'next/font/google'
import { createClient } from '../utils/supabase/server'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Toaster } from 'sonner'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
})

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Server-side auth should rely on getUser(); client provider hydrates full session/token.
  const session = user ? ({ user } as any) : null

  return (
    <html lang="en" suppressHydrationWarning className={manrope.variable}>
      <body
        className={`${manrope.className} bg-[var(--background)] text-[var(--foreground)] transition-colors`}
      >
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