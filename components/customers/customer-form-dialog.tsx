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
import type { CustomerRow } from './customers-client'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: CustomerRow | null
  onSaved: () => void
}

function toDateInput(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function CustomerFormDialog({ open, onOpenChange, customer, onSaved }: Props) {
  const { t } = useLocale()
  const isEdit = !!customer

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(customer?.name ?? '')
      setPhone(customer?.phone ?? '')
      setEmail(customer?.email ?? '')
      setAddress(customer?.address ?? '')
      setDateOfBirth(toDateInput(customer?.date_of_birth ?? null))
      setNotes(customer?.notes ?? '')
      setIsActive(customer?.is_active ?? true)
    }
  }, [open, customer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error(t('nameRequired'))
      return
    }
    setSubmitting(true)

    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      date_of_birth: dateOfBirth || null,
      notes: notes.trim() || null,
      is_active: isActive,
    }

    try {
      const url = isEdit ? `/api/customers/${customer!.id}` : '/api/customers'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success(isEdit ? t('customerUpdated') : t('customerCreated'))
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
          <DialogTitle>{isEdit ? t('editCustomer') : t('addCustomer')}</DialogTitle>
          <DialogDescription>{t('customersManagement')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">
              {t('name')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer-phone">{t('phone')}</Label>
              <Input
                id="customer-phone"
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">{t('email')}</Label>
              <Input
                id="customer-email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-dob">{t('dateOfBirth')}</Label>
            <Input
              id="customer-dob"
              type="date"
              dir="ltr"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-address">{t('address')}</Label>
            <Textarea
              id="customer-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={1000}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-notes">{t('notes')}</Label>
            <Textarea
              id="customer-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="customer-active">{t('active')}</Label>
              <p className="text-xs text-muted-foreground">{t('status')}</p>
            </div>
            <Switch
              id="customer-active"
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
              {isEdit ? t('save') : t('addCustomer')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
