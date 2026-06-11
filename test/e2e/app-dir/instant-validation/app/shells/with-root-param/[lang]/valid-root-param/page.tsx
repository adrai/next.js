import { Suspense } from 'react'
import { lang } from 'next/root-params'
import { connection } from 'next/server'

export const instant = { level: 'experimental-error' }

export default async function Page() {
  return (
    <main>
      <h1>repro</h1>
      <Suspense
        fallback={<div>This fallback should be visible in a shell</div>}
      >
        <LinkData />
      </Suspense>
      <Suspense
        fallback={<div>This fallback should be visible in a shell</div>}
      >
        <LinkDataCache />
      </Suspense>
      <Suspense fallback="Loading dynamic content...">
        <Dynamic />
      </Suspense>
    </main>
  )
}

async function LinkData() {
  const currentLang = await lang()
  return <div>{`Lang in page: ${currentLang}`}</div>
}

async function LinkDataCache() {
  'use cache'
  const currentLang = await lang()
  return <div>{`Lang in cache: ${currentLang}`}</div>
}

async function Dynamic() {
  await connection()
  return 'Dynamic content'
}
