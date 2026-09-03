# Stargazer

A small web app that finds the upcoming night with the least moonlight from a map location, then lists planets and constellations you can see that night.

## GitHub Pages

This repo is set up as a **project site**. After you push to `main` and the workflow succeeds, the app is at:

`https://<username>.github.io/Stargazer/`

In the GitHub repo: **Settings → Pages → Source → GitHub Actions**. The repo must be named `Stargazer` so it matches the Vite `base` path.

## Run

```bash
npm install
npm run dev
```

Open the printed local URL, click the map (or use your location), and read the ranked nights.

## Data

- Map: OpenStreetMap via Leaflet
- Weather, moon phase, and cloud cover: [Open-Meteo](https://open-meteo.com/)
- Place names: Nominatim, with a client geocoder fallback
- Positions, twilight, and illumination: [Astronomy Engine](https://github.com/cosinekitty/astronomy)
