'use server'

import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

export const sql = neon(process.env.DATABASE_URL)

export type User = {
  id: string
  email: string
  password_hash: string
  name: string
  role: 'admin' | 'pharmacist' | 'cashier'
  is_active: boolean
  last_login_at: Date | null
  created_at: Date
  updated_at: Date
}

export type PasswordReset = {
  id: string
  user_id: string
  token_hash: string
  expires_at: Date
  used: boolean
  created_at: Date
}

export type UserActivityLog = {
  id: string
  user_id: string
  action: string
  details: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: Date
}

export type Product = {
  id: string
  name: string
  name_ar: string | null
  barcode: string | null
  serial_number: string | null
  expiry_date: Date | null
  purchase_price: number
  selling_price: number
  quantity: number
  minimum_stock: number
  category: string | null
  description: string | null
  created_at: Date
  updated_at: Date
}

export type Sale = {
  id: string
  user_id: string
  total_amount: number
  discount: number
  payment_method: string
  status: 'completed' | 'cancelled' | 'pending'
  notes: string | null
  created_at: Date
}

export type SaleItem = {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export type StockLog = {
  id: string
  product_id: string
  user_id: string
  change_type: 'sale' | 'purchase' | 'adjustment' | 'return' | 'initial'
  quantity_change: number
  previous_quantity: number
  new_quantity: number
  notes: string | null
  created_at: Date
}

export type Supplier = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  company_name: string | null
  notes: string | null
  is_active: boolean
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

export type Customer = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  date_of_birth: Date | null
  notes: string | null
  is_active: boolean
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

