'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import type { UserRow } from './users-client'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserRow | null
  onSaved: () => void
}

export function UserFormDialog({ open, onOpenChange, user, onSaved }: Props) {
  const { t } = useLocale()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'pharmacist' | 'cashier'>('cashier')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const isEdit = !!user

  useEffect(() => {
    if (open) {
      setName(user?.name || '')
      setEmail(user?.email || '')
      setPassword('')
      setRole(user?.role || 'cashier')
      setIsActive(user?.is_active ?? true)
    }
  }, [open, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      toast.error(t('error'))
      return
    }
    if (!isEdit && password.length < 8) {
      toast.error(t('passwordRequirements'))
      return
    }

    setSubmitting(true)
    try {
      const url = isEdit ? `/api/users/${user.id}` : '/api/users'
      const method = isEdit ? 'PATCH' : 'POST'
      const body = isEdit
        ? { name, email, role, is_active: isActive }
        : { name, email, password, role }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success(isEdit ? t('userUpdated') : t('userCreated'))
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
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? t('editUser') : t('addUser')}</DialogTitle>
            <DialogDescription>
              {isEdit ? t('editUser') : t('addUser')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">{t('passwordRequirements')}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="role">{t('role')}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('admin')}</SelectItem>
                  <SelectItem value="pharmacist">{t('pharmacist')}</SelectItem>
                  <SelectItem value="cashier">{t('cashier')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isEdit && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="active" className="text-sm font-medium">{t('active')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {isActive ? t('active') : t('inactive')}
                  </p>
                </div>
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner className="me-2" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
