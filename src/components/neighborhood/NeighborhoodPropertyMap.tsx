'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const DAVAO_CENTER: [number, number] = [7.0731, 125.6128]

type ListingIntent = 'sale' | 'rent' | 'sale_or_rent'

type PropertyPin = {
  id: string
  title?: string | null
  slug?: string | null
  price: number | null
  rentPrice?: number | null
  listingIntent?: ListingIntent | null
  latitude: number
  longitude: number
  neighborhoodName?: string | null
}

type NeighborhoodPropertyMapProps = {
  pins: PropertyPin[]
  neighborhoodName: string
}

export default function NeighborhoodPropertyMap({
  pins,
  neighborhoodName,
}: NeighborhoodPropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  const validPins = useMemo(() => {
    return pins.filter((property) => {
      return (
        Number.isFinite(Number(property.latitude)) &&
        Number.isFinite(Number(property.longitude)) &&
        Number(property.latitude) !== 0 &&
        Number(property.longitude) !== 0
      )
    })
  }, [pins])

  const pinSignature = validPins
    .map((property) => {
      return `${property.id}:${property.latitude}:${property.longitude}:${property.price ?? ''}:${property.rentPrice ?? ''}:${property.listingIntent ?? 'sale'}`
    })
    .join('|')

  useEffect(() => {
    let disposed = false
    let map: import('leaflet').Map | null = null

    const container = containerRef.current
    if (!container) return

    setReady(false)

    void import('leaflet').then((L) => {
      if (disposed || !containerRef.current) return

      const ownedContainer = containerRef.current as HTMLDivElement & {
        _leaflet_id?: number
      }

      if (ownedContainer._leaflet_id) {
        delete ownedContainer._leaflet_id
      }

      map = L.map(ownedContainer, {
        center: DAVAO_CENTER,
        zoom: 12,
        scrollWheelZoom: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      validPins.forEach((property) => {
        const displayPrice =
          property.listingIntent === 'rent' && property.rentPrice
            ? property.rentPrice
            : property.price || 0

        const marker = L.marker(
          [Number(property.latitude), Number(property.longitude)],
          {
            icon: createPriceIcon(
              L,
              displayPrice,
              property.listingIntent || 'sale'
            ),
          }
        ).addTo(map!)

        marker.bindPopup(createPopup(property, neighborhoodName), {
          minWidth: 190,
        })
      })

      if (validPins.length === 1) {
        map.setView(
          [Number(validPins[0].latitude), Number(validPins[0].longitude)],
          15,
          { animate: false }
        )
      } else if (validPins.length > 1) {
        map.fitBounds(
          L.latLngBounds(
            validPins.map((property) => [
              Number(property.latitude),
              Number(property.longitude),
            ])
          ),
          {
            padding: [36, 36],
            maxZoom: 15,
            animate: false,
          }
        )
      }

      window.setTimeout(() => map?.invalidateSize(), 80)
      setReady(true)
    })

    return () => {
      disposed = true

      if (map) {
        map.off()
        map.remove()
        map = null
      }

      const ownedContainer = container as HTMLDivElement & {
        _leaflet_id?: number
      }

      if (ownedContainer._leaflet_id) {
        delete ownedContainer._leaflet_id
      }
    }
    // pinSignature intentionally captures complete marker state without
    // rebuilding the map only because a parent created a new array instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinSignature, neighborhoodName])

  if (validPins.length === 0) {
    return null
  }

  return (
    <section className="mt-10 overflow-hidden rounded-xl border bg-white shadow-sm">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />

      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Property map in {neighborhoodName}
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Showing available property pins currently listed in this neighborhood.
        </p>
      </div>

      <div className="relative h-80 w-full sm:h-96">
        <div ref={containerRef} className="h-full w-full" />

        {ready && validPins.length > 0 && (
          <div
            className="absolute right-3 top-3 z-[500] rounded-lg border border-navy-100 bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm"
            aria-label="Map pin color legend"
          >
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-navy-500">
              Listing type
            </p>

            <div className="space-y-1 text-xs font-semibold text-navy-800">
              <LegendItem color="#047857" label="For sale" />
              <LegendItem color="#0284c7" label="For rent" />
              <LegendItem color="#7c3aed" label="Sale or rent" />
            </div>
          </div>
        )}

        {!ready && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-navy-50 text-sm text-navy-500">
            Loading map…
          </div>
        )}
      </div>
    </section>
  )
}

function createPriceIcon(
  L: typeof import('leaflet'),
  price: number,
  intent: ListingIntent = 'sale'
) {
  const compactPrice = new Intl.NumberFormat('en-PH', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(price)

  const lengthClass =
    compactPrice.length >= 7
      ? ' property-price-marker__price--extra-long'
      : compactPrice.length >= 5
        ? ' property-price-marker__price--long'
        : ''

  return L.divIcon({
    className: 'property-price-marker-wrapper',
    html: `<div class="property-price-marker property-price-marker--${intent}"><span class="property-price-marker__price${lengthClass}">${compactPrice}</span></div>`,
    iconSize: [60, 84],
    iconAnchor: [30, 82],
    popupAnchor: [0, -74],
  })
}

function LegendItem({
  color,
  label,
}: {
  color: string
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-3 w-3 rounded-full border-2 border-white shadow-sm"
        style={{ backgroundColor: color }}
      />

      <span>{label}</span>
    </div>
  )
}

function createPopup(property: PropertyPin, neighborhoodName: string) {
  const popup = document.createElement('div')
  popup.className = 'space-y-1'

  const price = document.createElement('p')
  price.className = 'font-semibold text-navy-900'

  const displayPrice =
    property.listingIntent === 'rent' && property.rentPrice
      ? property.rentPrice
      : property.price || 0

  price.textContent = `${new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(displayPrice)}${property.listingIntent === 'rent' ? '/month' : ''}`

  popup.appendChild(price)

  if (property.title) {
    const title = document.createElement('p')
    title.className = 'text-sm text-navy-700'
    title.textContent = property.title
    popup.appendChild(title)
  }

  const area = document.createElement('p')
  area.className = 'text-xs text-navy-400'
  area.textContent = `${property.neighborhoodName || neighborhoodName}, Davao City`
  popup.appendChild(area)

  if (property.slug) {
    const link = document.createElement('a')
    link.href = `/property/${encodeURIComponent(property.slug)}`
    link.className = 'text-sm font-medium text-gold-700 underline'
    link.textContent = 'View listing'
    popup.appendChild(link)
  }

  return popup
}