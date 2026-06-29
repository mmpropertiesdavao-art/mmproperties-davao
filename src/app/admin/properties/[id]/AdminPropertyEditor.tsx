'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ListingStatusActions } from '@/components/admin/ListingStatusActions'

type AdminPropertyEditorProps = {
  property: Record<string, any>
  columnNames: string[]
}

type FieldConfig = {
  column: string
  label: string
  type: 'text' | 'number' | 'textarea' | 'select' | 'checkbox'
  options?: { label: string; value: string }[]
  section: 'Core Details' | 'Pricing' | 'Property Specs' | 'Status'
}

const FIELD_CONFIGS: FieldConfig[] = [
  {
    column: 'title',
    label: 'Title',
    type: 'text',
    section: 'Core Details',
  },
  {
    column: 'slug',
    label: 'Slug',
    type: 'text',
    section: 'Core Details',
  },
  {
    column: 'description',
    label: 'Description',
    type: 'textarea',
    section: 'Core Details',
  },
  {
    column: 'barangay',
    label: 'Barangay',
    type: 'text',
    section: 'Core Details',
  },
  {
    column: 'price',
    label: 'Price',
    type: 'number',
    section: 'Pricing',
  },
  {
    column: 'previous_price',
    label: 'Previous Price',
    type: 'number',
    section: 'Pricing',
  },
  {
    column: 'rent_price',
    label: 'Rent Price',
    type: 'number',
    section: 'Pricing',
  },
  {
    column: 'listing_intent',
    label: 'Listing Intent',
    type: 'select',
    section: 'Pricing',
    options: [
      { label: 'For Sale', value: 'sale' },
      { label: 'For Rent', value: 'rent' },
      { label: 'Sale or Rent', value: 'sale_or_rent' },
    ],
  },
  {
    column: 'status',
    label: 'Status',
    type: 'select',
    section: 'Status',
    options: [
      { label: 'Pending Review', value: 'pending' },
      { label: 'Active', value: 'active' },
      { label: 'Sold', value: 'sold' },
      { label: 'Inactive / Archived', value: 'inactive' },
    ],
  },
  {
    column: 'availability',
    label: 'Availability',
    type: 'select',
    section: 'Status',
    options: [
      { label: 'Available', value: 'available' },
      { label: 'Reserved', value: 'reserved' },
      { label: 'Sold', value: 'sold' },
      { label: 'Rented', value: 'rented' },
      { label: 'Inactive / Archived', value: 'inactive' },
    ],
  },
  {
    column: 'bedrooms',
    label: 'Bedrooms',
    type: 'number',
    section: 'Property Specs',
  },
  {
    column: 'bathrooms',
    label: 'Bathrooms',
    type: 'number',
    section: 'Property Specs',
  },
  {
    column: 'lot_area_sqm',
    label: 'Lot Area sqm',
    type: 'number',
    section: 'Property Specs',
  },
  {
    column: 'floor_area_sqm',
    label: 'Floor Area sqm',
    type: 'number',
    section: 'Property Specs',
  },
  {
    column: 'carport',
    label: 'Carport',
    type: 'number',
    section: 'Property Specs',
  },
  {
    column: 'carport_spaces',
    label: 'Carport Spaces',
    type: 'number',
    section: 'Property Specs',
  },
  {
    column: 'parking_spaces',
    label: 'Parking Spaces',
    type: 'number',
    section: 'Property Specs',
  },
  {
    column: 'garage_spaces',
    label: 'Garage Spaces',
    type: 'number',
    section: 'Property Specs',
  },
  {
    column: 'financing_available',
    label: 'Financing Available',
    type: 'checkbox',
    section: 'Pricing',
  },
  {
    column: 'assume_balance_available',
    label: 'Assume Balance Available',
    type: 'checkbox',
    section: 'Pricing',
  },
  {
    column: 'is_featured',
    label: 'Featured Listing',
    type: 'checkbox',
    section: 'Status',
  },
  {
    column: 'featured',
    label: 'Featured Listing',
    type: 'checkbox',
    section: 'Status',
  },
]

const SECTIONS: FieldConfig['section'][] = [
  'Status',
  'Pricing',
  'Core Details',
  'Property Specs',
]

function getInitialForm(property: Record<string, any>, availableFields: FieldConfig[]) {
  const initialForm: Record<string, any> = {}

  availableFields.forEach((field) => {
    const value = property[field.column]

    if (field.type === 'checkbox') {
      initialForm[field.column] = Boolean(value)
    } else if (value === null || value === undefined) {
      initialForm[field.column] = ''
    } else {
      initialForm[field.column] = String(value)
    }
  })

  return initialForm
}

export default function AdminPropertyEditor({
  property,
  columnNames,
}: AdminPropertyEditorProps) {
  const router = useRouter()

  const availableFields = useMemo(() => {
    return FIELD_CONFIGS.filter((field) => columnNames.includes(field.column))
  }, [columnNames])

  const [form, setForm] = useState<Record<string, any>>(() =>
    getInitialForm(property, availableFields)
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function updateField(column: string, value: any) {
    setForm((current) => ({
      ...current,
      [column]: value,
    }))
  }

  async function saveChanges() {
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch(`/api/admin/properties/${property.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updates: form,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save listing.')
      }

      setMessage('Listing updated successfully.')
      router.refresh()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to save listing.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (availableFields.length === 0) {
    return (
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">
          Editable fields unavailable
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          The properties table does not expose any of the expected editable fields.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Listing Editor
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Update the listing information below.
          </p>
        </div>

        <ListingStatusActions
          propertyId={property.id}
          status={form.status || property.status}
          availability={form.availability || property.availability}
          compact
          onChange={(next) => {
            setForm((current) => ({
              ...current,
              ...(columnNames.includes('status') ? { status: next.status } : {}),
              ...(columnNames.includes('availability') ? { availability: next.availability } : {}),
            }))
            router.refresh()
          }}
        />
      </div>

      {message && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {SECTIONS.map((section) => {
          const fields = availableFields.filter((field) => field.section === section)

          if (fields.length === 0) return null

          return (
            <div key={section}>
              <h3 className="mb-3 border-b pb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
                {section}
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                {fields.map((field) => (
                  <div
                    key={field.column}
                    className={field.type === 'textarea' ? 'md:col-span-2' : ''}
                  >
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {field.label}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        value={form[field.column] || ''}
                        onChange={(event) =>
                          updateField(field.column, event.target.value)
                        }
                        rows={6}
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={form[field.column] || ''}
                        onChange={(event) =>
                          updateField(field.column, event.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
                      >
                        <option value="">Not set</option>
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={Boolean(form[field.column])}
                          onChange={(event) =>
                            updateField(field.column, event.target.checked)
                          }
                        />
                        Yes
                      </label>
                    ) : (
                      <input
                        type={field.type}
                        value={form[field.column] || ''}
                        onChange={(event) =>
                          updateField(field.column, event.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-500"
                      />
                    )}

                    <p className="mt-1 text-xs text-gray-400">
                      Column: {field.column}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={saveChanges}
          disabled={saving}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </section>
  )
}
