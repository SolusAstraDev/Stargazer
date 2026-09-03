export type PlaceHit = {
  lat: number
  lon: number
  label: string
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceHit[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '5',
  })

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) return []

  const data = (await response.json()) as {
    lat: string
    lon: string
    display_name?: string
    address?: {
      city?: string
      town?: string
      village?: string
      hamlet?: string
      country?: string
    }
  }[]

  return data.map((item) => {
    const place =
      item.address?.city ?? item.address?.town ?? item.address?.village ?? item.address?.hamlet
    const label =
      place && item.address?.country
        ? `${place}, ${item.address.country}`
        : (item.display_name?.split(',').slice(0, 3).join(',').trim() ??
          `${item.lat}, ${item.lon}`)
    return {
      lat: Number(item.lat),
      lon: Number(item.lon),
      label,
    }
  })
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const nominatim = await reverseNominatim(lat, lon)
  if (nominatim) return nominatim
  return reverseBigDataCloud(lat, lon)
}

async function reverseNominatim(lat: number, lon: number): Promise<string | null> {
  const params = new URLSearchParams({
    lat: lat.toFixed(5),
    lon: lon.toFixed(5),
    format: 'json',
    zoom: '10',
  })

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return null

    const data = (await response.json()) as {
      display_name?: string
      address?: {
        city?: string
        town?: string
        village?: string
        hamlet?: string
        county?: string
        state?: string
        country?: string
      }
    }

    const place =
      data.address?.city ??
      data.address?.town ??
      data.address?.village ??
      data.address?.hamlet ??
      data.address?.county ??
      data.address?.state

    if (place && data.address?.country) return `${place}, ${data.address.country}`
    if (place) return place
    return data.display_name?.split(',').slice(0, 3).join(',') ?? null
  } catch {
    return null
  }
}

async function reverseBigDataCloud(lat: number, lon: number): Promise<string | null> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(5),
    longitude: lon.toFixed(5),
    localityLanguage: 'en',
  })

  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`,
    )
    if (!response.ok) return null
    const data = (await response.json()) as {
      city?: string
      locality?: string
      principalSubdivision?: string
      countryName?: string
    }
    const place = data.city || data.locality || data.principalSubdivision
    if (place && data.countryName) return `${place}, ${data.countryName}`
    return place ?? data.countryName ?? null
  } catch {
    return null
  }
}
