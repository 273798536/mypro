import { useState, useEffect, useCallback } from 'react';

/**
 * useLocalStorage Hook 返回值类型
 */
type UseLocalStorageReturn<T> = [
  /** 当前存储的值 */
  T,
  /** 更新存储值的函数 */
  (value: T | ((prevValue: T) => T)) => void,
  /** 移除存储值的函数 */
  () => void
];

/**
 * LocalStorage 持久化 Hook
 * 自动进行 JSON 序列化/反序列化，支持函数式更新
 *
 * @template T - 存储值的类型
 * @param key - LocalStorage 存储键名
 * @param initialValue - 初始默认值
 * @returns [value, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): UseLocalStorageReturn<T> {
  /**
   * 从 LocalStorage 读取并解析初始值
   */
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`[useLocalStorage] 读取键 "${key}" 失败:`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  /** 状态存储 */
  const [storedValue, setStoredValue] = useState<T>(readValue);

  /**
   * 更新存储值
   * 支持直接传值或函数式更新
   */
  const setValue = useCallback(
    (value: T | ((prevValue: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`[useLocalStorage] 设置键 "${key}" 失败:`, error);
      }
    },
    [key, storedValue]
  );

  /**
   * 从 LocalStorage 移除该键
   */
  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`[useLocalStorage] 删除键 "${key}" 失败:`, error);
    }
  }, [key, initialValue]);

  /**
   * 监听其他标签页的 storage 事件，保持同步
   */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
        } catch {
          setStoredValue(readValue());
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, readValue]);

  return [storedValue, setValue, removeValue];
}
