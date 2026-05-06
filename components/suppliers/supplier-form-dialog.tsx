'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import type { SupplierRow } from './suppliers-client'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: SupplierRow | null
  onSaved: () => void
}

export function SupplierFormDialog({ open, onOpenChange, supplier, onSaved }: Props) {
  const { t } = useLocale()
  const isEdit = !!supplier

  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(supplier?.name ?? '')
      setCompanyName(supplier?.company_name ?? '')
      setPhone(supplier?.phone ?? '')
      setEmail(supplier?.email ?? '')
      setAddress(supplier?.address ?? '')
      setNotes(supplier?.notes ?? '')
      setIsActive(supplier?.is_active ?? true)
    }
  }, [open, supplier])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error(t('nameRequired'))
      return
    }
    setSubmitting(true)

    const payload = {
      name: name.trim(),
      company_name: companyName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
      is_active: isActive,
    }

    try {
      const url = isEdit ? `/api/suppliers/${supplier!.id}` : '/api/suppliers'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success(isEdit ? t('supplierUpdated') : t('supplierCreated'))
        onSaved()
        onOpenChange(false)
      } else {
        const data = await res.json()
        toast.error(data.error || t('error'))
      }
    } catch {
      toast.error(t('error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editSupplier') : t('addSupplier')}</DialogTitle>
          <DialogDescription>{t('suppliersManagement')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier-name">
              {t('name')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="supplier-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-company">{t('companyName')}</Label>
            <Input
              id="supplier-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier-phone">{t('phone')}</Label>
              <Input
                id="supplier-phone"
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-email">{t('email')}</Label>
              <Input
                id="supplier-email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-address">{t('address')}</Label>
            <Textarea
              id="supplier-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={1000}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-notes">{t('notes')}</Label>
            <Textarea
              id="supplier-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="supplier-active">{t('active')}</Label>
              <p className="text-xs text-muted-foreground">{t('status')}</p>
            </div>
            <Switch
              id="supplier-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner className="me-2" />}
              {isEdit ? t('save') : t('addSupplier')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
