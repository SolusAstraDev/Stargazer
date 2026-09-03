import type { RankedNight } from '../lib/astronomy'
import { formatHours } from '../lib/astronomy'

export type NightSort = 'moonless' | 'moonlight' | 'date'

type NightRankListProps = {
  nights: RankedNight[]
  selectedId: string | null
  timeZone: string
  sort: NightSort
  onSort: (sort: NightSort) => void
  onSelect: (night: RankedNight) => void
}

const SORTS: { id: NightSort; label: string }[] = [
  { id: 'moonless', label: 'Moonless hours' },
  { id: 'moonlight', label: 'Moonlight' },
  { id: 'date', label: 'Date' },
]

function nightLabel(night: RankedNight, timeZone: string): string {
  return night.dusk.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone,
  })
}

function sortedNights(nights: RankedNight[], sort: NightSort): RankedNight[] {
  const copy = [...nights]
  if (sort === 'date') {
    copy.sort((a, b) => a.dusk.getTime() - b.dusk.getTime())
  } else if (sort === 'moonlight') {
    copy.sort((a, b) => a.illumination - b.illumination)
  } else {
    copy.sort((a, b) => a.rank - b.rank)
  }
  return copy
}

export function NightRankList({
  nights,
  selectedId,
  timeZone,
  sort,
  onSort,
  onSelect,
}: NightRankListProps) {
  const ordered = sortedNights(nights, sort)

  return (
    <section className="panel night-panel">
      <header className="panel-header">
        <h2>Upcoming nights</h2>
        <p>
          {sort === 'date'
            ? 'Shown in calendar order.'
            : sort === 'moonlight'
              ? 'Least moonlight first.'
              : 'Most moonless dark hours first.'}
        </p>
        <div className="sort-bar" role="group" aria-label="Sort upcoming nights">
          {SORTS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={sort === option.id ? 'sort-btn active' : 'sort-btn'}
              onClick={() => onSort(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>
      <ol className="night-list">
        {ordered.map((night) => {
          const selected = night.id === selectedId
          return (
            <li key={night.id}>
              <button
                type="button"
                className={selected ? 'night-row selected' : 'night-row'}
                onClick={() => onSelect(night)}
              >
                <span className="night-rank">#{night.rank}</span>
                <span className="night-meta">
                  <strong>{nightLabel(night, timeZone)}</strong>
                  <span>
                    {night.phaseName} · {Math.round(night.illumination * 100)}% lit
                  </span>
                </span>
                <span className="night-score">
                  <span>{formatHours(night.moonlessHours)} moonless</span>
                  {night.cloudCover != null ? (
                    <span className="muted">{night.cloudCover}% cloud</span>
                  ) : null}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
