import type { RankedNight } from './astronomy'

export type WeatherSnapshot = {
  timezone: string
  utcOffsetSeconds: number
  elevation: number
  daily: {
    date: string
    moonPhase: number | null
    moonrise: string | null
    moonset: string | null
    sunrise: string | null
    sunset: string | null
  }[]
  hourly: { time: Date; cloudCover: number }[]
}

function offsetIso(utcOffsetSeconds: number): string {
  const sign = utcOffsetSeconds >= 0 ? '+' : '-'
  const abs = Math.abs(utcOffsetSeconds)
  const hours = Math.floor(abs / 3600)
    .toString()
    .padStart(2, '0')
  const minutes = Math.floor((abs % 3600) / 60)
    .toString()
    .padStart(2, '0')
  return `${sign}${hours}:${minutes}`
}

function parseSiteLocal(stamp: string | null | undefined, offset: string): Date | null {
  if (!stamp) return null
  const iso = stamp.length === 10 ? `${stamp}T00:00:00${offset}` : `${stamp}${offset}`
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    daily: 'moon_phase,moonrise,moonset,sunrise,sunset',
    hourly: 'cloud_cover',
    forecast_days: '16',
    timezone: 'auto',
  })

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!response.ok) {
    throw new Error(`Weather request failed (${response.status})`)
  }

  const data = (await response.json()) as {
    timezone: string
    utc_offset_seconds: number
    elevation: number
    daily: {
      time: string[]
      moon_phase?: number[]
      moonrise?: (string | null)[]
      moonset?: (string | null)[]
      sunrise?: (string | null)[]
      sunset?: (string | null)[]
    }
    hourly: {
      time: string[]
      cloud_cover: number[]
    }
  }

  const offset = offsetIso(data.utc_offset_seconds)
  const daily = data.daily.time.map((date, i) => ({
    date,
    moonPhase: data.daily.moon_phase?.[i] ?? null,
    moonrise: data.daily.moonrise?.[i] ?? null,
    moonset: data.daily.moonset?.[i] ?? null,
    sunrise: data.daily.sunrise?.[i] ?? null,
    sunset: data.daily.sunset?.[i] ?? null,
  }))

  const hourly = data.hourly.time.map((time, i) => ({
    time: parseSiteLocal(time, offset) ?? new Date(time),
    cloudCover: data.hourly.cloud_cover[i] ?? 0,
  }))

  return {
    timezone: data.timezone,
    utcOffsetSeconds: data.utc_offset_seconds,
    elevation: data.elevation,
    daily,
    hourly,
  }
}

export function localDateKey(date: Date, timeZone: string): string {
  return date.toLocaleDateString('en-CA', { timeZone })
}

export function mergeCloudCover(nights: RankedNight[], weather: WeatherSnapshot): RankedNight[] {
  return nights.map((night) => {
    const samples = weather.hourly.filter(
      (hour) => hour.time >= night.dusk && hour.time <= night.dawn,
    )
    if (samples.length === 0) return { ...night, cloudCover: null }
    const avg = samples.reduce((sum, hour) => sum + hour.cloudCover, 0) / samples.length
    return { ...night, cloudCover: Math.round(avg) }
  })
}
