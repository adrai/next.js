import type {
  FlightRouterState,
  Segment,
} from '../../shared/lib/app-router-types'
import { DEFAULT_SEGMENT_KEY, PAGE_SEGMENT_KEY } from '../../shared/lib/segment'
import { segmentToSourcePagePathname } from './router-reducer/compute-changed-path'
import type {
  ClientInstrumentationHooks,
  RouterTransitionPrefetch,
  RouterTransitionPrefetchIntent,
  RouterTransitionType,
} from '../router-transition-types'

type RouterTransitionRecord = {
  id: string
  requestedUrl: string
  resolvedUrl: string
  type: RouterTransitionType
  previousRoutes: string[]
  prefetch: RouterTransitionPrefetch
  prefetchIntent: RouterTransitionPrefetchIntent
  pendingRequests: number
  committed: boolean
  mismatchEmitted: boolean
  terminal: boolean
}

let hooks: ClientInstrumentationHooks | null = null
let legacyStartHook: ClientInstrumentationHooks['onRouterTransitionStart']
let nextTransitionId = 0
let activeTransitionId: string | null = null
const transitions = new Map<string, RouterTransitionRecord>()

export function initializeRouterTransitionHooks(
  instrumentationHooks: ClientInstrumentationHooks | null
): void {
  legacyStartHook =
    instrumentationHooks !== null &&
    typeof instrumentationHooks.onRouterTransitionStart === 'function'
      ? instrumentationHooks.onRouterTransitionStart
      : undefined

  const hasLifecycleHook =
    instrumentationHooks !== null &&
    (typeof instrumentationHooks.onRouterTransitionCommit === 'function' ||
      typeof instrumentationHooks.onRouterTransitionSettled === 'function' ||
      typeof instrumentationHooks.onRouterTransitionMismatch === 'function' ||
      typeof instrumentationHooks.onRouterTransitionAbort === 'function')

  if (!process.env.__NEXT_INSTRUMENTATION_CLIENT_ROUTER_TRANSITION_EVENTS) {
    hooks = null
    if (process.env.NODE_ENV !== 'production' && hasLifecycleHook) {
      console.warn(
        'Router transition lifecycle hooks in instrumentation-client require ' +
          '`experimental.instrumentationClientRouterTransitionEvents` to be enabled.'
      )
    }
    return
  }

  hooks =
    instrumentationHooks !== null &&
    (legacyStartHook !== undefined || hasLifecycleHook)
      ? instrumentationHooks
      : null
}

function timestamp(): number {
  return performance.timeOrigin + performance.now()
}

function callHook(
  hook: ((...args: any[]) => void) | undefined,
  ...args: any[]
): void {
  if (hook === undefined) {
    return
  }
  try {
    hook(...args)
  } catch (error) {
    console.error(
      'An instrumentation-client router transition hook failed',
      error
    )
  }
}

export function startRouterTransition(
  url: string,
  type: RouterTransitionType,
  previousTree: FlightRouterState,
  prefetchIntent: RouterTransitionPrefetchIntent
): string | null {
  if (!process.env.__NEXT_INSTRUMENTATION_CLIENT_ROUTER_TRANSITION_EVENTS) {
    callHook(legacyStartHook, url, type)
    return null
  }

  if (hooks === null) {
    return null
  }

  if (activeTransitionId !== null) {
    abortRouterTransition(activeTransitionId, 'superseded')
  }

  const id = `${Date.now().toString(36)}-${(++nextTransitionId).toString(36)}`
  const record: RouterTransitionRecord = {
    id,
    requestedUrl: url,
    resolvedUrl: url,
    type,
    previousRoutes: getActiveRoutePaths(previousTree),
    prefetch: 'none',
    prefetchIntent,
    pendingRequests: 0,
    committed: false,
    mismatchEmitted: false,
    terminal: false,
  }
  transitions.set(id, record)
  activeTransitionId = id

  callHook(hooks.onRouterTransitionStart, url, type, {
    id,
    timestamp: timestamp(),
  })
  return id
}

export function setRouterTransitionPrefetch(
  id: string | null,
  prefetch: RouterTransitionPrefetch
): void {
  const record = id === null ? undefined : transitions.get(id)
  if (record !== undefined && !record.terminal) {
    // A route prediction can provide a tree after the prefetch cache misses.
    // Preserve the miss instead of later reclassifying it as a shell hit.
    if (record.prefetch !== 'miss') {
      record.prefetch = prefetch
    }
  }
}

