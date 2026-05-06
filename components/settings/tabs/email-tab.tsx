'use client'

import { useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import type { AdminSettings } from '../settings-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'

type Props = { settings: AdminSettings; userEmail: string }

export function EmailTab({ userEmail }: Props) {
  const { t } = useLocale()
  const [recipient, setRecipient] = useState(userEmail)
  const [sending, setSending] = useState(false)

  const handleTest = async () => {
    setSending(true)
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipient }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Failed to send')
        return
      }
      toast.success(t('testEmailSent'))
    } catch {
      toast.error('Failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>{t('emailService')}</CardTitle>
            <CardDescription>{t('emailServiceDesc')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:max-w-md">
          <Label htmlFor="test_email">{t('testEmailRecipient')}</Label>
          <div className="flex gap-2">
            <Input
              id="test_email"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="you@example.com"
            />
            <Button onClick={handleTest} disabled={sending || !recipient.trim()}>
              {sending ? <Spinner className="me-2" /> : <Mail className="me-2 h-4 w-4" />}
              {t('sendTestEmail')}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">RESEND_API_KEY:</span>{' '}
            <code className="text-xs">configured server-side</code>
          </p>
          <p className="text-xs text-muted-foreground">
            Update Resend credentials in your project Environment Variables.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
