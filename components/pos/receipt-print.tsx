'use client'

import { useLocale } from '@/contexts/locale-context'
import { useSettings } from '@/contexts/settings-context'
import { formatMoney, formatDateTime } from '@/lib/format'

type CartItem = {
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  subtotal: number
}

type ReceiptPrintProps = {
  saleId: string
  items: CartItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
}

export function ReceiptPrint({
  saleId,
  items,
  subtotal,
  discount,
  total,
  paymentMethod,
}: ReceiptPrintProps) {
  const { t, locale } = useLocale()
  const settings = useSettings()

  const moneyOpts = {
    currencySymbol: settings.currency_symbol,
    decimalPlaces: settings.decimal_places,
    locale,
  }

  const taxAmount =
    settings.receipt_show_tax && settings.tax_rate > 0
      ? subtotal * (settings.tax_rate / 100)
      : 0

  return (
    <div className="print-receipt bg-white text-black p-4 rounded-lg border" data-paper={settings.receipt_paper_size.toLowerCase()}>
      {/* Header */}
      <div className="text-center mb-4">
        {settings.receipt_show_logo && settings.pharmacy_logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.pharmacy_logo_url}
            alt=""
            className="mx-auto mb-2 h-12 object-contain"
          />
        )}
        <h1 className="text-xl font-bold">{settings.pharmacy_name}</h1>
        {settings.pharmacy_address && (
          <p className="text-xs text-gray-600">{settings.pharmacy_address}</p>
        )}
        {settings.pharmacy_phone && (
          <p className="text-xs text-gray-600">{settings.pharmacy_phone}</p>
        )}
        {settings.tax_id && (
          <p className="text-xs text-gray-500">Tax ID: {settings.tax_id}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {formatDateTime(new Date(), settings.date_format, locale)}
        </p>
      </div>

      {settings.receipt_header && (
        <p className="text-center text-xs italic text-gray-700 mb-2">
          {settings.receipt_header}
        </p>
      )}

      {/* Receipt Number */}
      <div className="text-center mb-4 pb-2 border-b border-dashed border-gray-300">
        <p className="text-xs text-gray-500">
          Receipt #{saleId.substring(0, 8).toUpperCase()}
        </p>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-4">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <div className="flex-1 min-w-0">
              <p className="truncate">{item.product_name}</p>
              <p className="text-xs text-gray-500">
                {item.quantity} × {formatMoney(item.unit_price, moneyOpts)}
              </p>
            </div>
            <span className="font-medium ms-2">{formatMoney(item.subtotal, moneyOpts)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
        <div className="flex justify-between text-sm">
          <span>{t('subtotal')}</span>
          <span>{formatMoney(subtotal, moneyOpts)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>{t('discount')}</span>
            <span>-{formatMoney(discount, moneyOpts)}</span>
          </div>
        )}
        {settings.receipt_show_tax && taxAmount > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              Tax ({settings.tax_rate}%)
            </span>
            <span>{formatMoney(taxAmount, moneyOpts)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2 mt-2">
          <span>{t('total')}</span>
          <span>{formatMoney(total + taxAmount, moneyOpts)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>{t('paymentMethod')}</span>
          <span>{paymentMethod === 'cash' ? t('cash') : t('card')}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 pt-4 border-t border-dashed border-gray-300">
        {settings.receipt_footer ? (
          <p className="text-xs text-gray-600 whitespace-pre-line">{settings.receipt_footer}</p>
        ) : (
          <>
            <p className="text-xs text-gray-500">Thank you for your purchase!</p>
            <p className="text-xs text-gray-400 mt-1">شكراً لتسوقكم معنا</p>
          </>
        )}
      </div>
    </div>
  )
}
