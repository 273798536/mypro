import { useState, useCallback } from 'react'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApi<T = unknown>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const request = useCallback(async <R = T>(
    url: string,
    options?: RequestInit
  ): Promise<R> => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.message || `请求失败 (${res.status})`)
      }
      if (res.status === 204) {
        setState({ data: null, loading: false, error: null })
        return null as R
      }
      const json = await res.json()
      setState({ data: json as T, loading: false, error: null })
      return json as R
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知错误'
      setState((prev) => ({ ...prev, loading: false, error: message }))
      throw err
    }
  }, [])

  const get = useCallback(
    <R = T>(url: string) => request<R>(url),
    [request]
  )

  const post = useCallback(
    <R = T>(url: string, body: unknown) =>
      request<R>(url, { method: 'POST', body: JSON.stringify(body) }),
    [request]
  )

  const put = useCallback(
    <R = T>(url: string, body: unknown) =>
      request<R>(url, { method: 'PUT', body: JSON.stringify(body) }),
    [request]
  )

  return { ...state, request, get, post, put }
}
