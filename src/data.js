import opening_hours from "opening_hours";

export const KATEGORIER = [
  { id: "barer",       navn: "Barer",       kort: "Øl",   farge: "#9a3412", bunn: "#fff3e6" },
  { id: "mat",         navn: "Mat",         kort: "Mat",  farge: "#9f1239", bunn: "#fdecec" },
  { id: "kafeer",      navn: "Kafeer",      kort: "Kaf",  farge: "#78350f", bunn: "#f5efe6" },
  { id: "parker",      navn: "Parker",      kort: "Park", farge: "#14532d", bunn: "#e8f5ec" },
  { id: "bading",      navn: "Bading",      kort: "Bad",  farge: "#0b4f8a", bunn: "#e6f0fa" },
  { id: "utsikt",      navn: "Utsikt",      kort: "Utsy", farge: "#3f6212", bunn: "#edf3e3" },
  { id: "museer",      navn: "Museer",      kort: "Mus",  farge: "#5b21b6", bunn: "#efeafb" },
  { id: "aktiviteter", navn: "Aktiviteter", kort: "Akt",  farge: "#334155", bunn: "#f1f5f9" },
  { id: "lekeplasser", navn: "Lekeplasser", kort: "Lek",  farge: "#a16207", bunn: "#fdf6e3" },
];
export const KAT = Object.fromEntries(KATEGORIER.map(k => [k.id, k]));

let løfte;
export function hentSteder() {
  if (!løfte) {
    løfte = fetch("/data/steder.json")
      .then(r => (r.ok ? r.json() : { steder: [] }))
      .catch(() => ({ steder: [] }));
  }
  return løfte;
}

export async function hentPriser() {
  try {
    const r = await fetch("/api/priser");
    if (!r.ok) return {};
    return await r.json();
  } catch {
    return {};
  }
}

// --- Åpningstider -----------------------------------------------------------
const tolket = new Map();
function oh(s) {
  if (!s.oh) return null;
  if (!tolket.has(s.id)) {
    let v = null;
    try {
      v = new opening_hours(s.oh, { lat: s.la, lon: s.lo, address: { country_code: "no", state: "Oslo" } }, { locale: "nb" });
    } catch { v = null; }
    tolket.set(s.id, v);
  }
  return tolket.get(s.id);
}

const kl = d => d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
const ukedag = d => d.toLocaleDateString("nb-NO", { weekday: "long" });

// { kjent, aapen, tekst, stengerMin } – stengerMin brukes til «åpent lengst»
export function status(s, nå = new Date()) {
  const o = oh(s);
  if (!o) return { kjent: false, aapen: false, tekst: s.oh ? "Åpningstider kan ikke leses" : "Ukjente åpningstider" };
  try {
    const aapen = o.getState(nå);
    // Biblioteket kan melde «endring» ved midnatt selv om stedet holder åpent.
    // Hopp videre til første tidspunkt der åpen/stengt faktisk skifter.
    let neste = o.getNextChange(nå);
    for (let i = 0; neste && i < 14 && o.getState(neste) === aapen; i++) neste = o.getNextChange(neste);
    if (aapen) {
      if (!neste) return { kjent: true, aapen: true, tekst: "Åpent hele døgnet", stengerMin: 99999 };
      const min = Math.round((neste - nå) / 60000);
      return { kjent: true, aapen: true, tekst: `Åpen til ${kl(neste)}`, stengerMin: min, snart: min <= 45 };
    }
    if (!neste) return { kjent: true, aapen: false, tekst: "Stengt" };
    const samme = neste.toDateString() === nå.toDateString();
    return { kjent: true, aapen: false, tekst: `Stengt · åpner ${samme ? "" : ukedag(neste) + " "}${kl(neste)}` };
  } catch {
    return { kjent: false, aapen: false, tekst: "Ukjente åpningstider" };
  }
}

// Åpningstider for de neste 7 dagene, én rad per dag
export function uke(s, nå = new Date()) {
  const o = oh(s);
  if (!o) return null;
  const rader = [];
  const start = new Date(nå); start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const fra = new Date(start); fra.setDate(start.getDate() + i);
    const til = new Date(fra); til.setDate(fra.getDate() + 1);
    let tider = [];
    try { tider = o.getOpenIntervals(fra, til); } catch { return null; }
    const tekst = tider.length === 0 ? "Stengt"
      : tider.map(([a, b]) => (b - a >= 86400000 - 60000 ? "Hele døgnet" : `${kl(a)}–${kl(b).replace("00:00", "24:00")}`)).join(", ");
    const navn = ukedag(fra);
    rader.push({ dag: navn[0].toUpperCase() + navn.slice(1), tekst, idag: i === 0 });
  }
  return rader;
}

// --- Avstand ----------------------------------------------------------------
export function avstand(a, b) {
  if (!a || !b) return null;
  const R = 6371000, r = x => (x * Math.PI) / 180;
  const dLa = r(b.la - a.la), dLo = r(b.lo - a.lo);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.la)) * Math.cos(r(b.la)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const avstandTekst = m => (m == null ? "" : m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);

// --- Lagrede steder (bare på denne enheten) ---------------------------------
const NØKKEL = "oslo.lagret";
export function lagrede() {
  try { return JSON.parse(localStorage.getItem(NØKKEL) || "[]"); } catch { return []; }
}
export function byttLagret(id) {
  const l = lagrede();
  const ny = l.includes(id) ? l.filter(x => x !== id) : [id, ...l];
  try { localStorage.setItem(NØKKEL, JSON.stringify(ny)); } catch { /* privat modus */ }
  return ny;
}

export function osmLenke(id) {
  const typer = { n: "node", w: "way", r: "relation" };
  return `https://www.openstreetmap.org/${typer[id[0]]}/${id.slice(1)}`;
}
