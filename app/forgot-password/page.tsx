'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/contexts/locale-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, Pill, Mail } from 'lucide-react'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const { t, locale, setLocale } = useLocale()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [devLink, setDevLink] = useState<string | null>(null)
  const [sentEmail, setSentEmail] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setSubmitting(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        const msg = data.error || t('error')
        setErrorMsg(msg)
        toast.error(msg)
        return
      }

      if (data.devResetUrl) setDevLink(data.devResetUrl)
      setSentEmail(data.email || email.trim())
      setSubmitted(true)
      toast.success(t('resetLinkSent'))
    } catch {
      const msg = t('error')
      setErrorMsg(msg)
      toast.error(msg)
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
              <CardTitle className="text-2xl">{t('forgotPasswordTitle')}</CardTitle>
              <CardDescription className="mt-1">{t('forgotPasswordDesc')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {t('resetLinkSent')}
                  </p>
                  {sentEmail && (
                    <p className="text-sm font-medium break-all">{sentEmail}</p>
                  )}
                </div>
                {devLink && (
                  <div className="rounded-lg bg-muted p-3 text-start">
                    <p className="text-xs font-medium mb-2">Dev mode reset link:</p>
                    <Link href={devLink} className="text-xs text-primary break-all hover:underline">
                      {devLink}
                    </Link>
                  </div>
                )}
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">
                    <ArrowLeft className="h-4 w-4 me-2" />
                    {t('backToLogin')}
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setErrorMsg(null)
                    }}
                    required
                    autoFocus
                    placeholder="email@example.com"
                    aria-invalid={!!errorMsg}
                  />
                  {errorMsg && (
                    <p className="text-sm text-destructive" role="alert">
                      {errorMsg}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Spinner className="me-2" />}
                  {t('sendResetLink')}
                </Button>
                <Button type="button" variant="ghost" className="w-full" asChild>
                  <Link href="/login">
                    <ArrowLeft className="h-4 w-4 me-2" />
                    {t('backToLogin')}
                  </Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
