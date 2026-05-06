'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useLocale } from '@/contexts/locale-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Pill, Globe } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  
  const { login, user, isLoading } = useAuth()
  const { t, locale, setLocale } = useLocale()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const result = await login(email, password)
    
    if (!result.success) {
      setError(t('invalidCredentials'))
    }
    
    setIsSubmitting(false)
  }

  const handleSeedAdmin = async () => {
    setIsSeeding(true)
    try {
      const res = await fetch('/api/auth/seed', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setEmail('mr.mahmoudalbdry11@outlook.com')
        setPassword('admin123')
      } else {
        setError(data.error || 'Failed to create admin user')
      }
    } catch {
      setError('Failed to create admin user')
    }
    setIsSeeding(false)
  }

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'ar' : 'en')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background p-4">
      <div className="absolute top-4 end-4">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLocale}
          className="gap-2"
        >
          <Globe className="h-4 w-4" />
          {locale === 'en' ? 'العربية' : 'English'}
        </Button>
      </div>

      <Card className="w-full max-w-md shadow-xl border-primary/10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Pill className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">pharmasync-track</CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              {t('signInToAccount')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  autoComplete="email"
                  className="h-11"
                />
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">{t('password')}</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    {t('forgotPassword')}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="h-11"
                />
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner className="h-4 w-4" /> : t('signIn')}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center mb-3">
              First time? Create an admin account:
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleSeedAdmin}
              disabled={isSeeding}
            >
              {isSeeding ? <Spinner className="h-4 w-4" /> : 'Create Admin Account'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
