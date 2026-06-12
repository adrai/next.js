export type RouterTransitionType = 'push' | 'replace' | 'traverse'

export type RouterTransitionPrefetch =
  | 'hit-route'
  | 'hit-shell'
  | 'miss'
  | 'none'

export type RouterTransitionPrefetchIntent = 'full' | 'auto' | 'none'

export type RouterTransitionStartEvent = {
  id: string
  timestamp: number
}

export type RouterTransitionCommitEvent = RouterTransitionStartEvent & {
  routes: string[]
  previousRoutes: string[]
  prefetch: RouterTransitionPrefetch
  prefetchIntent: RouterTransitionPrefetchIntent
}

export type RouterTransitionEvent = RouterTransitionStartEvent

export type RouterTransitionAbortEvent = RouterTransitionEvent & {
  reason: 'superseded' | 'hard-navigation' | 'error'
}

export type ClientInstrumentationHooks = {
  onRouterTransitionStart?: (
    url: string,
    navigationType: RouterTransitionType,
    event: RouterTransitionStartEvent
  ) => void
  onRouterTransitionCommit?: (
    url: string,
    navigationType: RouterTransitionType,
    event: RouterTransitionCommitEvent
  ) => void
  onRouterTransitionSettled?: (
    url: string,
    navigationType: RouterTransitionType,
    event: RouterTransitionEvent
  ) => void
  onRouterTransitionMismatch?: (
    url: string,
    navigationType: RouterTransitionType,
    event: RouterTransitionEvent
  ) => void
  onRouterTransitionAbort?: (
    url: string,
    navigationType: RouterTransitionType,
    event: RouterTransitionAbortEvent
  ) => void
}
