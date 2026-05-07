'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useLocale } from '@/contexts/locale-context'
import type { TabProps } from '../settings-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Upload, Trash2, ImageOff } from 'lucide-react'
import { toast } from 'sonner'

export function PharmacyTab({ settings, onPatch, saving }: TabProps) {
  const { t } = useLocale()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState({
    pharmacy_name: settings.pharmacy_name,
    pharmacy_address: settings.pharmacy_address ?? '',
    pharmacy_phone: settings.pharmacy_phone ?? '',
    pharmacy_email: settings.pharmacy_email ?? '',
    tax_id: settings.tax_id ?? '',
  })

  const handleSave = async () => {
    if (!draft.pharmacy_name.trim()) {
      toast.error(t('nameRequired'))
      return
    }
    await onPatch({
      pharmacy_name: draft.pharmacy_name.trim(),
      pharmacy_address: draft.pharmacy_address || null,
      pharmacy_phone: draft.pharmacy_phone || null,
      pharmacy_email: draft.pharmacy_email || null,
      tax_id: draft.tax_id || null,
    })
  }

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max file size is 5MB')
      return
    }
    setUploading(true)
    try {
      const sigRes = await fetch('/api/settings/upload-signature', { method: 'POST' })
      const sig = await sigRes.json()
      if (!sigRes.ok) {
        toast.error(sig.error || 'Upload failed')
        return
      }

      const form = new FormData()
      form.append('file', file)
      form.append('api_key', sig.apiKey)
      form.append('timestamp', String(sig.timestamp))
      form.append('signature', sig.signature)
      form.append('folder', sig.folder)

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: 'POST', body: form }
      )
      const upload = await uploadRes.json()
      if (!uploadRes.ok) {
        toast.error(upload.error?.message || 'Cloudinary upload failed')
        return
      }

      await onPatch({
        pharmacy_logo_url: upload.secure_url,
        cloudinary_logo_public_id: upload.public_id,
      })
    } catch (err) {
      console.error('[v0] logo upload error:', err)
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    await onPatch({
      pharmacy_logo_url: null,
      cloudinary_logo_public_id: null,
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t('pharmacyInfo')}</CardTitle>
          <CardDescription>{t('pharmacyInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t('pharmacyName')}</Label>
            <Input
              id="name"
              value={draft.pharmacy_name}
              onChange={(e) => setDraft({ ...draft, pharmacy_name: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">{t('pharmacyAddress')}</Label>
            <Textarea
              id="address"
              rows={2}
              value={draft.pharmacy_address}
              onChange={(e) => setDraft({ ...draft, pharmacy_address: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="phone">{t('pharmacyPhone')}</Label>
              <Input
                id="phone"
                value={draft.pharmacy_phone}
                onChange={(e) => setDraft({ ...draft, pharmacy_phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t('pharmacyEmail')}</Label>
              <Input
                id="email"
                type="email"
                value={draft.pharmacy_email}
                onChange={(e) => setDraft({ ...draft, pharmacy_email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tax_id">{t('pharmacyTaxId')}</Label>
            <Input
              id="tax_id"
              value={draft.tax_id}
              onChange={(e) => setDraft({ ...draft, tax_id: e.target.value })}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Spinner className="me-2" />}
              {t('saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('pharmacyLogo')}</CardTitle>
          <CardDescription>{t('logoHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-square w-full rounded-lg border-2 border-dashed bg-muted/30 flex items-center justify-center overflow-hidden">
            {settings.pharmacy_logo_url ? (
              <Image
                src={settings.pharmacy_logo_url}
                alt="Logo"
                width={300}
                height={300}
                className="object-contain w-full h-full"
                unoptimized
              />
            ) : (
              <ImageOff className="h-12 w-12 text-muted-foreground" />
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || saving}
              className="w-full"
            >
              {uploading ? <Spinner className="me-2" /> : <Upload className="me-2 h-4 w-4" />}
              {settings.pharmacy_logo_url ? t('replaceLogo') : t('uploadLogo')}
            </Button>
            {settings.pharmacy_logo_url && (
              <Button
                variant="ghost"
                onClick={handleRemove}
                disabled={uploading || saving}
                className="w-full text-destructive hover:text-destructive"
              >
                <Trash2 className="me-2 h-4 w-4" />
                {t('removeLogo')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
