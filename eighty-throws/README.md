# 80 Throws

**Throw a paper plane once a day. Get it around the world before Phileas Fogg does.**

A playable prototype of an idea from [`../IDEAS.md`](../IDEAS.md). Everyone starts in London. Each day you get one throw, and the wind carries your plane on from wherever yesterday's landed. Phileas Fogg sets the pace: he keeps to his timetable from *Around the World in Eighty Days* (1872) and never skips a day.

## Play

Open `index.html` in a browser. There's no build step. Fonts load from Google Fonts, and everything else is local.

- **Aim and throw:** drag on the map toward where you want to go. Drag farther to throw harder. Let go to throw.
- **The preview:** a dotted line shows the flight, bent by the wind, and a circle shows roughly where you'll land.
- **Throwing too hard can stall:** the preview turns amber, then red, as the risk grows.
- **Stamps:** land in a new country to collect its stamp.
- **Soggy planes:** land in the sea and your next throw flies 30% shorter.
- **The finish:** cross every line of longitude to get home, and beat Fogg's 80 days.

**Skip to tomorrow** is a prototype shortcut for playing several days in one sitting. Your journey is saved in `localStorage`, and the menu has backup codes.

## How it works

- **Wind.** The wind is modelled on Earth's real prevailing wind belts. Trade winds blow west near the equator, the westerlies (the jet stream) blow east between about 30° and 60°, and polar easterlies blow west again. Each day adds 14 swirling weather systems, placed by the calendar date, so everyone who plays on the same day gets the same weather.
- **Balance.** Throwing due east every day ties Fogg at about 80 days. Reading the wind and staying out of the sea beats him by a few, and throwing hard is a gamble. The tests guard this.
- **Map.** The map is a flat map that wraps around the world, centred on your plane. Longitudes keep counting past 180°, so a trip around the world adds up to 360°.
- **Determinism.** A throw is decided by the day and your aim alone. The result is saved the moment you let go.

| File | What it does |
|---|---|
| `src/world-data.js` | Generated map data: country outlines, names, flag codes, cities |
| `src/geo.js` | Distances, map data decoding, and the country, sea and nearest-city lookups |
| `src/weather.js` | Wind belts plus daily weather systems |
| `src/flight.js` | One throw: the plotted flight, the landing spread, stalls, soggy planes |
| `src/race.js` | Fogg's timetable and the progress maths |
| `src/storage.js` | Saves, calendar days, weather seeds, backup codes |
| `src/map.js` | The canvas map |
| `src/main.js` | The page: aiming, the flight, the card, stamps, sharing |

## Develop

```sh
npm test          # node --test: geography, wind, flights, Fogg, saves, balance
npm run build     # dist/eighty-throws.html: one self-contained file
npm install && npm run data   # regenerate src/world-data.js
```

Requires Node 18 or later. The map data comes from Natural Earth 1:110m (public domain) via [world-atlas](https://github.com/topojson/world-atlas). Country names and codes come from [i18n-iso-countries](https://github.com/michaelwittig/node-i18n-iso-countries), and the city list is in `tools/cities.mjs`.
