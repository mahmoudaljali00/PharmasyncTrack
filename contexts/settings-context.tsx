'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type ClientSettings = {
  pharmacy_name: string
  pharmacy_address: string | null
  pharmacy_phone: string | null
  pharmacy_email: string | null
  pharmacy_logo_url: string | null
  tax_id: string | null
  currency: string
  currency_symbol: string
  receipt_header: string | null
  receipt_footer: string | null
  receipt_paper_size: '58mm' | '80mm' | 'A4'
  receipt_show_logo: boolean
  receipt_show_tax: boolean
  tax_rate: number
  default_discount: number
  date_format: string
  decimal_places: number
}

type Ctx = {
  settings: ClientSettings | null
  loading: boolean
  refresh: () => Promise<void>
}

const SettingsContext = createContext<Ctx | null>(null)

const FALLBACK: ClientSettings = {
  pharmacy_name: 'pharmasync-track',
  pharmacy_address: null,
  pharmacy_phone: null,
  pharmacy_email: null,
  pharmacy_logo_url: null,
  tax_id: null,
  currency: 'USD',
  currency_symbol: '$',
  receipt_header: null,
  receipt_footer: null,
  receipt_paper_size: '80mm',
  receipt_show_logo: true,
  receipt_show_tax: true,
  tax_rate: 0,
  default_discount: 0,
  date_format: 'DD/MM/YYYY',
  decimal_places: 2,
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ClientSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/public', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      } else {
        setSettings(FALLBACK)
      }
    } catch {
      setSettings(FALLBACK)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): ClientSettings {
  const ctx = useContext(SettingsContext)
  return ctx?.settings ?? FALLBACK
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettingsContext must be used inside <SettingsProvider>')
  return ctx
}
