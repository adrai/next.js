type TransitionEvent = {
  id: string
  timestamp: number
  routes?: string[]
  previousRoutes?: string[]
  prefetch?: string
  prefetchIntent?: string
}

function record(phase: string, url: string, event: TransitionEvent) {
  const events = ((window as any).__ROUTER_TRANSITION_EVENTS ??= [])
  events.push({
    phase,
    url: new URL(url, window.location.href).pathname,
    event,
  })
}

export function onRouterTransitionStart(
  url: string,
  _navigationType: string,
  event: TransitionEvent
) {
  record('start', url, event)
}

export function onRouterTransitionCommit(
  url: string,
  _navigationType: string,
  event: TransitionEvent
) {
  record('commit', url, event)
}

export function onRouterTransitionSettled(
  url: string,
  _navigationType: string,
  event: TransitionEvent
) {
  record('settled', url, event)
}
