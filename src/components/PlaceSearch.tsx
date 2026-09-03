import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { LocationFix } from '../lib/astronomy'
import { searchPlaces, type PlaceHit } from '../lib/geocode'

type PlaceSearchProps = {
  onPick: (fix: LocationFix, label: string) => void
}

export function PlaceSearch({ onPick }: PlaceSearchProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<PlaceHit[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setHits([])
      setBusy(false)
      return
    }

    const controller = new AbortController()
    setBusy(true)
    const timer = window.setTimeout(() => {
      void searchPlaces(trimmed, controller.signal)
        .then((results) => {
          setHits(results)
          setActive(0)
          setOpen(results.length > 0)
        })
        .catch(() => {
          if (!controller.signal.aborted) setHits([])
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false)
        })
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function choose(hit: PlaceHit) {
    onPick({ lat: hit.lat, lon: hit.lon }, hit.label)
    setQuery(hit.label)
    setOpen(false)
    setHits([])
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || hits.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (i + 1) % hits.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (i - 1 + hits.length) % hits.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const hit = hits[active]
      if (hit) choose(hit)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="place-search" ref={rootRef}>
      <input
        type="search"
        value={query}
        placeholder="Search a city or place"
        aria-label="Search a city or place"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          if (hits.length > 0) setOpen(true)
        }}
        onKeyDown={onKeyDown}
      />
      {busy ? <span className="search-hint">Searching…</span> : null}
      {open && hits.length > 0 ? (
        <ul id={listId} className="search-results" role="listbox">
          {hits.map((hit, index) => (
            <li key={`${hit.lat}-${hit.lon}-${hit.label}`}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={index === active ? 'active' : undefined}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(hit)}
              >
                {hit.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
