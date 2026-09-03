import {
  Body,
  Constellation,
  Equator,
  Horizon,
  Illumination,
  MoonPhase,
  Observer,
  SearchAltitude,
  SearchRiseSet,
} from 'astronomy-engine'
import { CONSTELLATIONS } from '../data/constellations'

export type LocationFix = {
  lat: number
  lon: number
}

export type RankedNight = {
  id: string
  dusk: Date
  dawn: Date
  sunset: Date | null
  sunrise: Date | null
  midNight: Date
  illumination: number
  moonPhaseDeg: number
  phaseName: string
  moonlessHours: number
  darkHours: number
  rank: number
  cloudCover: number | null
}

export type PlanetWindow = 'all night' | 'evening' | 'morning' | 'midnight'

export type VisiblePlanet = {
  name: string
  magnitude: number
  altitude: number
  azimuth: number
  constellation: string
  window: PlanetWindow
  rise: Date | null
  set: Date | null
}

export type VisibleConstellation = {
  name: string
  abbreviation: string
  altitude: number
  azimuth: number
}

export type SkySnapshot = {
  planets: VisiblePlanet[]
  constellations: VisibleConstellation[]
}

const PLANET_BODIES: Body[] = [
  Body.Mercury,
  Body.Venus,
  Body.Mars,
  Body.Jupiter,
  Body.Saturn,
  Body.Uranus,
  Body.Neptune,
]

const NIGHT_COUNT = 30
const MIN_PLANET_ALT = 5
const MIN_CONSTELLATION_ALT = 15
const SAMPLE_MINUTES = 12

function bodyAltitude(
  body: Body,
  observer: Observer,
  when: Date,
): { altitude: number; azimuth: number; ra: number; dec: number } {
  const eq = Equator(body, when, observer, true, true)
  const hor = Horizon(when, observer, eq.ra, eq.dec, 'normal')
  return {
    altitude: hor.altitude,
    azimuth: hor.azimuth,
    ra: eq.ra,
    dec: eq.dec,
  }
}

export function phaseNameFromLongitude(deg: number): string {
  const wrapped = ((deg % 360) + 360) % 360
  if (wrapped < 22.5 || wrapped >= 337.5) return 'New Moon'
  if (wrapped < 67.5) return 'Waxing Crescent'
  if (wrapped < 112.5) return 'First Quarter'
  if (wrapped < 157.5) return 'Waxing Gibbous'
  if (wrapped < 202.5) return 'Full Moon'
  if (wrapped < 247.5) return 'Waning Gibbous'
  if (wrapped < 292.5) return 'Last Quarter'
  return 'Waning Crescent'
}

function findDusk(observer: Observer, from: Date): Date | null {
  const sun = bodyAltitude(Body.Sun, observer, from)
  if (sun.altitude < -18) {
    const previous = SearchAltitude(Body.Sun, observer, -1, from, -1.5, -18)
    return previous?.date ?? from
  }
  return SearchAltitude(Body.Sun, observer, -1, from, 2, -18)?.date ?? null
}

function moonlessHours(observer: Observer, dusk: Date, dawn: Date): number {
  const stepMs = SAMPLE_MINUTES * 60 * 1000
  const span = dawn.getTime() - dusk.getTime()
  if (span <= 0) return 0

  let darkMs = 0
  for (let t = dusk.getTime(); t < dawn.getTime(); t += stepMs) {
    const moon = bodyAltitude(Body.Moon, observer, new Date(t))
    const slice = Math.min(stepMs, dawn.getTime() - t)
    if (moon.altitude < 0) darkMs += slice
  }
  return darkMs / 3_600_000
}

function buildNight(observer: Observer, dusk: Date, dawn: Date): RankedNight {
  const midMs = dusk.getTime() + (dawn.getTime() - dusk.getTime()) / 2
  const midNight = new Date(midMs)
  const illum = Illumination(Body.Moon, midNight)
  const phaseDeg = MoonPhase(midNight)
  const sunset =
    SearchRiseSet(Body.Sun, observer, -1, new Date(dusk.getTime() - 6 * 3600_000), 1)
      ?.date ?? null
  const sunrise = SearchRiseSet(Body.Sun, observer, +1, dusk, 1)?.date ?? null
  const darkHours = (dawn.getTime() - dusk.getTime()) / 3_600_000

  return {
    id: dusk.toISOString(),
    dusk,
    dawn,
    sunset,
    sunrise,
    midNight,
    illumination: illum.phase_fraction,
    moonPhaseDeg: phaseDeg,
    phaseName: phaseNameFromLongitude(phaseDeg),
    moonlessHours: Math.min(moonlessHours(observer, dusk, dawn), darkHours),
    darkHours,
    rank: 0,
    cloudCover: null,
  }
}

