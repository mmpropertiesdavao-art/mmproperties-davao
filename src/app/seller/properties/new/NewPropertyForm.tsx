'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewPropertyForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)

    const payload = {
      title: String(formData.get('title') || ''),
      price: String(formData.get('price') || ''),
      barangay: String(formData.get('barangay') || ''),
      listingIntent: String(formData.get('listingIntent') || 'sale'),
      propertyType: String(formData.get('propertyType') || 'house-and-lot'),
      bedrooms: String(formData.get('bedrooms') || ''),
      bathrooms: String(formData.get('bathrooms') || ''),
      lotAreaSqm: String(formData.get('lotAreaSqm') || ''),
      floorAreaSqm: String(formData.get('floorAreaSqm') || ''),
      description: String(formData.get('description') || ''),
    }

    const response = await fetch('/api/seller/properties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setLoading(false)
      setErrorMessage(data?.error || 'Could not create property.')
      return
    }

    router.push(`/seller/properties/${data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-6 shadow-sm">
      {errorMessage && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-5">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-gray-700">Property title</span>
          <input
            name="title"
            required
            placeholder="Example: House and Lot in Matina"
            className="rounded-lg border px-3 py-2"
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-gray-700">Price</span>
            <input
              name="price"
              type="number"
              min="0"
              placeholder="3500000"
              className="rounded-lg border px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-gray-700">Barangay</span>
            <input
              name="barangay"
              placeholder="Matina"
              className="rounded-lg border px-3 py-2"
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-gray-700">Listing intent</span>
            <select name="listingIntent" className="rounded-lg border px-3 py-2">
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-gray-700">Property type</span>
            <select name="propertyType" className="rounded-lg border px-3 py-2">
              <option value="house-and-lot">House and Lot</option>
              <option value="condominium">Condominium</option>
              <option value="lot-only">Lot Only</option>
              <option value="townhouse">Townhouse</option>
              <option value="apartment">Apartment</option>
            </select>
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-gray-700">Bedrooms</span>
            <input name="bedrooms" type="number" min="0" className="rounded-lg border px-3 py-2" />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-gray-700">Bathrooms</span>
            <input name="bathrooms" type="number" min="0" step="0.5" className="rounded-lg border px-3 py-2" />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-gray-700">Lot sqm</span>
            <input name="lotAreaSqm" type="number" min="0" className="rounded-lg border px-3 py-2" />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-gray-700">Floor sqm</span>
            <input name="floorAreaSqm" type="number" min="0" className="rounded-lg border px-3 py-2" />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-gray-700">Description</span>
          <textarea
            name="description"
            rows={5}
            placeholder="Describe the property, nearby landmarks, financing options, and contact notes."
            className="rounded-lg border px-3 py-2"
          />
        </label>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {loading ? 'Submitting...' : 'Submit property'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/seller')}
          className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}