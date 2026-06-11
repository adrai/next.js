import { Instant } from 'next'

export const instant: Instant = {
  level: 'experimental-error',
  unstable_samples: [{ params: { lang: 'en' } }],
}

export async function generateStaticParams() {
  return [{ lang: 'en' }]
}

export default async function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
