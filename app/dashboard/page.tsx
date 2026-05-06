import { sql } from '@/lib/db'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export const dynamic = 'force-dynamic'

type DashboardStats = {
  todaySales: number
  totalProducts: number
  lowStockCount: number
  expiringSoonCount: number
  recentSales: Array<{
    id: string
    total_amount: number
    created_at: Date
    payment_method: string
    cashier_name: string | null
  }>
}

const EMPTY_STATS: DashboardStats = {
  todaySales: 0,
  totalProducts: 0,
  lowStockCount: 0,
  expiringSoonCount: 0,
  recentSales: [],
}

async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const now = new Date()
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // Run the four count/sum queries as a single round-trip (subqueries) and
  // recent sales in parallel. Wrapping in Promise.allSettled means a single
  // transient Neon ETIMEDOUT won't take down the whole dashboard.
  const [aggResult, recentResult] = await Promise.allSettled([
    sql`
      SELECT
        (
          SELECT COALESCE(SUM(total_amount), 0)
          FROM sales
          WHERE created_at >= ${today.toISOString()}
            AND status = 'completed'
        ) AS today_sales,
        (SELECT COUNT(*) FROM products) AS total_products,
        (
          SELECT COUNT(*) FROM products
          WHERE quantity <= minimum_stock
        ) AS low_stock,
        (
          SELECT COUNT(*) FROM products
          WHERE expiry_date IS NOT NULL
            AND expiry_date > ${now.toISOString()}
            AND expiry_date <= ${in30Days.toISOString()}
        ) AS expiring_soon
    `,
    sql`
      SELECT s.id, s.total_amount, s.created_at, s.payment_method, u.name AS cashier_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.status = 'completed'
      ORDER BY s.created_at DESC
      LIMIT 5
    `,
  ])

  const stats: DashboardStats = { ...EMPTY_STATS }

  if (aggResult.status === 'fulfilled') {
    const row = aggResult.value[0] as
      | {
          today_sales: string | number | null
          total_products: string | number | null
          low_stock: string | number | null
          expiring_soon: string | number | null
        }
      | undefined
    if (row) {
      stats.todaySales = Number(row.today_sales ?? 0)
      stats.totalProducts = Number(row.total_products ?? 0)
      stats.lowStockCount = Number(row.low_stock ?? 0)
      stats.expiringSoonCount = Number(row.expiring_soon ?? 0)
    }
  } else {
    console.log('[pharmasync-track] dashboard aggregate query failed:', aggResult.reason)
  }

  if (recentResult.status === 'fulfilled') {
    stats.recentSales = recentResult.value as DashboardStats['recentSales']
  } else {
    console.log('[pharmasync-track] dashboard recent sales query failed:', recentResult.reason)
  }

  return stats
}

export default async function DashboardPage() {
  let stats: DashboardStats
  try {
    stats = await getDashboardStats()
  } catch (err) {
    console.log('[pharmasync-track] dashboard render fallback after error:', err)
    stats = EMPTY_STATS
  }

  return <DashboardContent stats={stats} />
}
