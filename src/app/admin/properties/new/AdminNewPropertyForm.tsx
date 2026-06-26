'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Option = {
  id: string
  label: string
}

type AdminNewPropertyFormProps = {
  neighborhoods: Option[]
  propertyTypes: Option[]
}

type FormState = {
  title: string
  slug: string
  price: string
  previous_price: string
  rent_price: string
  listing_intent: string
  status: string
  availability: string
  neighborhood_id: string
  property_type_id: string
  barangay: string
  bedrooms: string
  bathrooms: string
  lot_area_sqm: string
  floor_area_sqm: string
  carport: string
  latitude: string
  longitude: string
  description: string
  financing_available: boolean
  assume_balance_available: boolean
  is_featured: boolean
}

const INITIAL_FORM: FormState = {
  title: '',
  slug: '',
  price: '',
  previous_price: '',
  rent_price: '',
  listing_intent: 'sale',
  status: 'active',
  availability: 'available',
  neighborhood_id: '',
  property_type_id: '',
  barangay: '',
  bedrooms: '',
  bathrooms: '',
  lot_area_sqm: '',
  floor_area_sqm: '',
  carport: '',
  latitude: '',
  longitude: '',
  description: '',
  financing_available: false,
  assume_balance_available: false,
  is_featured: false,
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function AdminNewPropertyForm({
  neighborhoods,
  propertyTypes,
}: AdminNewPropertyFormProps) {
  const router = useRouter()

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generatedSlug = useMemo(() => {
    return form.slug || slugify(form.title)
  }, [form.slug, form.title])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  async function submitProperty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          slug: generatedSlug,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create listing.')
      }

      router.push(`/admin/properties/${data.property.id}`)
      router.refresh()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to create listing.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={submitProperty}
      className="rounded-2xl border bg-white p-6 shadow-sm"
    >
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Core Listing Details
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Property title
            </label>

            <input
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="Example: House and Lot in Matina"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Slug
            </label>

            <input
              value={generatedSlug}
              onChange={(event) => updateField('slug', event.target.value)}
              placeholder="auto-generated-from-title"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            />

            <p className="mt-1 text-xs text-gray-400">
              This becomes the public URL.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Barangay
            </label>

            <input
              value={form.barangay}
              onChange={(event) => updateField('barangay', event.target.value)}
              placeholder="Matina"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Neighborhood
            </label>

            <select
              value={form.neighborhood_id}
              onChange={(event) =>
                updateField('neighborhood_id', event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              <option value="">No neighborhood selected</option>

              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood.id} value={neighborhood.id}>
                  {neighborhood.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Property type
            </label>

            <select
              value={form.property_type_id}
              onChange={(event) =>
                updateField('property_type_id', event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              <option value="">No property type selected</option>

              {propertyTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>

            <textarea
              value={form.description}
              onChange={(event) =>
                updateField('description', event.target.value)
              }
              rows={6}
              placeholder="Describe the property, nearby landmarks, financing options, and contact notes."
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Price & Status
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Listing intent
            </label>

            <select
              value={form.listing_intent}
              onChange={(event) =>
                updateField('listing_intent', event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
              <option value="sale_or_rent">Sale or Rent</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Status
            </label>

            <select
              value={form.status}
              onChange={(event) => updateField('status', event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending Review</option>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Availability
            </label>

            <select
              value={form.availability}
              onChange={(event) =>
                updateField('availability', event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
              <option value="rented">Rented</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Price
            </label>

            <input
              type="number"
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
              placeholder="3500000"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Previous price
            </label>

            <input
              type="number"
              value={form.previous_price}
              onChange={(event) =>
                updateField('previous_price', event.target.value)
              }
              placeholder="Optional"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Rent price
            </label>

            <input
              type="number"
              value={form.rent_price}
              onChange={(event) => updateField('rent_price', event.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Property Specs
        </h2>

        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Bedrooms
            </label>

            <input
              type="number"
              value={form.bedrooms}
              onChange={(event) => updateField('bedrooms', event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Bathrooms
            </label>

            <input
              type="number"
              value={form.bathrooms}
              onChange={(event) => updateField('bathrooms', event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Lot sqm
            </label>

            <input
              type="number"
              value={form.lot_area_sqm}
              onChange={(event) =>
                updateField('lot_area_sqm', event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Floor sqm
            </label>

            <input
              type="number"
              value={form.floor_area_sqm}
              onChange={(event) =>
                updateField('floor_area_sqm', event.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Carport
            </label>

            <input
              type="number"
              value={form.carport}
              onChange={(event) => updateField('carport', event.target.value)}
              placeholder="1"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Map Pin
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Latitude
            </label>

            <input
              value={form.latitude}
              onChange={(event) => updateField('latitude', event.target.value)}
              placeholder="7.0731"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Longitude
            </label>

            <input
              value={form.longitude}
              onChange={(event) => updateField('longitude', event.target.value)}
              placeholder="125.6128"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Badges & Options
        </h2>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.financing_available}
              onChange={(event) =>
                updateField('financing_available', event.target.checked)
              }
            />
            Financing available
          </label>

          <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.assume_balance_available}
              onChange={(event) =>
                updateField('assume_balance_available', event.target.checked)
              }
            />
            Assume balance available
          </label>

          <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(event) =>
                updateField('is_featured', event.target.checked)
              }
            />
            Featured listing
          </label>
        </div>
      </section>

      <div className="flex justify-end gap-3 border-t pt-6">
        <button
          type="button"
          onClick={() => router.push('/admin/properties')}
          className="rounded-lg border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {saving ? 'Creating...' : 'Create Listing'}
        </button>
      </div>
    </form>
  )
}