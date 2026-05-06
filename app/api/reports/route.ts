import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'Date range required' }, { status: 400 })
    }

    // Sales by day
    const salesByDay = await sql`
      SELECT 
        DATE(created_at) as date,
        SUM(total_amount) as total,
        COUNT(*) as count
      FROM sales
      WHERE created_at >= ${from} AND created_at <= ${to}
      AND status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Top products by revenue
    const topProducts = await sql`
      SELECT 
        si.product_name as name,
        SUM(si.quantity) as quantity,
        SUM(si.subtotal) as revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= ${from} AND s.created_at <= ${to}
      AND s.status = 'completed'
      GROUP BY si.product_name
      ORDER BY revenue DESC
      LIMIT 10
    `

    // Payment method breakdown
    const paymentMethodBreakdown = await sql`
      SELECT 
        payment_method as method,
        SUM(total_amount) as total,
        COUNT(*) as count
      FROM sales
      WHERE created_at >= ${from} AND created_at <= ${to}
      AND status = 'completed'
      GROUP BY payment_method
    `

    // Summary stats
    const summaryResult = await sql`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as average_sale
      FROM sales
      WHERE created_at >= ${from} AND created_at <= ${to}
      AND status = 'completed'
    `

    // Calculate profit (revenue - cost)
    const profitResult = await sql`
      SELECT 
        COALESCE(SUM(si.subtotal - (p.purchase_price * si.quantity)), 0) as profit
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= ${from} AND s.created_at <= ${to}
      AND s.status = 'completed'
    `

    const summary = {
      totalSales: Number(summaryResult[0]?.total_sales || 0),
      totalRevenue: Number(summaryResult[0]?.total_revenue || 0),
      averageSale: Number(summaryResult[0]?.average_sale || 0),
      totalProfit: Number(profitResult[0]?.profit || 0),
    }

    return NextResponse.json({
      salesByDay: salesByDay.map(row => ({
        date: row.date,
        total: Number(row.total),
        count: Number(row.count),
      })),
      topProducts: topProducts.map(row => ({
        name: row.name,
        quantity: Number(row.quantity),
        revenue: Number(row.revenue),
      })),
      paymentMethodBreakdown: paymentMethodBreakdown.map(row => ({
        method: row.method === 'cash' ? 'Cash' : 'Card',
        total: Number(row.total),
        count: Number(row.count),
      })),
      summary,
    })
  } catch (error) {
    console.error('Get reports error:', error)
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 })
  }
}
