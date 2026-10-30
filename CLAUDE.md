# Oslo – instrukser for Claude

- Norsk bokmål i UI, kommentarer og commit-meldinger.
- React 19 + Vite + vite-plugin-pwa, publiseres på Vercel. Ingen ruter-bibliotek: rutene ligger i `src/App.jsx` (`/`, `/k/:kategori`, `/gratis`, `/sok?q=`, `/sted/:id`, `/kart`, `/lagret`, `/om`).
- Data: `scripts/hent-data.mjs` (OpenStreetMap/Overpass). Kategorier og gratis-regler ligger der og i `src/data.js` (KATEGORIER). Endrer du kategorier, oppdater begge og `tests/data.spec.js`.
- Åpningstider tolkes med `opening_hours`-biblioteket i `src/data.js`.
- Ølpriser: `api/priser.js`. Aldri finn på priser – de skal komme fra brukere.
- Testene bruker `tests/fixture.json` og mocker `/api/*`. Kjør `npm run lint` og `npm test` før du er ferdig. I Claude-skymiljøet: sett `PW_CHROMIUM` til chrome-headless-shell under `/opt/pw-browsers/`.
- Mobil først: de fleste brukere er på telefon.
