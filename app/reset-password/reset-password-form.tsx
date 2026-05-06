'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from '@/contexts/locale-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { CheckCircle2, Pill, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function ResetPasswordForm() {
  const { t, locale, setLocale } = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    if (password.length < 8) {
      toast.error(t('passwordRequirements'))
      return
    }
    if (password !== confirm) {
      toast.error(t('passwordsDoNotMatch'))
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
        toast.success(t('resetPasswordSuccess'))
        setTimeout(() => router.push('/login'), 2000)
      } else {
        toast.error(data.error || t('error'))
      }
    } catch {
      toast.error(t('error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="sm" onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}>
            {locale === 'en' ? 'العربية' : 'English'}
          </Button>
        </div>

        <Card>
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Pill className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{t('resetPasswordTitle')}</CardTitle>
              <CardDescription className="mt-1">{t('resetPasswordDesc')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!token ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <p className="text-sm text-muted-foreground">{t('invalidResetToken')}</p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/forgot-password">{t('forgotPassword')}</Link>
                </Button>
              </div>
            ) : success ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <p className="text-sm">{t('resetPasswordSuccess')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{t('newPassword')}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">{t('passwordRequirements')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">{t('confirmPassword')}</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Spinner className="me-2" />}
                  {t('resetPassword')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
