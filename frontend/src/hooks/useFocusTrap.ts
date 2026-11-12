import { useEffect, useRef, RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
].join(', ')

interface UseFocusTrapOptions {
  enabled?: boolean
  onEscape?: () => void
  initialFocusRef?: RefObject<HTMLElement>
  returnFocus?: boolean
}

export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T>,
  options: UseFocusTrapOptions = {}
) {
  const {
    enabled = true,
    onEscape,
    initialFocusRef,
    returnFocus = true,
  } = options

  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape

  const returnFocusRef = useRef(returnFocus)
  returnFocusRef.current = returnFocus

  const previousActiveElementRef = useRef<HTMLElement | null>(null)
  const isTrapActiveRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      if (isTrapActiveRef.current) {
        isTrapActiveRef.current = false
        if (returnFocusRef.current && previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
          previousActiveElementRef.current.focus()
          previousActiveElementRef.current = null
        }
      }
      return
    }

    const container = containerRef.current
    if (!container) return

    // Activate trap on transition to enabled
    if (!isTrapActiveRef.current) {
      isTrapActiveRef.current = true
      previousActiveElementRef.current = document.activeElement as HTMLElement

      // Only move initial focus if focus is not already inside the container
      if (!container.contains(document.activeElement)) {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus()
        } else {
          const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
          if (focusable.length > 0) {
            focusable[0].focus()
          } else {
            container.focus()
          }
        }
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscapeRef.current) {
        e.preventDefault()
        onEscapeRef.current()
        return
      }

      if (e.key !== 'Tab') return

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(el => {
        if (el.offsetParent !== null) return true
        const style = window.getComputedStyle(el)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })

      if (focusables.length === 0) {
        e.preventDefault()
        return
      }

      const firstFocusable = focusables[0]
      const lastFocusable = focusables[focusables.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable || !container.contains(document.activeElement)) {
          e.preventDefault()
          lastFocusable.focus()
        }
      } else {
        if (document.activeElement === lastFocusable || !container.contains(document.activeElement)) {
          e.preventDefault()
          firstFocusable.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [containerRef, enabled, initialFocusRef])

  // Restore focus on unmount if trap was active
  useEffect(() => {
    return () => {
      if (isTrapActiveRef.current && returnFocusRef.current && previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus()
      }
    }
  }, [])
}
