/** Tiny localStorage-backed store compatible with useSyncExternalStore; the server snapshot is always the fallback. */
export function createPersistedStore<T extends string>(key: string, fallback: T, isValid: (raw: string) => raw is T) {
  let value = fallback
  let loaded = false
  const listeners = new Set<() => void>()

  const load = () => {
    if (loaded || typeof window === "undefined") return
    loaded = true
    try {
      const raw = window.localStorage.getItem(key)
      if (raw !== null && isValid(raw)) value = raw
    } catch {
      // Storage can be unavailable (private mode); keep the in-memory value.
    }
  }

  return {
    get(): T {
      load()
      return value
    },
    getServer(): T {
      return fallback
    },
    set(next: T) {
      load()
      value = next
      try {
        window.localStorage.setItem(key, next)
      } catch {
        // See above.
      }
      listeners.forEach((cb) => cb())
    },
    subscribe(cb: () => void) {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
  }
}
