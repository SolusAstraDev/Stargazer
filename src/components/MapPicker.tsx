import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { LocationFix } from '../lib/astronomy'

const starIcon = L.divIcon({
  className: 'star-pin',
  html: '<span class="star-pin-core"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function MapEvents({
  location,
  onPick,
}: {
  location: LocationFix | null
  onPick: (fix: LocationFix) => void
}) {
  const map = useMap()

  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lon: event.latlng.lng })
    },
  })

  useEffect(() => {
    if (!location) return
    const zoom = Math.max(map.getZoom(), 7)
    map.flyTo([location.lat, location.lon], zoom, { duration: 0.8 })
  }, [location, map])

  return null
}

type MapPickerProps = {
  location: LocationFix | null
  onPick: (fix: LocationFix) => void
}

export function MapPicker({ location, onPick }: MapPickerProps) {
  return (
    <MapContainer
      className="map-canvas"
      center={[20, 10]}
      zoom={2}
      minZoom={2}
      worldCopyJump
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEvents location={location} onPick={onPick} />
      {location ? <Marker position={[location.lat, location.lon]} icon={starIcon} /> : null}
    </MapContainer>
  )
}
