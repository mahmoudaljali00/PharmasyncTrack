'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/contexts/locale-context'
import type { TabProps } from '../settings-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Bluetooth, Globe, Printer, RefreshCw, ExternalLink, Check, X } from 'lucide-react'
import {
  isWebBluetoothSupported,
  connectBluetoothPrinter,
  getCachedPrinter,
  printBytes,
} from '@/lib/printing/web-bluetooth'
import { checkQzTrayAvailable, QZ_TRAY_DOWNLOAD_URL } from '@/lib/printing/qz-tray'
import { EscPosBuilder } from '@/lib/printing/escpos'
import { toast } from 'sonner'

export function PrintingTab({ settings }: TabProps) {
  const { t } = useLocale()

  const [btSupported, setBtSupported] = useState(false)
  const [btConnected, setBtConnected] = useState(false)
  const [btConnecting, setBtConnecting] = useState(false)

  const [qzAvailable, setQzAvailable] = useState<boolean | null>(null)
  const [qzChecking, setQzChecking] = useState(false)

  useEffect(() => {
    setBtSupported(isWebBluetoothSupported())
    setBtConnected(!!getCachedPrinter())
    runQzCheck()
  }, [])

  const runQzCheck = async () => {
    setQzChecking(true)
    try {
      const ok = await checkQzTrayAvailable()
      setQzAvailable(ok)
    } finally {
      setQzChecking(false)
    }
  }

  const handleBtConnect = async () => {
    setBtConnecting(true)
    try {
      await connectBluetoothPrinter()
      setBtConnected(true)
      toast.success(t('bluetoothConnected'))
    } catch (err) {
      console.error('[v0] Bluetooth connect failed:', err)
      toast.error((err as Error).message || 'Failed to connect')
    } finally {
      setBtConnecting(false)
    }
  }

  const handleBtTestPrint = async () => {
    try {
      const builder = new EscPosBuilder()
      builder
        .init()
        .align('center')
        .bold(true)
        .doubleSize(true)
        .text(settings.pharmacy_name)
        .newline()
        .doubleSize(false)
        .bold(false)
        .text('Test print successful')
        .newline()
        .text(new Date().toLocaleString())
        .newline()
        .feed(3)
        .cut()

      await printBytes(builder.build())
      toast.success('Test print sent')
    } catch (err) {
      console.error('[v0] test print failed:', err)
      toast.error((err as Error).message || 'Failed to print')
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{t('browserPrinting')}</CardTitle>
                <CardDescription>{t('browserPrintingDesc')}</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <Check className="me-1 h-3 w-3" />
              {t('active')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Receipts and labels render with paper-size-aware CSS ({settings.receipt_paper_size})
            and use the browser&apos;s native print dialog.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Bluetooth className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base">{t('bluetoothPrinting')}</CardTitle>
                <CardDescription>{t('bluetoothPrintingDesc')}</CardDescription>
              </div>
            </div>
            {!btSupported ? (
              <Badge variant="outline" className="bg-muted">
                <X className="me-1 h-3 w-3" />
                Unsupported
              </Badge>
            ) : btConnected ? (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <Check className="me-1 h-3 w-3" />
                {t('bluetoothConnected')}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!btSupported ? (
            <p className="text-sm text-muted-foreground">{t('bluetoothNotSupported')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleBtConnect} disabled={btConnecting}>
                {btConnecting ? <Spinner className="me-2" /> : <Bluetooth className="me-2 h-4 w-4" />}
                {t('bluetoothConnect')}
              </Button>
              <Button variant="outline" onClick={handleBtTestPrint} disabled={!btConnected}>
                <Printer className="me-2 h-4 w-4" />
                {t('bluetoothTestPrint')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-orange-500/10 p-2">
                <Printer className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-base">{t('qzTray')}</CardTitle>
                <CardDescription>{t('qzTrayDesc')}</CardDescription>
              </div>
            </div>
            {qzAvailable === true ? (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <Check className="me-1 h-3 w-3" />
                {t('qzTrayConnected')}
              </Badge>
            ) : qzAvailable === false ? (
              <Badge variant="outline" className="bg-muted">
                <X className="me-1 h-3 w-3" />
                {t('qzTrayDisconnected')}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={runQzCheck} disabled={qzChecking} variant="outline">
              {qzChecking ? <Spinner className="me-2" /> : <RefreshCw className="me-2 h-4 w-4" />}
              {t('qzTrayCheck')}
            </Button>
            <Button asChild variant="ghost">
              <a href={QZ_TRAY_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="me-2 h-4 w-4" />
                {t('qzTrayDownload')}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
