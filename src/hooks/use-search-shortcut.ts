import { useEffect, useRef } from 'octane'

export function useSearchShortcut() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return
      const input = inputRef.current
      if (!input || input.disabled) return
      event.preventDefault()
      input.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])
  return inputRef
}
