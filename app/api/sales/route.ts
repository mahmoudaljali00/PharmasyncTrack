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
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    let sales
    
    if (from && to) {
      sales = await sql`
        SELECT s.*, u.name as cashier_name,
        (SELECT json_agg(si.*) FROM sale_items si WHERE si.sale_id = s.id) as items
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.created_at >= ${from} AND s.created_at <= ${to}
        ORDER BY s.created_at DESC
        LIMIT ${limit}
      `
    } else {
      sales = await sql`
        SELECT s.*, u.name as cashier_name,
        (SELECT json_agg(si.*) FROM sale_items si WHERE si.sale_id = s.id) as items
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        ORDER BY s.created_at DESC
        LIMIT ${limit}
      `
    }

    return NextResponse.json({ sales })
  } catch (error) {
    console.error('Get sales error:', error)
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { items, total_amount, discount, payment_method, notes, customer_id } = data

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Validate optional customer_id (must be a non-deleted customer if provided)
    let resolvedCustomerId: string | null = null
    if (customer_id) {
      const customerCheck = await sql`
        SELECT id FROM customers WHERE id = ${customer_id} AND deleted_at IS NULL LIMIT 1
      `
      if (customerCheck.length === 0) {
        return NextResponse.json({ error: 'Invalid customer' }, { status: 400 })
      }
      resolvedCustomerId = customer_id
    }

    // Create sale
    const saleResult = await sql`
      INSERT INTO sales (user_id, customer_id, total_amount, discount, payment_method, notes, status)
      VALUES (${session.id}, ${resolvedCustomerId}, ${total_amount}, ${discount || 0}, ${payment_method}, ${notes || null}, 'completed')
      RETURNING *
    `

    const sale = saleResult[0]

    // Create sale items and update stock
    for (const item of items) {
      // Insert sale item
      await sql`
        INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
        VALUES (${sale.id}, ${item.product_id}, ${item.product_name}, ${item.quantity}, ${item.unit_price}, ${item.subtotal})
      `

      // Update product stock
      const productResult = await sql`
        SELECT quantity FROM products WHERE id = ${item.product_id}
      `
      
      if (productResult.length > 0) {
        const currentQty = Number(productResult[0].quantity)
        const newQty = currentQty - item.quantity

        await sql`
          UPDATE products SET quantity = ${newQty}, updated_at = NOW()
          WHERE id = ${item.product_id}
        `

        // Log stock change
        await sql`
          INSERT INTO stock_logs (product_id, user_id, change_type, quantity_change, previous_quantity, new_quantity, notes)
          VALUES (${item.product_id}, ${session.id}, 'sale', ${-item.quantity}, ${currentQty}, ${newQty}, ${'Sale #' + sale.id.substring(0, 8)})
        `
      }
    }

    return NextResponse.json({ sale }, { status: 201 })
  } catch (error) {
    console.error('Create sale error:', error)
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 })
  }
}
