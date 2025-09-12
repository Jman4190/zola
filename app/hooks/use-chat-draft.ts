import { useCallback, useEffect, useState } from "react"

export function useChatDraft(chatId: string | null) {
  const storageKey = chatId ? `chat-draft-${chatId}` : "chat-draft-new"

  // Start with an empty draft on both server and client to avoid SSR/CSR mismatches.
  // Read from localStorage after mount.
  const [draftValue, setDraftValueState] = useState<string>("")

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem(storageKey) || ""
      setDraftValueState(stored)
    } catch {
      // noop
    }
  }, [storageKey])

  const setDraftValue = useCallback(
    (value: string) => {
      setDraftValueState(value)

      if (typeof window !== "undefined") {
        if (value) {
          localStorage.setItem(storageKey, value)
        } else {
          localStorage.removeItem(storageKey)
        }
      }
    },
    [storageKey]
  )

  const clearDraft = useCallback(() => {
    setDraftValueState("")
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  return {
    draftValue,
    setDraftValue,
    clearDraft,
  }
}
