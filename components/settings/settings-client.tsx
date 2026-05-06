'use client'

import { useState, useCallback, useEffect } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { useSettingsContext } from '@/contexts/settings-context'
import type { SessionUser } from '@/lib/auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Building2,
  Receipt as ReceiptIcon,
  Briefcase,
  Settings as SettingsIcon,
  Printer,
  Database,
  Mail,
} from 'lucide-react'
import { PharmacyTab } from './tabs/pharmacy-tab'
import { ReceiptTab } from './tabs/receipt-tab'
import { BusinessTab } from './tabs/business-tab'
import { SystemTab } from './tabs/system-tab'
import { PrintingTab } from './tabs/printing-tab'
import { BackupTab } from './tabs/backup-tab'
import { EmailTab } from './tabs/email-tab'

// Mirror of the server-side PharmacySettings type without server-only imports.
export type AdminSettings = {
  id: number
  pharmacy_name: string
  pharmacy_address: string | null
  pharmacy_phone: string | null
  pharmacy_email: string | null
  pharmacy_logo_url: string | null
  cloudinary_logo_public_id: string | null
  tax_id: string | null
  currency: string
  currency_symbol: string
  timezone: string
  receipt_header: string | null
  receipt_footer: string | null
  receipt_paper_size: '58mm' | '80mm' | 'A4'
  receipt_show_logo: boolean
  receipt_show_tax: boolean
  low_stock_threshold: number
  tax_rate: number
  default_discount: number
  working_hours_start: string
  working_hours_end: string
  default_language: 'en' | 'ar'
  default_theme: 'light' | 'dark' | 'system'
  date_format: string
  decimal_places: number
  auto_backup_enabled: boolean
  auto_backup_frequency: 'daily' | 'weekly' | 'monthly'
  last_backup_at: string | null
  updated_at: string
}

type Props = {
  initialSettings: AdminSettings
  user: SessionUser
}

export function SettingsClient({ initialSettings, user }: Props) {
  const { t } = useLocale()
  const { refresh } = useSettingsContext()
  const [settings, setSettings] = useState<AdminSettings>(initialSettings)
  const [saving, setSaving] = useState(false)

  const patch = useCallback(
    async (changes: Partial<AdminSettings>) => {
      setSaving(true)
      try {
        const res = await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(body.error || t('settingsSaveFailed'))
          return false
        }
        setSettings(body)
        await refresh()
        toast.success(t('settingsSaved'))
        return true
      } catch {
        toast.error(t('settingsSaveFailed'))
        return false
      } finally {
        setSaving(false)
      }
    },
    [refresh, t]
  )

  useEffect(() => {
    setSettings(initialSettings)
  }, [initialSettings])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('settings')}</h1>
        <p className="text-muted-foreground">
          {t('pharmacyInfoDesc')} · {user.email}
        </p>
      </header>

      <Tabs defaultValue="pharmacy" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto">
          <TabsTrigger value="pharmacy" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settingsPharmacy')}</span>
          </TabsTrigger>
          <TabsTrigger value="receipt" className="gap-2">
            <ReceiptIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settingsReceipt')}</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settingsBusiness')}</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settingsSystem')}</span>
          </TabsTrigger>
          <TabsTrigger value="printing" className="gap-2">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settingsPrinting')}</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settingsBackup')}</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settingsEmail')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pharmacy">
          <PharmacyTab settings={settings} onPatch={patch} saving={saving} />
        </TabsContent>
        <TabsContent value="receipt">
          <ReceiptTab settings={settings} onPatch={patch} saving={saving} />
        </TabsContent>
        <TabsContent value="business">
          <BusinessTab settings={settings} onPatch={patch} saving={saving} />
        </TabsContent>
        <TabsContent value="system">
          <SystemTab settings={settings} onPatch={patch} saving={saving} />
        </TabsContent>
        <TabsContent value="printing">
          <PrintingTab settings={settings} onPatch={patch} saving={saving} />
        </TabsContent>
        <TabsContent value="backup">
          <BackupTab settings={settings} onPatch={patch} saving={saving} />
        </TabsContent>
        <TabsContent value="email">
          <EmailTab settings={settings} userEmail={user.email} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export type TabProps = {
  settings: AdminSettings
  onPatch: (changes: Partial<AdminSettings>) => Promise<boolean>
  saving: boolean
}