export function beginRouterTransitionRequest(
  id: string | null
): (() => void) | undefined {
  const record = id === null ? undefined : transitions.get(id)
  if (record === undefined || record.terminal) {
    return undefined
  }

  record.pendingRequests++
  let finished = false
  return () => {
    if (finished) {
      return
    }
    finished = true
    const current = transitions.get(record.id)
    if (current === undefined || current.terminal) {
      return
    }
    current.pendingRequests--
    scheduleSettle(current)
  }
}

export function commitRouterTransition(
  id: string | null,
  url: string,
  tree: FlightRouterState
): void {
  const record = id === null ? undefined : transitions.get(id)
  if (record === undefined || record.terminal || record.committed) {
    return
  }

  record.committed = true
  record.resolvedUrl = url
  callHook(hooks?.onRouterTransitionCommit, url, record.type, {
    id: record.id,
    timestamp: timestamp(),
    routes: getActiveRoutePaths(tree),
    previousRoutes: record.previousRoutes,
    prefetch: record.prefetch,
    prefetchIntent: record.prefetchIntent,
  })
  scheduleSettle(record)
}

export function mismatchRouterTransition(id: string | null, url: string): void {
  const record = id === null ? undefined : transitions.get(id)
  if (record === undefined || record.terminal || record.mismatchEmitted) {
    return
  }

  record.mismatchEmitted = true
  record.resolvedUrl = url
  callHook(hooks?.onRouterTransitionMismatch, url, record.type, {
    id: record.id,
    timestamp: timestamp(),
  })
}

export function abortRouterTransition(
  id: string | null,
  reason: 'superseded' | 'hard-navigation' | 'error',
  url?: string
): void {
  const record = id === null ? undefined : transitions.get(id)
  if (record === undefined || record.terminal) {
    return
  }

  record.terminal = true
  record.resolvedUrl = url ?? record.resolvedUrl
  callHook(hooks?.onRouterTransitionAbort, record.resolvedUrl, record.type, {
    id: record.id,
    timestamp: timestamp(),
    reason,
  })
  transitions.delete(record.id)
  if (activeTransitionId === record.id) {
    activeTransitionId = null
  }
}

function scheduleSettle(record: RouterTransitionRecord): void {
  if (!record.committed || record.pendingRequests !== 0 || record.terminal) {
    return
  }

  setTimeout(() => {
    const current = transitions.get(record.id)
    if (
      current === undefined ||
      current.terminal ||
      !current.committed ||
      current.pendingRequests !== 0
    ) {
      return
    }

    current.terminal = true
    callHook(
      hooks?.onRouterTransitionSettled,
      current.resolvedUrl,
      current.type,
      {
        id: current.id,
        timestamp: timestamp(),
      }
    )
    transitions.delete(current.id)
    if (activeTransitionId === current.id) {
      activeTransitionId = null
    }
  }, 0)
}

function getSegmentPath(segment: Segment): string | null {
  if (Array.isArray(segment)) {
    return segmentToSourcePagePathname(segment)
  }
  if (segment === '' || segment.startsWith(PAGE_SEGMENT_KEY)) {
    return null
  }
  if (segment === DEFAULT_SEGMENT_KEY) {
    return 'default'
  }
  if (segment === '(__SLOT__)') {
    return null
  }
  return segment
}

export function getActiveRoutePaths(tree: FlightRouterState): string[] {
  const routes: Array<{ path: string; primary: boolean }> = []

  function visit(
    node: FlightRouterState,
    segments: string[],
    primary: boolean
  ): void {
    const segment = getSegmentPath(node[0])
    const nextSegments = segment === null ? segments : [...segments, segment]
    const parallelRoutes = node[1]
    const keys = Object.keys(parallelRoutes)

    const isPage =
      typeof node[0] === 'string' && node[0].startsWith(PAGE_SEGMENT_KEY)
    if (keys.length === 0 || isPage) {
      routes.push({
        path: `/${nextSegments.join('/')}`,
        primary,
      })
      return
    }

    if (parallelRoutes.children !== undefined) {
      visit(parallelRoutes.children, nextSegments, primary)
    }

    for (const key of keys.sort()) {
      if (key === 'children') {
        continue
      }
      visit(parallelRoutes[key], [...nextSegments, `@${key}`], false)
    }
  }

  visit(tree, [], true)
  return routes
    .sort((a, b) => {
      if (a.primary !== b.primary) {
        return a.primary ? -1 : 1
      }
      return a.path.localeCompare(b.path)
    })
    .map((route) => route.path)
}
