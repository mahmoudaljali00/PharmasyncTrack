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
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const lowStock = searchParams.get('lowStock') === 'true'

    let products
    
    if (search && category && lowStock) {
      products = await sql`
        SELECT * FROM products 
        WHERE (name ILIKE ${'%' + search + '%'} OR barcode ILIKE ${'%' + search + '%'})
        AND category = ${category}
        AND quantity <= minimum_stock
        ORDER BY name ASC
      `
    } else if (search && category) {
      products = await sql`
        SELECT * FROM products 
        WHERE (name ILIKE ${'%' + search + '%'} OR barcode ILIKE ${'%' + search + '%'})
        AND category = ${category}
        ORDER BY name ASC
      `
    } else if (search && lowStock) {
      products = await sql`
        SELECT * FROM products 
        WHERE (name ILIKE ${'%' + search + '%'} OR barcode ILIKE ${'%' + search + '%'})
        AND quantity <= minimum_stock
        ORDER BY name ASC
      `
    } else if (category && lowStock) {
      products = await sql`
        SELECT * FROM products 
        WHERE category = ${category}
        AND quantity <= minimum_stock
        ORDER BY name ASC
      `
    } else if (search) {
      products = await sql`
        SELECT * FROM products 
        WHERE name ILIKE ${'%' + search + '%'} OR barcode ILIKE ${'%' + search + '%'}
        ORDER BY name ASC
      `
    } else if (category) {
      products = await sql`
        SELECT * FROM products 
        WHERE category = ${category}
        ORDER BY name ASC
      `
    } else if (lowStock) {
      products = await sql`
        SELECT * FROM products 
        WHERE quantity <= minimum_stock
        ORDER BY name ASC
      `
    } else {
      products = await sql`SELECT * FROM products ORDER BY name ASC`
    }

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role === 'cashier') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

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

    if (!name || purchase_price === undefined || selling_price === undefined) {
      return NextResponse.json(
        { error: 'Name, purchase price, and selling price are required' },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO products (
        name, name_ar, barcode, serial_number, expiry_date,
        purchase_price, selling_price, quantity, minimum_stock,
        category, description
      ) VALUES (
        ${name}, ${name_ar || null}, ${barcode || null}, ${serial_number || null},
        ${expiry_date || null}, ${purchase_price}, ${selling_price},
        ${quantity || 0}, ${minimum_stock || 10}, ${category || null}, ${description || null}
      )
      RETURNING *
    `

    // Log initial stock
    if (quantity && quantity > 0) {
      await sql`
        INSERT INTO stock_logs (product_id, user_id, change_type, quantity_change, previous_quantity, new_quantity, notes)
        VALUES (${result[0].id}, ${session.id}, 'initial', ${quantity}, 0, ${quantity}, 'Initial stock entry')
      `
    }

    return NextResponse.json({ product: result[0] }, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
