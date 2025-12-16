import type { Metadata } from 'next'
import QueryProvider from '../components/QueryProvider'
import LayoutWrapper from '../components/LayoutWrapper'
import './layout-client.css'

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
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


