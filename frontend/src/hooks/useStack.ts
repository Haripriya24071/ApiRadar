import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stacksAPI } from '../lib/api'

export interface APIBase {
  id: string
  name: string
  slug: string
  category?: string
  logo_url?: string
}

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

export function useStack() {
  const queryClient = useQueryClient()

  const stacks = useQuery<StackProfile[]>({
    queryKey: ['stacks'],
    queryFn: stacksAPI.list,
  })

  const createStack = useMutation({
    mutationFn: (name: string = 'My Stack') => stacksAPI.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stacks'] })
    },
  })

  const deleteStack = useMutation({
    mutationFn: (stackId: string) => stacksAPI.delete(stackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stacks'] })
    },
  })

  const watchAPI = useMutation({
    mutationFn: ({
      stackId,
      apiId,
      sdkVersion,
    }: {
      stackId: string
      apiId: string
      sdkVersion?: string
    }) => stacksAPI.watch(stackId, apiId, sdkVersion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stacks'] })
    },
  })

  const unwatchAPI = useMutation({
    mutationFn: ({ stackId, apiId }: { stackId: string; apiId: string }) =>
      stacksAPI.unwatch(stackId, apiId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stacks'] })
    },
  })

  const parsePackage = useMutation({
    mutationFn: ({
      stackId,
      packageJson,
    }: {
      stackId: string
      packageJson: object
    }) => stacksAPI.parse(stackId, packageJson),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stacks'] })
    },
  })

  return {
    stacks,
    createStack,
    deleteStack,
    watchAPI,
    unwatchAPI,
    parsePackage,
  }
}
