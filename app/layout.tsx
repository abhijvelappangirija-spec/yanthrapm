import type { Metadata } from 'next'

import { AuthProvider } from '@/components/auth/AuthProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Tools Dashboard',
  description: 'AI-powered tools for Business Requirements, Sprint Planning, UAT, and Support Documentation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
