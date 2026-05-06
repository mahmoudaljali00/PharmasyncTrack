'use client'

import { useState, useRef } from 'react'
import { useLocale } from '@/contexts/locale-context'
import type { TabProps } from '../settings-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Download, Upload, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export function BackupTab({ settings, onPatch, saving }: TabProps) {
  const { t } = useLocale()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [autoEnabled, setAutoEnabled] = useState(settings.auto_backup_enabled)
  const [autoFreq, setAutoFreq] = useState(settings.auto_backup_frequency)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/settings/backup')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error || 'Export failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `medsync-backup-${date}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Backup downloaded')
    } catch (err) {
      console.error('[pharmasync-track] export failed:', err)
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleRestoreFile = async (file: File) => {
    setRestoring(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const res = await fetch('/api/settings/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Restore failed')
        return
      }
      toast.success('Settings restored')
      // Reload page so all settings consumers refresh
      window.location.reload()
    } catch (err) {
      console.error('[pharmasync-track] restore failed:', err)
      toast.error('Invalid backup file')
    } finally {
      setRestoring(false)
    }
  }

  const handleAutoSave = async () => {
    await onPatch({
      auto_backup_enabled: autoEnabled,
      auto_backup_frequency: autoFreq,
    })
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('exportBackup')}</CardTitle>
          <CardDescription>{t('exportBackupDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? <Spinner className="me-2" /> : <Download className="me-2 h-4 w-4" />}
            {t('exportBackup')}
          </Button>
          {settings.last_backup_at && (
            <p className="text-xs text-muted-foreground">
              {t('lastBackup')}:{' '}
              {new Date(settings.last_backup_at).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('restoreBackup')}</CardTitle>
          <CardDescription>{t('restoreBackupDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleRestoreFile(f)
              e.target.value = ''
            }}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={restoring}
          >
            {restoring ? <Spinner className="me-2" /> : <Upload className="me-2 h-4 w-4" />}
            {t('restoreFile')}
          </Button>
          <div className="flex items-start gap-2 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{t('restoreNote')}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('autoBackup')}</CardTitle>
          <CardDescription>{t('autoBackupDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="auto" className="cursor-pointer">
              {t('autoBackupEnabled')}
            </Label>
            <Switch id="auto" checked={autoEnabled} onCheckedChange={setAutoEnabled} />
          </div>

          <div className="grid gap-2">
            <Label>{t('autoBackupFrequency')}</Label>
            <Select
              value={autoFreq}
              onValueChange={(v) => setAutoFreq(v as 'daily' | 'weekly' | 'monthly')}
              disabled={!autoEnabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t('daily')}</SelectItem>
                <SelectItem value="weekly">{t('weekly')}</SelectItem>
                <SelectItem value="monthly">{t('monthly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleAutoSave} disabled={saving}>
              {saving && <Spinner className="me-2" />}
              {t('saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
