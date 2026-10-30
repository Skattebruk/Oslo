import { useEffect, useState } from "react";
import { useApp, Lenke } from "./App";
import { KAT, status, avstand, avstandTekst } from "./data";

export function prisFor(priser, id) {
  const p = priser?.[id];
  return p && typeof p.pris === "number" ? p : null;
}

export function StedKort({ s, visPris }) {
  const { posisjon, nå, priser } = useApp();
  const st = status(s, nå);
  const kat = KAT[s.k];
  const m = avstand(posisjon, s);
  const pris = visPris ? prisFor(priser, s.id) : null;
  return (
    <Lenke til={`/sted/${s.id}`} className="kort" data-testid="sted">
      <span className="kort-ikon" style={{ background: kat?.bunn, color: kat?.farge }} aria-hidden="true">{kat?.kort}</span>
      <span className="kort-tekst">
        <span className="kort-navn">{s.n}</span>
        <span className="kort-info">{[s.t, s.a, avstandTekst(m)].filter(Boolean).join(" · ")}</span>
        <span className={"status " + (st.aapen ? (st.snart ? "snart" : "aapen") : st.kjent ? "stengt" : "ukjent")}>
          {st.tekst}
        </span>
        {s.g ? <span className="merke gratis">Gratis</span> : null}
      </span>
      {visPris ? (
        <span className="kort-pris">
          {pris ? <><strong>{pris.pris} kr</strong><small>0,5 l pils</small></> : <small>Ingen pris</small>}
        </span>
      ) : null}
    </Lenke>
  );
}

const VÆRTEKST = {
  clearsky: "Klarvær", fair: "Lettskyet", partlycloudy: "Delvis skyet", cloudy: "Skyet", fog: "Tåke",
  lightrain: "Lett regn", rain: "Regn", heavyrain: "Kraftig regn", lightrainshowers: "Regnbyger", rainshowers: "Regnbyger",
  heavyrainshowers: "Kraftige regnbyger", lightsleet: "Sludd", sleet: "Sludd", heavysleet: "Sludd", lightsnow: "Lett snø",
  snow: "Snø", heavysnow: "Mye snø", snowshowers: "Snøbyger", lightsnowshowers: "Snøbyger", sleetshowers: "Sluddbyger",
  rainandthunder: "Regn og torden", lightrainshowersandthunder: "Byger og torden",
};
export function værTekst(symbol) {
  if (!symbol) return "";
  return VÆRTEKST[symbol.replace(/_(day|night|polartwilight)$/, "")] || "";
}

export function useVær() {
  const [vær, setVær] = useState(null);
  useEffect(() => {
    fetch("/api/vaer").then(r => (r.ok ? r.json() : null)).then(setVær).catch(() => setVær(null));
  }, []);
  return vær;
}

export function Tilbake() {
  const { gå } = useApp();
  return (
    <button type="button" className="ikonknapp" aria-label="Tilbake" onClick={() => (history.length > 1 ? history.back() : gå("/"))}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
    </button>
  );
}
