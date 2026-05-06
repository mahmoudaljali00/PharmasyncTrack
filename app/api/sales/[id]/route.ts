import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    
    const sales = await sql`
      SELECT s.*, u.name as cashier_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ${id}
    `
    
    if (sales.length === 0) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    const items = await sql`
      SELECT * FROM sale_items WHERE sale_id = ${id}
    `

    return NextResponse.json({ 
      sale: { ...sales[0], items } 
    })
  } catch (error) {
    console.error('Get sale error:', error)
    return NextResponse.json({ error: 'Failed to fetch sale' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role === 'cashier') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const { status } = await request.json()

    // If cancelling, restore stock
    if (status === 'cancelled') {
      const items = await sql`SELECT * FROM sale_items WHERE sale_id = ${id}`
      
      for (const item of items) {
        const productResult = await sql`
          SELECT quantity FROM products WHERE id = ${item.product_id}
        `
        
        if (productResult.length > 0) {
          const currentQty = Number(productResult[0].quantity)
          const newQty = currentQty + Number(item.quantity)

          await sql`
            UPDATE products SET quantity = ${newQty}, updated_at = NOW()
            WHERE id = ${item.product_id}
          `

          await sql`
            INSERT INTO stock_logs (product_id, user_id, change_type, quantity_change, previous_quantity, new_quantity, notes)
            VALUES (${item.product_id}, ${session.id}, 'return', ${item.quantity}, ${currentQty}, ${newQty}, ${'Cancelled Sale #' + id.substring(0, 8)})
          `
        }
      }
    }

    const result = await sql`
      UPDATE sales SET status = ${status}
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json({ sale: result[0] })
  } catch (error) {
    console.error('Update sale error:', error)
    return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 })
  }
}
