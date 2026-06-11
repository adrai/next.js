import { lang } from 'next/root-params'

export const instant = { level: 'experimental-error' }

export default async function Page() {
  return (
    <main>
      <p>
        This page accesses a root param (link data) in a cache, which makes the
        whole cache act like link data. it's not wrapped in suspense, so we
        can't render a shell, and should fail validation.
      </p>
      <LinkDataInCache />
    </main>
  )
}

async function LinkDataInCache() {
  'use cache'
  const currentLang = await lang()
  return <div>{`Lang in page: ${currentLang}`}</div>
}
