# Stargazer

A small web app that finds the upcoming night with the least moonlight from a map location, then lists planets and constellations you can see that night.

## GitHub Pages

Live URL after a successful deploy:

`https://SolusAstraDev.github.io/Stargazer/`

The workflow cannot create the site until Pages is enabled once:

1. Open [Settings → Pages](https://github.com/SolusAstraDev/Stargazer/settings/pages)
2. Set **Source** to **GitHub Actions** and save
3. Re-run **Deploy GitHub Pages** from the Actions tab (or push to `main`)

The repo name must stay `Stargazer` so it matches the Vite `base` path.

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
