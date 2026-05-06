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
    const products = await sql`SELECT * FROM products WHERE id = ${id}`
    
    if (products.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product: products[0] })
  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
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
    const data = await request.json()
    
    const {
      name,
      name_ar,
      barcode,
      serial_number,
      expiry_date,
      purchase_price,
      selling_price,
      quantity,
      minimum_stock,
      category,
      description,
    } = data

    // Get current product for stock logging
    const currentProduct = await sql`SELECT * FROM products WHERE id = ${id}`
    if (currentProduct.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const result = await sql`
      UPDATE products SET
        name = ${name},
        name_ar = ${name_ar || null},
        barcode = ${barcode || null},
        serial_number = ${serial_number || null},
        expiry_date = ${expiry_date || null},
        purchase_price = ${purchase_price},
        selling_price = ${selling_price},
        quantity = ${quantity},
        minimum_stock = ${minimum_stock || 10},
        category = ${category || null},
        description = ${description || null},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    // Log stock change if quantity changed
    const oldQuantity = Number(currentProduct[0].quantity)
    const newQuantity = Number(quantity)
    if (oldQuantity !== newQuantity) {
      await sql`
        INSERT INTO stock_logs (product_id, user_id, change_type, quantity_change, previous_quantity, new_quantity, notes)
        VALUES (${id}, ${session.id}, 'adjustment', ${newQuantity - oldQuantity}, ${oldQuantity}, ${newQuantity}, 'Manual adjustment')
      `
    }

    return NextResponse.json({ product: result[0] })
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete products' }, { status: 403 })
    }

    const { id } = await params
    await sql`DELETE FROM products WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
