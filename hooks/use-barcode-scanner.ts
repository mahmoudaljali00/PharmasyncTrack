'use client'

import { useEffect, useRef } from 'react'

type Options = {
  /** Called when a complete barcode is detected. */
  onScan: (barcode: string) => void
  /** Max time (ms) between consecutive keystrokes for them to be treated as scanner input. */
  scanDelayMs?: number
  /** Minimum length of a barcode to accept. */
  minLength?: number
  /** When true, the hook is active. Set false to pause detection. */
  enabled?: boolean
  /** Time window (ms) used to suppress duplicate scans. */
  duplicateWindowMs?: number
  /** Selector predicate — return true to ignore the event (e.g. when typing in a real input). */
  shouldIgnore?: (e: KeyboardEvent) => boolean
}

/**
 * Detects rapid keystroke streams typical of USB/Bluetooth barcode scanners
 * operating in HID keyboard mode.
 *
 * Heuristic:
 *  - Time between consecutive keys must be < scanDelayMs (default 50ms).
 *  - Sequence ends on Enter/Tab OR after a 100ms pause.
 *  - Final string must meet minLength.
 *  - Same barcode within duplicateWindowMs is suppressed.
 *
 * Listens at the document level so it works even when no input is focused.
 */
export function useBarcodeScanner({
  onScan,
  scanDelayMs = 50,
  minLength = 3,
  enabled = true,
  duplicateWindowMs = 1000,
  shouldIgnore,
}: Options) {
  const bufferRef = useRef('')
  const lastKeyTsRef = useRef(0)
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastScanRef = useRef<{ value: string; ts: number }>({ value: '', ts: 0 })
  const onScanRef = useRef(onScan)
  const shouldIgnoreRef = useRef(shouldIgnore)

  // Keep latest callbacks without re-subscribing the listener
  useEffect(() => {
    onScanRef.current = onScan
    shouldIgnoreRef.current = shouldIgnore
  }, [onScan, shouldIgnore])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const finalizeBuffer = () => {
      const value = bufferRef.current
      bufferRef.current = ''
      if (value.length < minLength) return

      const now = Date.now()
      if (
        lastScanRef.current.value === value &&
        now - lastScanRef.current.ts < duplicateWindowMs
      ) {
        return
      }
      lastScanRef.current = { value, ts: now }
      onScanRef.current(value)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow consumer to opt-out (e.g. when typing in a regular text input)
      if (shouldIgnoreRef.current?.(e)) {
        bufferRef.current = ''
        return
      }

      // Ignore when modifier keys are pressed (Ctrl+C, Cmd+V, etc.)
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const now = performance.now()
      const sinceLast = now - lastKeyTsRef.current
      lastKeyTsRef.current = now

      // Reset buffer if too much time has passed since the last keystroke
      if (sinceLast > scanDelayMs && bufferRef.current.length > 0) {
        bufferRef.current = ''
      }

      // Enter/Tab → finalize
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (bufferRef.current.length >= minLength) {
          e.preventDefault()
          if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
          finalizeBuffer()
        }
        return
      }

      // Only single printable chars get appended
      if (e.key.length === 1) {
        bufferRef.current += e.key

        // Auto-flush after a quiet period (some scanners don't send Enter)
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
        flushTimerRef.current = setTimeout(finalizeBuffer, 100)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    }
  }, [enabled, scanDelayMs, minLength, duplicateWindowMs])
}
