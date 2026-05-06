import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { LocaleProvider } from '@/contexts/locale-context'
import { AuthProvider } from '@/contexts/auth-context'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: 'pharmasync-track - Pharmacy Management System',
  description: 'Complete pharmacy management solution with POS, inventory tracking, and offline support',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <LocaleProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}

