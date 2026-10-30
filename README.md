# Oslo

Alle barer, restauranter, kafeer, parker, badeplasser, museer og aktiviteter i Oslo – med filtre for **åpent nå**, **gratis**, **nær meg** og **billigst øl**. Fungerer som nettside og kan installeres som app på mobilen (PWA).

## Slik henger det sammen

| Del | Hvor |
|---|---|
| Steder, adresser, åpningstider | OpenStreetMap, hentes hver natt av `.github/workflows/data.yml` → `public/data/steder.json` |
| Ølpriser | Meldt inn av brukere via `api/priser.js` (Upstash Redis) |
| Vær | MET Norge via `api/vaer.js` |
| Kart | Leaflet + OpenStreetMap-fliser |

## Kom i gang

```bash
npm install
npm run hent-data   # henter ekte data (krever internett)
npm run dev
npm test            # Playwright-tester med testdata
```

## Publisering (Vercel)

1. Importer repoet i Vercel (rammeverk: Vite).
2. For prisinnmelding: legg til Upstash Redis fra Vercel Marketplace. Den setter miljøvariablene automatisk. Uten den vises priser ikke, og innmelding gir en vennlig melding.

Data © OpenStreetMap-bidragsytere (ODbL).
