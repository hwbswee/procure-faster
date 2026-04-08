'use client'

import { useRef, useState } from 'react'

interface CartItem {
  id: string
  itemName: string
  description: string
  uom: string
  category: string
  qty: number
  note?: string
  suppliers: Record<string, { price: number; halal?: boolean }>
}

interface UploadTemplateProps {
  onItemsLoaded: (items: CartItem[]) => void
  cartItemCount?: number
}

export function UploadTemplate({ onItemsLoaded, cartItemCount = 0 }: UploadTemplateProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset states
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      // Validate file type
      if (!file.name.endsWith('.json')) {
        throw new Error('Only .json files are supported')
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        throw new Error('File size exceeds 5MB limit')
      }

      // Read and parse file
      const text = await file.text()
      const data = JSON.parse(text)

      // Send to validation endpoint
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const message =
          errorData.error +
          (errorData.details ? `\n${errorData.details.slice(0, 3).join('\n')}` : '')
        throw new Error(message)
      }

      const result = await response.json()

      if (!result.success || !result.items) {
        throw new Error('Invalid response from server')
      }

      // Check if user wants to merge or replace
      const shouldMerge =
        cartItemCount > 0 &&
        confirm(
          `You have ${cartItemCount} items in cart.\n\nMerge with imported items?\n\nOK = Merge | Cancel = Replace`
        )

      onItemsLoaded(result.items)
      setSuccess(true)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load template'
      setError(message)
      console.error('Upload error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        disabled={isLoading}
        className="hidden"
        aria-label="Upload template JSON file"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
      >
        {isLoading ? 'Loading...' : '📥 Upload Template'}
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <div className="font-semibold text-red-900">Error loading template</div>
          <div className="mt-1 text-red-600 whitespace-pre-wrap">{error}</div>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✓ Template loaded successfully!
        </div>
      )}
    </div>
  )
}
