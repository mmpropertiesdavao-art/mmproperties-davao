'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type PropertyFormData = {
  id: string
  slug: string
  title: string
  price: number | null
  barangay: string | null
  listing_intent: string | null
  status: string | null
  availability: string | null
  bedrooms: number | null
  bathrooms: number | null
  lot_area_sqm: number | null
  floor_area_sqm: number | null
  description: string | null
}

export default function EditPropertyForm({
  property,
}: {
  property: PropertyFormData
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)

    const payload = {
      title: String(formData.get('title') || ''),
      price: String(formData.get('price') || ''),
      barangay: String(formData.get('barangay') || ''),
      listingIntent: String(formData.get('listingIntent') || 'sale'),
      availability: String(formData.get('availability') || 'available'),
      bedrooms: String(formData.get('bedrooms') || ''),
      bathrooms: String(formData.get('bathrooms') || ''),
      lotAreaSqm: String(formData.get('lotAreaSqm') || ''),
      floorAreaSqm: String(formData.get('floorAreaSqm') || ''),
      description: String(formData.get('description') || ''),
    }

    const response = await fetch(`/api/seller/properties/${property.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setLoading(false)
      setErrorMessage(data?.error || 'Could not update property.')
      return
    }

    setLoading(false)
    setMessage('Property updated.')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-6 shadow-sm">
      {message && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mb-5 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
        Current status: <strong>{property.status || 'draft'}</strong>
      </div>

      <div className="grid gap-5">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-gray-700">Property title</span>
          <input
            name="title"
            required
            defaultValue={property.title}
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
              defaultValue={property.price || ''}
              className="rounded-lg border px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-gray-700">Barangay</span>
            <input
              name="barangay"
              defaultValue={property.barangay || ''}
              className="rounded-lg border px-3 py-2"
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-gray-700">Listing intent</span>
            <select
              name="listingIntent"
              defaultValue={property.listing_intent || 'sale'}
              className="rounded-lg border px-3 py-2"
            >
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-gray-700">Availability</span>
            <select
              name="availability"
              defaultValue={property.availability || 'available'}
              className="rounded-lg border px-3 py-2"
            >
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
              <option value="rented">Rented</option>
            </select>
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-gray-700">Bedrooms</span>
            <input
              name="bedrooms"
              type="number"
              min="0"
              defaultValue={property.bedrooms || ''}
              className="rounded-lg border px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-gray-700">Bathrooms</span>
            <input
              name="bathrooms"
              type="number"
              min="0"
              step="0.5"
              defaultValue={property.bathrooms || ''}
              className="rounded-lg border px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-gray-700">Lot sqm</span>
            <input
              name="lotAreaSqm"
              type="number"
              min="0"
              defaultValue={property.lot_area_sqm || ''}
              className="rounded-lg border px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-gray-700">Floor sqm</span>
            <input
              name="floorAreaSqm"
              type="number"
              min="0"
              defaultValue={property.floor_area_sqm || ''}
              className="rounded-lg border px-3 py-2"
            />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-gray-700">Description</span>
          <textarea
            name="description"
            rows={5}
            defaultValue={property.description || ''}
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
          {loading ? 'Saving...' : 'Save changes'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/seller/properties')}
          className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}