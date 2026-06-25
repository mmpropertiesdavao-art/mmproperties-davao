'use client'

import { useEffect, useMemo } from 'react'
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'

type PropertyPin = {
  id: string
  title: string
  slug: string | null
  price: number | null
  latitude: number
  longitude: number
}

type NeighborhoodPropertyMapProps = {
  pins: PropertyPin[]
  neighborhoodName: string
}

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function formatPrice(price: number | null) {
  if (!price) return 'Price not set'

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(price)
}

function FitBounds({ pins }: { pins: PropertyPin[] }) {
  const map = useMap()

  useEffect(() => {
    if (pins.length === 0) return

    if (pins.length === 1) {
      map.setView([pins[0].latitude, pins[0].longitude], 15)
      return
    }

    const bounds = L.latLngBounds(
      pins.map((pin) => [pin.latitude, pin.longitude])
    )

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 15,
    })
  }, [map, pins])

  return null
}

export default function NeighborhoodPropertyMap({
  pins,
  neighborhoodName,
}: NeighborhoodPropertyMapProps) {
  const validPins = useMemo(() => {
    return pins.filter((pin) => {
      return (
        Number.isFinite(pin.latitude) &&
        Number.isFinite(pin.longitude) &&
        pin.latitude !== 0 &&
        pin.longitude !== 0
      )
    })
  }, [pins])

  if (validPins.length === 0) {
    return null
  }

  const firstPin = validPins[0]

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

      <div className="h-80 w-full sm:h-96">
        <MapContainer
          center={[firstPin.latitude, firstPin.longitude]}
          zoom={14}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds pins={validPins} />

          {validPins.map((pin) => (
            <Marker
              key={pin.id}
              position={[pin.latitude, pin.longitude]}
              icon={markerIcon}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-semibold">{pin.title}</p>

                  <p className="mt-1 text-sm">
                    {formatPrice(pin.price)}
                  </p>

                  {pin.slug && (
                    <a
                      href={`/property/${pin.slug}`}
                      className="mt-2 inline-block text-sm font-medium underline"
                    >
                      View property
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  )
}