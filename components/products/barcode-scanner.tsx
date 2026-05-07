'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { X, Camera, RefreshCw, Keyboard } from 'lucide-react'

import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
} from '@zxing/library'

type BarcodeScannerProps = {
  onScan: (barcode: string) => void
  onClose: () => void
}

export function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    let mounted = true

    const initScanner = async () => {
      if (showManualInput) return

      try {
        setIsInitializing(true)
        setError(null)

        // تحسينات الأداء
        const hints = new Map()

        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.EAN_13,
          BarcodeFormat.QR_CODE
        ])

        // مهم جدًا للسرعة
        hints.set(DecodeHintType.TRY_HARDER, false)

        const scanner = new BrowserMultiFormatReader(hints, 500)

        scannerRef.current = scanner

        // جلب الكاميرات
        const videoInputDevices =
          await scanner.listVideoInputDevices()

        if (!mounted) return

        setDevices(videoInputDevices)

        // اختيار الكاميرا الخلفية تلقائيًا
        const backCamera =
          videoInputDevices.find((device) =>
            device.label.toLowerCase().includes('back')
          ) ||
          videoInputDevices.find((device) =>
            device.label.toLowerCase().includes('rear')
          ) ||
          videoInputDevices[0]

        if (!backCamera) {
          throw new Error('No camera found')
        }

        setSelectedDeviceId(backCamera.deviceId)

        // تشغيل السكانر
        await scanner.decodeFromVideoDevice(
          backCamera.deviceId,
          videoRef.current!,
          (result, err) => {
            if (result) {
              const text = result.getText()

              navigator.vibrate?.(100)

              onScan(text)
            }

            // تجاهل الأخطاء الطبيعية
            if (
              err &&
              !(err instanceof NotFoundException)
            ) {
              console.error(err)
            }
          }
        )

        if (mounted) {
          setIsInitializing(false)
        }
      } catch (err) {
        console.error('[ZXING ERROR]', err)

        if (mounted) {
          setError(
            'Camera not available. Use manual entry instead.'
          )
          setShowManualInput(true)
          setIsInitializing(false)
        }
      }
    }

    initScanner()

    return () => {
      mounted = false
      scannerRef.current?.reset()
    }
  }, [onScan, showManualInput])

  // تغيير الكاميرا
  const handleChangeCamera = async (
    deviceId: string
  ) => {
    try {
      if (!scannerRef.current || !videoRef.current) return

      scannerRef.current.reset()

      setSelectedDeviceId(deviceId)

      await scannerRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            const text = result.getText()

            navigator.vibrate?.(100)

            onScan(text)
          }

          if (
            err &&
            !(err instanceof NotFoundException)
          ) {
            console.error(err)
          }
        }
      )
    } catch (err) {
      console.error(err)
    }
  }

  const handleRetry = async () => {
    scannerRef.current?.reset()

    setError(null)
    setShowManualInput(false)
    setIsInitializing(true)
  }

  const switchToManual = () => {
    scannerRef.current?.reset()

    setShowManualInput(true)
    setError(null)
    setIsInitializing(false)
  }

  const handleManualSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim())
    }
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

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              scannerRef.current?.reset()
              onClose()
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          {showManualInput ? (
            <form
              onSubmit={handleManualSubmit}
              className="space-y-4"
            >
              <Input
                type="text"
                placeholder="Enter barcode number..."
                value={manualBarcode}
                onChange={(e) =>
                  setManualBarcode(e.target.value)
                }
                autoFocus
              />

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!manualBarcode.trim()}
                >
                  Submit
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRetry}
                >
                  <Camera className="h-4 w-4 me-2" />
                  Try Camera
                </Button>
              </div>
            </form>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">
                {error}
              </p>

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleRetry}
                  variant="outline"
                >
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
            <div>
              {/* اختيار الكاميرا */}
              {devices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) =>
                    handleChangeCamera(
                      e.target.value
                    )
                  }
                  className="w-full mb-4 border rounded-md p-2"
                >
                  {devices.map((device) => (
                    <option
                      key={device.deviceId}
                      value={device.deviceId}
                    >
                      {device.label || 'Camera'}
                    </option>
                  ))}
                </select>
              )}

              {/* الفيديو */}
              <div className="relative overflow-hidden rounded-lg bg-black">
                <video
                  ref={videoRef}
                  className="w-full h-auto"
                  muted
                  playsInline
                />

                {/* إطار المسح */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[80%] h-[120px] border-4 border-red-500 rounded-xl" />
                </div>
              </div>

              {isInitializing && (
                <div className="flex justify-center py-6">
                  <div className="animate-pulse text-muted-foreground">
                    Initializing camera...
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground text-center mt-4">
                Point your camera at a barcode
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