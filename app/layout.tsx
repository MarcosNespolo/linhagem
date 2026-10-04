import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Linhagem', template: '%s · Linhagem' },
  description: 'Um idle game de família. Sem anúncios, sem compras.',
  applicationName: 'Linhagem',
  appleWebApp: { capable: true, title: 'Linhagem', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  )
}
