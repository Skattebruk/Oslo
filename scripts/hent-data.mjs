// Henter steder i Oslo fra OpenStreetMap (Overpass API) og lagrer dem som
// public/data/steder.json. Kjøres daglig av GitHub Actions (.github/workflows/data.yml).
// Data © OpenStreetMap-bidragsytere, ODbL.
import { writeFileSync, mkdirSync } from "node:fs";

const SERVERE = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

// Oslo kommune: hele kommunen (admin_level 7, navn Oslo). Reserve: kartutsnitt.
const OMRÅDE = `area["name"="Oslo"]["boundary"="administrative"]["admin_level"~"^(4|7)$"]->.oslo;`;
const BBOX = "59.80,10.48,60.14,10.95";
const filtre = f => `
  nwr["amenity"~"^(bar|pub|biergarten|nightclub|restaurant|fast_food|cafe|food_court|ice_cream|cinema|theatre|arts_centre|public_bath|sauna)$"]["name"](${f});
  nwr["leisure"~"^(park|garden|beach_resort|swimming_area|playground|bowling_alley|escape_game|ice_rink|water_park|sauna|fitness_station|dog_park|miniature_golf|sports_centre)$"]["name"](${f});
  nwr["natural"="beach"]["name"](${f});
  nwr["tourism"~"^(museum|gallery|viewpoint|attraction|zoo|theme_park)$"]["name"](${f});`;
const SPØRRING = `[out:json][timeout:240];\n${OMRÅDE}\n(${filtre("area.oslo")}\n);\nout center tags;`;
const SPØRRING_BBOX = `[out:json][timeout:240];\n(${filtre(BBOX)}\n);\nout center tags;`;

export function kategori(t) {
  const a = t.amenity, l = t.leisure, tu = t.tourism, n = t.natural;
  if (["bar", "pub", "biergarten", "nightclub"].includes(a)) return "barer";
  if (["restaurant", "fast_food", "food_court"].includes(a)) return "mat";
  if (["cafe", "ice_cream"].includes(a)) return "kafeer";
  if (["park", "garden", "dog_park"].includes(l)) return "parker";
  if (["beach_resort", "swimming_area", "water_park"].includes(l) || n === "beach" || a === "public_bath") return "bading";
  if (l === "sports_centre" && /swimming/.test(t.sport || "")) return "bading";
  if (tu === "viewpoint") return "utsikt";
  if (["museum", "gallery"].includes(tu)) return "museer";
  if (l === "playground") return "lekeplasser";
  if (["cinema", "theatre", "arts_centre", "sauna"].includes(a)
    || ["bowling_alley", "escape_game", "ice_rink", "sauna", "miniature_golf", "fitness_station"].includes(l)
    || ["attraction", "zoo", "theme_park"].includes(tu)) return "aktiviteter";
  return null; // f.eks. idrettshaller uten svømming
}

const TYPER = {
  bar: "Bar", pub: "Pub", biergarten: "Ølhage", nightclub: "Nattklubb", restaurant: "Restaurant", fast_food: "Gatekjøkken",
  food_court: "Matsal", cafe: "Kafé", ice_cream: "Iskrem", cinema: "Kino", theatre: "Teater", arts_centre: "Kulturhus",
  public_bath: "Bad", sauna: "Badstue", park: "Park", garden: "Hage", dog_park: "Hundepark", beach_resort: "Strand",
  swimming_area: "Badeplass", playground: "Lekeplass", bowling_alley: "Bowling", escape_game: "Escape room",
  ice_rink: "Skøytebane", water_park: "Badeland", fitness_station: "Treningspark", miniature_golf: "Minigolf",
  sports_centre: "Svømmehall", beach: "Strand", museum: "Museum", gallery: "Galleri", viewpoint: "Utsiktspunkt",
  attraction: "Severdighet", zoo: "Dyrepark", theme_park: "Fornøyelsespark",
};
const typeNavn = (t) => TYPER[t.amenity] || TYPER[t.leisure] || TYPER[t.tourism] || TYPER[t.natural] || "Sted";

// Gratis: uteområder er gratis å besøke. Ellers bare når OSM sier fee=no.
export function gratis(k, t) {
  if (t.fee === "no") return true;
  if (t.fee === "yes") return false;
  if (["parker", "utsikt", "lekeplasser"].includes(k)) return true;
  if (k === "bading" && !(t.leisure === "sports_centre" || t.amenity === "public_bath" || t.leisure === "water_park")) return true;
  return false;
}

async function hent(SPØRRING) {
  let siste;
  for (const url of SERVERE) {
    try {
      const svar = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "oslo-app/1.0 (github.com/Skattebruk/oslo)" },
        body: "data=" + encodeURIComponent(SPØRRING),
      });
      if (!svar.ok) throw new Error(`${url}: HTTP ${svar.status}`);
      return await svar.json();
    } catch (e) { siste = e; console.log("::warning::" + e.message); }
  }
  throw siste;
}

export function tilSteder(elements) {
  const sett = new Set();
  const steder = [];
  for (const e of elements) {
    const t = e.tags || {};
    const k = kategori(t);
    if (!k || !t.name) continue;
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
    if (lat == null) continue;
    const nøkkel = k + "|" + t.name.toLowerCase() + "|" + lat.toFixed(3) + lon.toFixed(3);
    if (sett.has(nøkkel)) continue;
    sett.add(nøkkel);
    const s = { id: e.type[0] + e.id, k, t: typeNavn(t), n: t.name, la: +lat.toFixed(6), lo: +lon.toFixed(6) };
    const adr = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ");
    if (adr) s.a = adr;
    if (t.opening_hours) s.oh = t.opening_hours;
    const nett = t.website || t["contact:website"];
    if (nett) s.w = nett;
    const tlf = t.phone || t["contact:phone"];
    if (tlf) s.p = tlf;
    if (t.cuisine) s.c = t.cuisine.split(";").slice(0, 3).join(", ").replace(/_/g, " ");
    if (t.outdoor_seating === "yes") s.ute = 1;
    if (t.wheelchair === "yes") s.rull = 1;
    if (gratis(k, t)) s.g = 1;
    if (t.description) s.d = t.description.slice(0, 280);
    steder.push(s);
  }
  return steder.sort((a, b) => a.n.localeCompare(b.n, "nb"));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let steder = [];
  try {
    steder = tilSteder((await hent(SPØRRING)).elements);
    console.log(`Områdespørring: ${steder.length} steder`);
  } catch (e) { console.log("::warning::Områdespørring feilet: " + e.message); }
  if (steder.length < 500) {
    try {
      steder = tilSteder((await hent(SPØRRING_BBOX)).elements);
      console.log(`Kartutsnitt: ${steder.length} steder`);
    } catch (e) { console.log("::error::Kartutsnitt feilet også: " + e.message); process.exit(1); }
  }
  mkdirSync("public/data", { recursive: true });
  writeFileSync("public/data/steder.json", JSON.stringify({ hentet: new Date().toISOString(), kilde: "© OpenStreetMap-bidragsytere (ODbL)", steder }));
  const per = steder.reduce((m, s) => ((m[s.k] = (m[s.k] || 0) + 1), m), {});
  console.log(`::notice::Lagret ${steder.length} steder: ${JSON.stringify(per)}`);
  if (steder.length < 500) { console.log("::error::Mistenkelig få steder – avbryter"); process.exit(1); }
}
