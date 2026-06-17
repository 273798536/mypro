import { useCallback, useEffect, useState } from 'react'

type Status = 'idle' | 'loading' | 'error' | 'success'

export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(() => {
    let alive = true
    setStatus('loading')
    fetcher()
      .then((d) => {
        if (alive) {
          setData(d)
          setError(null)
          setStatus('success')
        }
      })
      .catch((e: unknown) => {
        if (alive) {
          setError(e instanceof Error ? e.message : String(e))
          setStatus('error')
        }
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => run(), [run])

  return {
    data,
    loading: status === 'loading',
    error,
    status,
    refresh: run,
    setData,
  }
}
