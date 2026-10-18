import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apisAPI, stacksAPI } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { APIBase, APICatalog } from '../types'
import { mapPackageToApiSlug } from '../lib/packageParser'

const GUEST_STACK_KEY = 'apiradar_guest_stack'
const GUEST_STACK_ID = 'guest-local-stack'

export interface WatchedAPI {
  id: string
  api_id: string
  sdk_version?: string
  api: APIBase
}

export interface StackProfile {
  id: string
  name: string
  created_at: string
  watched_apis: WatchedAPI[]
}

export interface ParsedAPIMatch {
  api: APIBase
  sdk_version?: string
  already_watching: boolean
}

function readGuestStack(): StackProfile | null {
  try {
    const saved = localStorage.getItem(GUEST_STACK_KEY)
    if (!saved) return null
    const stack = JSON.parse(saved) as StackProfile
    if (!stack || !Array.isArray(stack.watched_apis)) return null
    return stack
  } catch {
    return null
  }
}

function saveGuestStack(stack: StackProfile | null) {
  if (stack) localStorage.setItem(GUEST_STACK_KEY, JSON.stringify(stack))
  else localStorage.removeItem(GUEST_STACK_KEY)
}

export function getGuestStackForSync() {
  return readGuestStack()
}

export function clearGuestStackAfterSync() {
  saveGuestStack(null)
}

function makeGuestStack(name = 'My Stack'): StackProfile {
  return {
    id: GUEST_STACK_ID,
    name,
    created_at: new Date().toISOString(),
    watched_apis: [],
  }
}

export function useStack() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const queryKey = ['stacks', user?.id ?? 'guest']

  const stacks = useQuery<StackProfile[]>({
    queryKey,
    queryFn: () => user ? stacksAPI.list() : Promise.resolve(readGuestStack() ? [readGuestStack()!] : []),
  })

  const refreshStacks = () => queryClient.invalidateQueries({ queryKey: ['stacks'] })
  const updateGuestStack = (update: (stack: StackProfile | null) => StackProfile | null) => {
    const next = update(readGuestStack())
    saveGuestStack(next)
    queryClient.setQueryData<StackProfile[]>(queryKey, next ? [next] : [])
    return next
  }

  const createStack = useMutation({
    mutationFn: async (name: string = 'My Stack') => {
      if (user) return stacksAPI.create(name)
      return updateGuestStack((stack) => stack || makeGuestStack(name))!
    },
    onSuccess: refreshStacks,
  })

  const deleteStack = useMutation({
    mutationFn: async (stackId: string) => {
      if (user) return stacksAPI.delete(stackId)
      updateGuestStack(() => null)
    },
    onSuccess: refreshStacks,
  })

  const watchAPI = useMutation({
    mutationFn: async ({
      stackId,
      apiId,
      sdkVersion,
      api,
    }: {
      stackId: string
      apiId: string
      sdkVersion?: string
      api?: APIBase | APICatalog
    }) => {
      if (user) return stacksAPI.watch(stackId, apiId, sdkVersion)
      if (!api) throw new Error('API details are required to save a guest watchlist')

      const stack = readGuestStack() || makeGuestStack()
      const watched: WatchedAPI = {
        id: apiId,
        api_id: apiId,
        sdk_version: sdkVersion,
        api: {
          id: api.id,
          name: api.name,
          slug: api.slug,
          category: api.category,
          logo_url: api.logo_url,
        },
      }
      const next = {
        ...stack,
        watched_apis: [
          ...stack.watched_apis.filter((item) => item.api_id !== apiId),
          watched,
        ],
      }
      saveGuestStack(next)
      return watched
    },
    onSuccess: refreshStacks,
  })

  const unwatchAPI = useMutation({
    mutationFn: async ({ stackId, apiId }: { stackId: string; apiId: string }) => {
      if (user) return stacksAPI.unwatch(stackId, apiId)
      updateGuestStack((stack) => stack ? {
        ...stack,
        watched_apis: stack.watched_apis.filter((item) => item.api_id !== apiId),
      } : null)
    },
    onSuccess: refreshStacks,
  })

  const parsePackage = useMutation({
    mutationFn: async ({ stackId, packageJson }: { stackId: string; packageJson: object }) => {
      if (user) return stacksAPI.parse(stackId, packageJson)

      const content = packageJson as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }
      const dependencies = { ...content.dependencies, ...content.devDependencies }
      const catalog = await apisAPI.list()
      const watchedIds = new Set((readGuestStack()?.watched_apis || []).map((item) => item.api_id))
      const seen = new Set<string>()

      return Object.entries(dependencies)
        .flatMap(([packageName, version]) => {
          const slug = mapPackageToApiSlug(packageName)
          const api = catalog.find((item) => item.slug === slug)
          if (!api || seen.has(api.id)) return []
          seen.add(api.id)
          const versionSpec = String(version).trim()
          return [{
            api,
            sdk_version: versionSpec
              ? `${packageName}@${versionSpec.replace(/^[^\w]*/, '')}`
              : packageName,
            already_watching: watchedIds.has(api.id),
          }]
        })
    },
    onSuccess: refreshStacks,
  })

  return { stacks, createStack, deleteStack, watchAPI, unwatchAPI, parsePackage }
}
