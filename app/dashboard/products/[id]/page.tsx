'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ProductForm } from '@/components/products/product-form'
import { Spinner } from '@/components/ui/spinner'
import type { Product } from '@/lib/db'

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${id}`)
        if (res.ok) {
          const data = await res.json()
          setProduct(data.product)
        } else {
          router.push('/dashboard/products')
        }
      } catch {
        router.push('/dashboard/products')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [id, router])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!product) {
    return null
  }

  return <ProductForm product={product} />
}
