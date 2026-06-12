import { ReactNode } from 'react'

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>
  children: ReactNode
}) {
  // All params at this level are root params, so we should be able
  // to access them without blocking the app shell.
  const { lang } = await params
  return (
    <>
      <p id="root-param-from-layout">{`Root param from layout: ${lang}`}</p>
      {children}
    </>
  )
}
