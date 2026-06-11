import { ref, watch } from 'vue'

export function useStorage<T>(key: string, initialValue: T) {
  const stored = localStorage.getItem(key)
  const data = ref<T>(stored ? JSON.parse(stored) : initialValue)

  watch(data, (newVal) => {
    localStorage.setItem(key, JSON.stringify(newVal))
  }, { deep: true })

  function reset() {
    data.value = initialValue
    localStorage.removeItem(key)
  }

  return { data, reset }
}
