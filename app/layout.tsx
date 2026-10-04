import '@fontsource-variable/nunito'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Linhagem', template: '%s - Linhagem' },
  description: 'Um idle game de família. Sem anúncios, sem compras.',
  applicationName: 'Linhagem',
  appleWebApp: { capable: true, title: 'Linhagem', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#2f6b4e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  )
}
