# Stargazer

A small web app that finds the upcoming night with the least moonlight from a map location, then lists planets and constellations you can see that night.

## Data

- Map: OpenStreetMap via Leaflet
- Weather, moon phase, and cloud cover: [Open-Meteo](https://open-meteo.com/)
- Place names: Nominatim, with a client geocoder fallback
- Positions, twilight, and illumination: [Astronomy Engine](https://github.com/cosinekitty/astronomy)
