import { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { ReactNode } from "react"

interface ToastMessage {
  id: number
  message: string
}

interface ToastContextValue {
  show: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const show = useCallback((message: string, duration = 2000) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="px-4 py-2 rounded-lg bg-[#1a1f36]/90 border border-[#4fc3f7]/40 text-sm text-white/90 backdrop-blur-sm animate-slide-up"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function Toast({ message, duration = 2000 }: { message: string; duration?: number }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(timer)
  }, [duration])

  if (!visible) return null

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-[#1a1f36]/90 border border-[#4fc3f7]/40 text-sm text-white/90 backdrop-blur-sm animate-slide-up">
      {message}
    </div>
  )
}
