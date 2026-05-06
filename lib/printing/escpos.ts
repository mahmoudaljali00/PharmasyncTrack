/**
 * Tiny ESC/POS command builder for thermal printers.
 * Supports the subset MedSync needs: text, alignment, sizing, cut, feed.
 *
 * Used by both the Web Bluetooth client and the QZ Tray client.
 */

const ESC = 0x1b
const GS = 0x1d

export class EscPosBuilder {
  private bytes: number[] = []

  init(): this {
    this.bytes.push(ESC, 0x40) // ESC @ — initialize
    return this
  }

  align(mode: 'left' | 'center' | 'right'): this {
    const map = { left: 0, center: 1, right: 2 } as const
    this.bytes.push(ESC, 0x61, map[mode])
    return this
  }

  bold(on: boolean): this {
    this.bytes.push(ESC, 0x45, on ? 1 : 0)
    return this
  }

  doubleSize(on: boolean): this {
    // GS ! n  -> n=0x11 sets double width + double height
    this.bytes.push(GS, 0x21, on ? 0x11 : 0x00)
    return this
  }

  text(s: string): this {
    const encoder = new TextEncoder()
    this.bytes.push(...encoder.encode(s))
    return this
  }

  newline(n = 1): this {
    for (let i = 0; i < n; i++) this.bytes.push(0x0a)
    return this
  }

  feed(n: number): this {
    this.bytes.push(ESC, 0x64, n)
    return this
  }

  cut(): this {
    // GS V 0 — full cut. Some printers respond better to partial cut (GS V 1).
    this.bytes.push(GS, 0x56, 0x00)
    return this
  }

  qrcode(data: string, size = 6): this {
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(data)
    const len = dataBytes.length + 3
    const pL = len & 0xff
    const pH = (len >> 8) & 0xff

    // Model
    this.bytes.push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00)
    // Size
    this.bytes.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size)
    // Error correction (M)
    this.bytes.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31)
    // Store data
    this.bytes.push(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30)
    this.bytes.push(...dataBytes)
    // Print
    this.bytes.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30)
    return this
  }

  build(): Uint8Array {
    return new Uint8Array(this.bytes)
  }
}

export type ReceiptLine =
  | { type: 'text'; value: string; align?: 'left' | 'center' | 'right'; bold?: boolean; large?: boolean }
  | { type: 'separator' }
  | { type: 'feed'; n: number }
  | { type: 'cut' }

export type ReceiptData = {
  pharmacyName: string
  address?: string | null
  phone?: string | null
  taxId?: string | null
  header?: string | null
  footer?: string | null
  saleId: string
  date: string
  cashier?: string
  items: Array<{ name: string; qty: number; price: number; total: number }>
  subtotal: number
  discount: number
  tax: number
  total: number
  showTax: boolean
  paperSize: '58mm' | '80mm'
  currencySymbol: string
}

const WIDTHS = { '58mm': 32, '80mm': 48 } as const

export function buildReceipt(data: ReceiptData): Uint8Array {
  const width = WIDTHS[data.paperSize]
  const b = new EscPosBuilder().init()

  b.align('center').bold(true).doubleSize(true).text(data.pharmacyName).newline().doubleSize(false)

  if (data.address) b.bold(false).text(data.address).newline()
  if (data.phone) b.text(data.phone).newline()
  if (data.taxId) b.text(`Tax ID: ${data.taxId}`).newline()
  if (data.header) b.newline().text(data.header).newline()

  b.text('-'.repeat(width)).newline()
  b.align('left').text(`#${data.saleId.slice(0, 8)}   ${data.date}`).newline()
  if (data.cashier) b.text(`Cashier: ${data.cashier}`).newline()
  b.text('-'.repeat(width)).newline()

  for (const item of data.items) {
    b.text(item.name).newline()
    const line = `  ${item.qty} x ${data.currencySymbol}${item.price.toFixed(2)}`
    const totalStr = `${data.currencySymbol}${item.total.toFixed(2)}`
    const padding = Math.max(1, width - line.length - totalStr.length)
    b.text(line + ' '.repeat(padding) + totalStr).newline()
  }

  b.text('-'.repeat(width)).newline()
  b.text(padRow('Subtotal', `${data.currencySymbol}${data.subtotal.toFixed(2)}`, width)).newline()
  if (data.discount > 0) b.text(padRow('Discount', `-${data.currencySymbol}${data.discount.toFixed(2)}`, width)).newline()
  if (data.showTax && data.tax > 0) b.text(padRow('Tax', `${data.currencySymbol}${data.tax.toFixed(2)}`, width)).newline()
  b.bold(true).text(padRow('TOTAL', `${data.currencySymbol}${data.total.toFixed(2)}`, width)).newline().bold(false)

  if (data.footer) b.newline().align('center').text(data.footer).newline()

  b.feed(3).cut()
  return b.build()
}

function padRow(left: string, right: string, width: number): string {
  const padding = Math.max(1, width - left.length - right.length)
  return left + ' '.repeat(padding) + right
}
