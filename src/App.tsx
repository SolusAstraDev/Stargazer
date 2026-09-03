import { useEffect, useState } from 'react'
import { MapPicker } from './components/MapPicker'
import { NightRankList, type NightSort } from './components/NightRankList'
import { PlaceSearch } from './components/PlaceSearch'
import { BestNightCard, ConstellationPanel, PlanetPanel } from './components/SkyResults'
import {
  rankNights,
  skyForNight,
  type LocationFix,
  type RankedNight,
  type SkySnapshot,
} from './lib/astronomy'
import { reverseGeocode } from './lib/geocode'
import { fetchWeather, mergeCloudCover, type WeatherSnapshot } from './lib/openMeteo'
import './App.css'

export default function App() {
  const [location, setLocation] = useState<LocationFix | null>(null)
  const [placeName, setPlaceName] = useState<string | null>(null)
  const [nights, setNights] = useState<RankedNight[]>([])
  const [selected, setSelected] = useState<RankedNight | null>(null)
  const [sky, setSky] = useState<SkySnapshot | null>(null)
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<NightSort>('moonless')

  const timeZone = weather?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  useEffect(() => {
    if (!location) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setWeather(null)

    const weatherPromise = fetchWeather(location.lat, location.lon).catch(() => null)
    const placePromise = reverseGeocode(location.lat, location.lon).catch(() => null)

    const timer = window.setTimeout(() => {
      try {
        const ranked = rankNights(location)
        void Promise.all([weatherPromise, placePromise]).then(([forecast, name]) => {
          if (cancelled) return
          const withClouds = forecast ? mergeCloudCover(ranked, forecast) : ranked
          setNights(withClouds)
          setSelected(withClouds[0] ?? null)
          setWeather(forecast)
          if (name) setPlaceName(name)
          setLoading(false)
        })
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not compute the night sky.')
        setNights([])
        setSelected(null)
        setLoading(false)
      }
    }, 40)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [location])

  useEffect(() => {
    if (!location || !selected) {
      setSky(null)
      return
    }
    setSky(skyForNight(location, selected))
  }, [location, selected])

  function pickLocation(fix: LocationFix, label?: string) {
    if (label) setPlaceName(label)
    setLocation(fix)
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.')
      return
    }
    setGeoBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pickLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setGeoBusy(false)
      },
      () => {
        setError('Could not read your location. Click the map instead.')
        setGeoBusy(false)
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    )
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <p className="brand">Stargazer</p>
          <h1>Darkest-night planner</h1>
        </div>
        <p className="lede">
          Pick a place. We find the night with the least moonlight, then show the planets and
          constellations you can actually see from there.
        </p>
      </header>

      <main>
        <div className="map-toolbar">
          <PlaceSearch onPick={pickLocation} />
          <button type="button" className="ghost-btn" onClick={useMyLocation} disabled={geoBusy}>
            {geoBusy ? 'Locating…' : 'Use my location'}
          </button>
          {location ? (
            <p className="coords">
              {location.lat.toFixed(3)}°, {location.lon.toFixed(3)}°
              {placeName ? ` · ${placeName}` : ''}
            </p>
          ) : (
            <p className="coords">Search, click the map, or use your location.</p>
          )}
        </div>

        <div className="layout">
          <div className="map-column">
            <div className="map-frame">
              <MapPicker location={location} onPick={pickLocation} />
            </div>
            {!loading && sky ? (
              <div className="sky-row">
                <PlanetPanel sky={sky} />
                <ConstellationPanel sky={sky} />
              </div>
            ) : null}
          </div>

          <section className="results-panel">
            {!location ? (
              <div className="panel empty-state">
                <h2>Choose a vantage point</h2>
                <p>
                  Search a place, click the map, or share your location. Stargazer scans the next 30
                  nights for moonless astronomical darkness.
                </p>
              </div>
            ) : null}

            {loading ? (
              <div className="panel empty-state">
                <h2>Reading the sky…</h2>
                <p>Computing moonless hours, phases, and what will be above the horizon.</p>
              </div>
            ) : null}

            {error ? <p className="error-banner">{error}</p> : null}

            {!loading && location && nights.length === 0 && !error ? (
              <div className="panel empty-state">
                <h2>No true night found</h2>
                <p>
                  At this latitude the Sun may not sink 18° below the horizon in the next month.
                  Try a location farther from the poles.
                </p>
              </div>
            ) : null}

            {!loading && selected ? (
              <BestNightCard night={selected} timeZone={timeZone} placeName={placeName} />
            ) : null}

            {!loading && nights.length > 0 ? (
              <NightRankList
                nights={nights}
                selectedId={selected?.id ?? null}
                timeZone={timeZone}
                sort={sort}
                onSort={setSort}
                onSelect={setSelected}
              />
            ) : null}
          </section>
        </div>
      </main>

      <footer className="legal">
        Map tiles © OpenStreetMap. Weather and moon-phase context from Open-Meteo.
        Positions calculated with Astronomy Engine.
      </footer>
    </div>
  )
}
