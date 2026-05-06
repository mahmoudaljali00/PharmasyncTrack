'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Keyboard, ScanLine, Zap, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useLocale } from '@/contexts/locale-context'
import { useSettings } from '@/contexts/settings-context'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
import { CameraScanner } from '@/components/pos/camera-scanner'
import { cn } from '@/lib/utils'

export type ScanMode = 'auto' | 'camera' | 'scanner' | 'manual'

type Props = {
  onScan: (barcode: string) => void
  onSearch?: (query: string) => void
  searchValue?: string
  searchPlaceholder?: string
  /** Hide the inline search input (when only the mode toggles are needed). */
  hideSearch?: boolean
  className?: string
}

/**
 * Unified barcode input bar for POS.
 *
 * Renders three mode-toggle icons (Camera / Scanner / Keyboard) plus the
 * search input. Listens for external scanner input when in `auto` or
 * `scanner` mode, opens the camera modal in `camera` mode, and forwards
 * Enter-key submissions in `manual` mode.
 */
export function BarcodeInput({
  onScan,
  onSearch,
  searchValue = '',
  searchPlaceholder,
  hideSearch = false,
  className,
}: Props) {
  const { t, isRTL } = useLocale()
  const settings = useSettings()

  // Initial mode comes from user's last-used preference, falling back to global
  const [mode, setMode] = useState<ScanMode>(
    () => settings.scanner_last_used || settings.scanner_mode || 'auto'
  )
  const [showCamera, setShowCamera] = useState(false)
  const [scannerActive, setScannerActive] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const scannerActiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from settings if the user changes preference elsewhere
  useEffect(() => {
    if (settings.scanner_mode && settings.scanner_mode !== 'auto') {
      // Admin forced a specific mode
      setMode(settings.scanner_mode)
    }
  }, [settings.scanner_mode])

  // Persist the user's chosen mode (best-effort, fire-and-forget)
  const persistMode = useCallback(async (next: ScanMode) => {
    try {
      await fetch('/api/scanner-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_used: next }),
      })
    } catch {
      // ignore — preference persistence is best-effort
    }
  }, [])

  const handleSelectMode = (next: ScanMode) => {
    setMode(next)
    persistMode(next)
    if (next === 'camera') {
      setShowCamera(true)
    } else {
      setShowCamera(false)
      // Refocus input on the next tick so the field is ready for input
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  const handleHardwareScan = useCallback(
    (barcode: string) => {
      // Visual feedback: pulse the scanner badge
      setScannerActive(true)
      if (scannerActiveTimerRef.current) clearTimeout(scannerActiveTimerRef.current)
      scannerActiveTimerRef.current = setTimeout(() => setScannerActive(false), 600)
      onScan(barcode)
    },
    [onScan]
  )

  // Listen for external scanner input when in auto or scanner mode
  const listenerEnabled = mode === 'auto' || mode === 'scanner'
  useBarcodeScanner({
    enabled: listenerEnabled && !showCamera,
    onScan: handleHardwareScan,
    scanDelayMs: settings.scanner_delay_ms,
    minLength: settings.scanner_min_length,
    shouldIgnore: (e) => {
      // Don't intercept when the user is actively typing in the manual input
      const target = e.target as HTMLElement | null
      if (!target) return false
      if (mode === 'manual' && target === inputRef.current) return true
      // Allow typing in textareas / contenteditable elements
      if (target.tagName === 'TEXTAREA') return true
      if ((target as HTMLElement).isContentEditable) return true
      return false
    },
  })

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (scannerActiveTimerRef.current) clearTimeout(scannerActiveTimerRef.current)
    }
  }, [])

  const handleManualSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const value = (e.currentTarget.value || '').trim()
      if (
        value.length >= settings.scanner_min_length &&
        // Manual mode always treats Enter as a barcode submission
        (mode === 'manual' || /^[A-Za-z0-9\-_.]+$/.test(value))
      ) {
        onScan(value)
        if (onSearch) onSearch('')
        e.currentTarget.value = ''
      }
    }
  }

  const modeButtons: Array<{
    mode: ScanMode
    icon: typeof Camera
    labelKey: 'scanModeCamera' | 'scanModeScanner' | 'scanModeManual'
  }> = [
    { mode: 'camera', icon: Camera, labelKey: 'scanModeCamera' },
    { mode: 'scanner', icon: ScanLine, labelKey: 'scanModeScanner' },
    { mode: 'manual', icon: Keyboard, labelKey: 'scanModeManual' },
  ]

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        {!hideSearch && (
          <div className="relative flex-1">
            <Search
              className={cn(
                'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground',
                isRTL ? 'right-3' : 'left-3'
              )}
            />
            <Input
              ref={inputRef}
              value={searchValue}
              onChange={(e) => onSearch?.(e.target.value)}
              onKeyDown={handleManualSubmit}
              placeholder={searchPlaceholder ?? t('searchOrScan')}
              className={cn(isRTL ? 'pr-9' : 'pl-9')}
              aria-label={t('searchOrScan')}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}

        <TooltipProvider delayDuration={200}>
          <div
            className="flex items-center gap-1 rounded-md border bg-card p-1"
            role="group"
            aria-label={t('scannerMode')}
          >
            {modeButtons.map(({ mode: m, icon: Icon, labelKey }) => {
              const active = mode === m || (mode === 'auto' && m === 'scanner')
              return (
                <Tooltip key={m}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={active ? 'default' : 'ghost'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleSelectMode(m)}
                      aria-label={t(labelKey)}
                      aria-pressed={active}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t(labelKey)}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Active mode indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge
          variant={scannerActive ? 'default' : 'secondary'}
          className={cn(
            'gap-1.5 transition-colors',
            scannerActive && 'animate-pulse'
          )}
        >
          {mode === 'camera' && <Camera className="h-3 w-3" />}
          {(mode === 'scanner' || mode === 'auto') && <ScanLine className="h-3 w-3" />}
          {mode === 'manual' && <Keyboard className="h-3 w-3" />}
          <span>{t('scannerActiveMode')}: </span>
          <span className="font-semibold">
            {mode === 'camera' && t('scanModeCamera')}
            {mode === 'scanner' && t('scanModeScanner')}
            {mode === 'manual' && t('scanModeManual')}
            {mode === 'auto' && t('scanModeAuto')}
          </span>
        </Badge>
        {(mode === 'auto' || mode === 'scanner') && !showCamera && (
          <span className="hidden sm:inline-flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {t('scannerScannerListening')}
          </span>
        )}
      </div>

      {showCamera && (
        <CameraScanner
          onScan={(barcode) => {
            setShowCamera(false)
            // Return to the previous (non-camera) mode so the user can continue
            const next: ScanMode =
              settings.scanner_mode === 'camera' ? 'camera' : 'auto'
            setMode(next)
            onScan(barcode)
          }}
          onClose={() => {
            setShowCamera(false)
            setMode('auto')
          }}
        />
      )}
    </div>
  )
}
