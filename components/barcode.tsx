'use client'

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

type BarcodeProps = {
  value: string
  format?: 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39'
  width?: number
  height?: number
  displayValue?: boolean
  fontSize?: number
  className?: string
}

export function Barcode({
  value,
  format = 'CODE128',
  width = 1.5,
  height = 40,
  displayValue = true,
  fontSize = 12,
  className,
}: BarcodeProps) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current || !value) return
    try {
      JsBarcode(ref.current, value, {
        format,
        width,
        height,
        displayValue,
        fontSize,
        margin: 2,
        background: '#ffffff',
        lineColor: '#000000',
      })
    } catch (err) {
      console.error('[v0] Barcode render failed:', err)
    }
  }, [value, format, width, height, displayValue, fontSize])

  return <svg ref={ref} className={className} aria-label={`Barcode ${value}`} />
}
