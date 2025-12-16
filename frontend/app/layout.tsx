import type { Metadata } from 'next'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import QueryProvider from '../components/QueryProvider'
import LayoutWrapper from '../components/LayoutWrapper'
import './layout-client.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NYC Taxi Dashboard',
  description: 'Analytics dashboard for NYC Yellow Taxi trip data',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body>
        <QueryProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </QueryProvider>
      </body>
    </html>
  )
}


