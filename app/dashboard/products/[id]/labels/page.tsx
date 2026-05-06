import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { LabelPrintClient } from '@/components/products/label-print-client'


export const dynamic = 'force-dynamic'

type Product = {
  id: string
  name: string
  barcode: string | null
  selling_price: string
  unit: string | null
}

export default async function ProductLabelsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params

  const rows = (await sql`
    SELECT id, name, barcode, selling_price, unit
    FROM products
    WHERE id = ${id}
    LIMIT 1
  `) as Product[]

  const product = rows[0]
  if (!product) notFound()

  const settings = await getSettings()

  return <LabelPrintClient product={product} settings={settings} />
}
