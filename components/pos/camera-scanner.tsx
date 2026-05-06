'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale } from '@/contexts/locale-context'

type Props = {
  onScan: (barcode: string) => void
  onClose: () => void
}

/**
 * Camera-based 1D/QR barcode scanner using html5-qrcode.
 * Renders a full-screen modal with a live camera feed.
 */
export function CameraScanner({ onScan, onClose }: Props) {
  const { t } = useLocale()
  const [error, setError] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)
  const scannerRef = useRef<{ stop: () => Promise<void>; isScanning?: boolean } | null>(null)
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (!mounted) return

        const scanner = new Html5Qrcode('camera-scanner-region')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 260, height: 120 },
            aspectRatio: 1.7777,
          },
          (decoded) => {
            if (!mounted) return
            // Stop first to avoid duplicate scans
            scanner.stop().catch(() => {})
            onScanRef.current(decoded)
          },
          () => {
            // Decode failure on individual frames — ignore
          }
        )

        if (mounted) setInitializing(false)
      } catch (err) {
        console.error('[v0] Camera init failed:', err)
        if (mounted) {
          setError(t('scannerCameraNotAvailable'))
          setInitializing(false)
        }
      }
    }

    init()

    return () => {
      mounted = false
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [t])

  const handleRetry = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {})
    }
    setError(null)
    setInitializing(true)
    // Trigger re-mount via key change in parent; simpler to just close and reopen
    setTimeout(() => {
      window.location.reload()
    }, 50)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('scanBarcode')}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('close')}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-destructive">{error}</p>
              <Button onClick={handleRetry} variant="outline">
                <RefreshCw className="h-4 w-4 me-2" />
                {t('scannerSwitchTo')} {t('scanModeCamera')}
              </Button>
            </div>
          ) : (
            <div>
              <div
                id="camera-scanner-region"
                className="w-full overflow-hidden rounded-lg bg-muted min-h-[260px] relative"
              >
                {/* Scanning overlay */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-[260px] h-[120px] border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                </div>
              </div>
              {initializing && (
                <div className="flex justify-center py-4">
                  <span className="animate-pulse text-muted-foreground text-sm">
                    {t('scannerScanning')}
                  </span>
                </div>
              )}
              <p className="text-sm text-muted-foreground text-center mt-3">
                {t('scannerPointAtBarcode')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
