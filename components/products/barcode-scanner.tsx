'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { X, Camera, RefreshCw, Keyboard } from 'lucide-react'

type BarcodeScannerProps = {
  onScan: (barcode: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const scannerRef = useRef<{ stop: () => Promise<void>; isScanning?: boolean } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true

    const initScanner = async () => {
      if (!containerRef.current || showManualInput) return

      try {
        // Dynamic import to avoid SSR issues
        const { Html5Qrcode } = await import('html5-qrcode')
        const scanner = new Html5Qrcode('barcode-reader')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 100 },
            aspectRatio: 1.777778,
          },
          (decodedText) => {
            if (mounted) {
              onScan(decodedText)
              scanner.stop()
            }
          },
          () => {
            // QR code not found - ignore
          }
        )

        if (mounted) {
          setIsInitializing(false)
        }
      } catch (err) {
        console.error('[v0] Scanner error:', err)
        if (mounted) {
          setError('Camera not available. Use manual entry instead.')
          setIsInitializing(false)
          setShowManualInput(true)
        }
      }
    }

    initScanner()

    return () => {
      mounted = false
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [onScan, showManualInput])

  const handleRetry = async () => {
    setError(null)
    setIsInitializing(true)
    setShowManualInput(false)
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(console.error)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim())
    }
  }

  const switchToManual = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(console.error)
    }
    setShowManualInput(true)
    setIsInitializing(false)
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {showManualInput ? (
              <>
                <Keyboard className="h-5 w-5" />
                Enter Barcode
              </>
            ) : (
              <>
                <Camera className="h-5 w-5" />
                Scan Barcode
              </>
            )}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {showManualInput ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter barcode number..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={!manualBarcode.trim()}>
                  Submit
                </Button>
                <Button type="button" variant="outline" onClick={handleRetry}>
                  <Camera className="h-4 w-4 me-2" />
                  Try Camera
                </Button>
              </div>
            </form>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleRetry} variant="outline">
                  <RefreshCw className="h-4 w-4 me-2" />
                  Retry Camera
                </Button>
                <Button onClick={switchToManual}>
                  <Keyboard className="h-4 w-4 me-2" />
                  Manual Entry
                </Button>
              </div>
            </div>
          ) : (
            <div ref={containerRef}>
              <div 
                id="barcode-reader" 
                className="w-full overflow-hidden rounded-lg bg-muted min-h-[200px]"
              />
              {isInitializing && (
                <div className="flex justify-center py-8">
                  <div className="animate-pulse text-muted-foreground">
                    Initializing camera...
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground text-center mt-4">
                Point your camera at a barcode to scan
              </p>
              <Button 
                variant="link" 
                className="w-full mt-2" 
                onClick={switchToManual}
              >
                <Keyboard className="h-4 w-4 me-2" />
                Enter barcode manually instead
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
