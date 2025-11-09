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


