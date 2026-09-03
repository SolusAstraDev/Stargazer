import type { RankedNight, SkySnapshot } from '../lib/astronomy'
import { compassFromAzimuth, formatHours } from '../lib/astronomy'

function formatClock(date: Date | null, timeZone: string): string {
  if (!date) return '—'
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  })
}

function MoonDisc({ illumination }: { illumination: number }) {
  const lit = Math.round(illumination * 100)
  return (
    <div className="moon-disc" aria-hidden="true">
      <span className="moon-lit" style={{ width: `${100 - lit}%` }} />
    </div>
  )
}

type BestNightCardProps = {
  night: RankedNight
  timeZone: string
  placeName: string | null
}

export function BestNightCard({ night, timeZone, placeName }: BestNightCardProps) {
  const isBest = night.rank === 1

  return (
    <section className={isBest ? 'panel featured' : 'panel featured alt'}>
      <header className="panel-header">
        <p className="kicker">{isBest ? 'Darkest night' : `Night #${night.rank}`}</p>
        <h2>
          {night.dusk.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            timeZone,
          })}
        </h2>
        {placeName ? <p className="muted">{placeName}</p> : null}
      </header>

      <div className="best-grid">
        <div className="moon-block">
          <MoonDisc illumination={night.illumination} />
          <div>
            <strong>{night.phaseName}</strong>
            <p>{Math.round(night.illumination * 100)}% illuminated</p>
          </div>
        </div>
        <dl className="stat-grid">
          <div>
            <dt>Moonless dark</dt>
            <dd>{formatHours(night.moonlessHours)}</dd>
          </div>
          <div>
            <dt>Astronomical night</dt>
            <dd>
              {formatClock(night.dusk, timeZone)} – {formatClock(night.dawn, timeZone)}
            </dd>
          </div>
          <div>
            <dt>Sunset / sunrise</dt>
            <dd>
              {formatClock(night.sunset, timeZone)} / {formatClock(night.sunrise, timeZone)}
            </dd>
          </div>
          <div>
            <dt>Cloud cover</dt>
            <dd>{night.cloudCover != null ? `${night.cloudCover}%` : 'Beyond forecast'}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

export function PlanetPanel({ sky }: { sky: SkySnapshot }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Planets</h2>
        <p>Bodies at least 5° above the horizon during this night.</p>
      </header>
      {sky.planets.length === 0 ? (
        <p className="empty-copy">No bright planets stay well above the horizon this night.</p>
      ) : (
        <ul className="object-list">
          {sky.planets.map((planet) => (
            <li key={planet.name}>
              <div>
                <strong>{planet.name}</strong>
                <span className="muted">
                  mag {planet.magnitude.toFixed(1)} · {planet.window} · in {planet.constellation}
                </span>
              </div>
              <span className="object-pos">
                {Math.round(planet.altitude)}° {compassFromAzimuth(planet.azimuth)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ConstellationPanel({ sky }: { sky: SkySnapshot }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Constellations</h2>
        <p>Well placed at mid-night (centroid above 15°).</p>
      </header>
      {sky.constellations.length === 0 ? (
        <p className="empty-copy">No constellation centers clear 15° at mid-night.</p>
      ) : (
        <ul className="chip-list">
          {sky.constellations.map((item) => (
            <li key={item.abbreviation} title={`${Math.round(item.altitude)}° ${compassFromAzimuth(item.azimuth)}`}>
              <span>{item.name}</span>
              <span className="muted">{item.abbreviation}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
