import { useEffect, useState, useCallback } from 'react'

interface State<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null })

  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcher()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((e: unknown) =>
        setState({ data: null, loading: false, error: e instanceof Error ? e.message : '加载失败' }),
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    run()
  }, [run])

  return { ...state, reload: run }
}
