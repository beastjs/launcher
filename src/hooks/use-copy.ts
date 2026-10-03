import { useEffect, useRef, useState } from 'octane'

export function useCopy({ timeout = 2000 }: { timeout?: number } = {}) {
  const [copiedName, setCopiedName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const active = useRef(true)
  const generation = useRef(0)
  useEffect(() => {
    active.current = true
    return () => { active.current = false; generation.current++; if (timer.current) clearTimeout(timer.current) }
  }, [])
  const copy = async (name: string, text: string) => {
    const token = ++generation.current
    if (timer.current) clearTimeout(timer.current)
    setCopiedName(null)
    setError(null)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard is unavailable. Use HTTPS or localhost.')
      await navigator.clipboard.writeText(text)
      if (active.current && token === generation.current) {
        setCopiedName(name)
        timer.current = setTimeout(() => { setCopiedName(null); timer.current = null }, timeout)
      }
      return true
    } catch (failure) {
      if (active.current && token === generation.current) setError(failure instanceof Error ? failure.message : 'Could not copy icon.')
      return false
    }
  }
  return { copy, copiedName, isCopied: copiedName !== null, error }
}
