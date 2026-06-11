import { lang } from 'next/root-params'

export const instant = { level: 'experimental-error' }

export default async function Page() {
  return (
    <main>
      <p>
        This page accesses a root param (link data) without a suspense, so we
        can't render a shell, and should fail validation.
      </p>
      <LinkData />
    </main>
  )
}

async function LinkData() {
  const currentLang = await lang()
  return <div>{`Lang in page: ${currentLang}`}</div>
}