export function rankNights(location: LocationFix, from = new Date()): RankedNight[] {
  const observer = new Observer(location.lat, location.lon, 0)
  const nights: RankedNight[] = []
  let cursor = from
  let attempts = 0

  while (nights.length < NIGHT_COUNT && attempts < 45) {
    attempts += 1
    const dusk = findDusk(observer, cursor)
    if (!dusk) {
      cursor = new Date(cursor.getTime() + 24 * 3600_000)
      continue
    }
    const dawn = SearchAltitude(Body.Sun, observer, +1, dusk, 2, -18)?.date
    if (!dawn || dawn.getTime() <= dusk.getTime()) {
      cursor = new Date(dusk.getTime() + 24 * 3600_000)
      continue
    }
    nights.push(buildNight(observer, dusk, dawn))
    cursor = new Date(dawn.getTime() + 20 * 60_000)
  }

  const sorted = [...nights].sort((a, b) => {
    if (Math.abs(a.moonlessHours - b.moonlessHours) > 0.5) {
      return b.moonlessHours - a.moonlessHours
    }
    return a.illumination - b.illumination
  })

  return sorted.map((night, index) => ({ ...night, rank: index + 1 }))
}

function planetWindow(upAtDusk: boolean, upAtMid: boolean, upAtDawn: boolean): PlanetWindow {
  if (upAtDusk && upAtDawn) return 'all night'
  if (upAtDusk && !upAtDawn) return 'evening'
  if (!upAtDusk && upAtDawn) return 'morning'
  if (upAtMid) return 'midnight'
  return 'evening'
}

export function skyForNight(location: LocationFix, night: RankedNight): SkySnapshot {
  const observer = new Observer(location.lat, location.lon, 0)
  const duskSample = new Date(night.dusk.getTime() + 20 * 60_000)
  const dawnSample = new Date(night.dawn.getTime() - 20 * 60_000)
  const samples = [duskSample, night.midNight, dawnSample]

  const planets: VisiblePlanet[] = []
  for (const body of PLANET_BODIES) {
    const positions = samples.map((when) => bodyAltitude(body, observer, when))
    const bestIndex = positions.reduce(
      (best, pos, idx) => (pos.altitude > positions[best].altitude ? idx : best),
      0,
    )
    const best = positions[bestIndex]
    if (best.altitude < MIN_PLANET_ALT) continue

    const up = positions.map((p) => p.altitude >= MIN_PLANET_ALT)
    const eqJ2000 = Equator(body, samples[bestIndex], observer, false, true)
    const host = Constellation(eqJ2000.ra, eqJ2000.dec)
    const illum = Illumination(body, samples[bestIndex])

    planets.push({
      name: body,
      magnitude: illum.mag,
      altitude: best.altitude,
      azimuth: best.azimuth,
      constellation: host.name,
      window: planetWindow(up[0], up[1], up[2]),
      rise: SearchRiseSet(body, observer, +1, night.dusk, 1.2)?.date ?? null,
      set: SearchRiseSet(body, observer, -1, night.dusk, 1.2)?.date ?? null,
    })
  }

  planets.sort((a, b) => a.magnitude - b.magnitude)

  const constellations: VisibleConstellation[] = CONSTELLATIONS.flatMap((c) => {
    const hor = Horizon(night.midNight, observer, c.raHours, c.decDeg, 'normal')
    if (hor.altitude < MIN_CONSTELLATION_ALT) return []
    return [
      {
        name: c.name,
        abbreviation: c.abbreviation,
        altitude: hor.altitude,
        azimuth: hor.azimuth,
      },
    ]
  }).sort((a, b) => b.altitude - a.altitude)

  return { planets, constellations }
}

export function compassFromAzimuth(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const idx = Math.round(deg / 22.5) % 16
  return dirs[idx]
}

export function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h <= 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
