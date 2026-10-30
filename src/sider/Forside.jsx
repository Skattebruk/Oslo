import { useEffect, useMemo, useState } from "react";
import { useApp, Lenke } from "../App";
import { KATEGORIER, status, avstand } from "../data";
import { StedKort, prisFor, useVær, værTekst } from "../komponenter";

const regnvær = s => /rain|sleet|snow|thunder/.test(s || "");

export default function Forside() {
  const { steder, lastet, priser, posisjon, finnPosisjon, posFeil, nå, gå } = useApp();
  const vær = useVær();
  const [sok, setSok] = useState("");
  useEffect(() => { document.title = "Oslo – barer, mat, parker og ting å gjøre"; }, []);

  const antall = useMemo(() => steder.reduce((m, s) => ((m[s.k] = (m[s.k] || 0) + 1), m), {}), [steder]);

  const billigst = useMemo(() => steder
    .filter(s => s.k === "barer" && prisFor(priser, s.id))
    .sort((a, b) => priser[a.id].pris - priser[b.id].pris)
    .slice(0, 5), [steder, priser]);

  const aapentNær = useMemo(() => {
    if (!posisjon) return [];
    return steder
      .filter(s => ["barer", "mat", "kafeer"].includes(s.k) && status(s, nå).aapen)
      .map(s => ({ s, m: avstand(posisjon, s) }))
      .sort((a, b) => a.m - b.m).slice(0, 6).map(x => x.s);
  }, [steder, posisjon, nå]);

  const regn = regnvær(vær?.symbol);
  const forslag = useMemo(() => {
    const kat = regn ? ["museer", "aktiviteter", "kafeer"] : ["parker", "utsikt", "bading"];
    const utvalg = steder.filter(s => kat.includes(s.k) && (regn || s.g));
    // Stabil «tilfeldig» rekkefølge per dag
    const dag = nå.toDateString();
    const h = str => [...(str + dag)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    return utvalg.sort((a, b) => h(a.id) - h(b.id)).slice(0, 8);
  }, [steder, regn, nå]);

  const time = nå.getHours();
  const hilsen = time < 5 ? "God natt" : time < 10 ? "God morgen" : time < 17 ? "Hei" : "God kveld";

  return (
    <div className="side">
      <header className="topp">
        <div>
          <p className="liten">{nå.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" })} · {nå.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}</p>
          <h1 className="logo">Oslo</h1>
        </div>
        {vær ? (
          <div className="vær" title="Været i Oslo sentrum (MET Norge)">
            <strong>{Math.round(vær.temp)}°</strong>
            <span>{værTekst(vær.symbol)}</span>
          </div>
        ) : null}
      </header>

      <p className="hilsen">{hilsen}! {regn ? "Det regner – her er noe å gjøre inne." : "Hva har du lyst til i dag?"}</p>

      <form className="sok" role="search" onSubmit={e => { e.preventDefault(); if (sok.trim()) gå(`/sok?q=${encodeURIComponent(sok.trim())}`); }}>
        <label htmlFor="sok" className="skjult">Søk etter steder</label>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input id="sok" type="search" value={sok} onChange={e => setSok(e.target.value)} placeholder="Bar, park, restaurant, gate …" />
      </form>

      <div className="brikker">
        <Lenke til="/k/barer?aapen=1" className="brikke">Barer åpne nå</Lenke>
        <Lenke til="/k/mat?aapen=1" className="brikke">Mat nå</Lenke>
        <Lenke til="/gratis" className="brikke">Gratis</Lenke>
        <button type="button" className="brikke" onClick={finnPosisjon}>{posisjon ? "Posisjon funnet" : "Nær meg"}</button>
      </div>
      {posFeil ? <p className="feil">{posFeil}</p> : null}

      <h2>Kategorier</h2>
      <div className="kategorier">
        {KATEGORIER.map(k => (
          <Lenke key={k.id} til={`/k/${k.id}`} className="kategori" style={{ background: k.bunn }}>
            <span className="kategori-ikon" style={{ color: k.farge }} aria-hidden="true">{k.kort}</span>
            <span className="kategori-navn">{k.navn}</span>
            <span className="kategori-antall">{lastet ? (antall[k.id] || 0) : "…"}</span>
          </Lenke>
        ))}
      </div>

      {posisjon && aapentNær.length > 0 ? (
        <section>
          <div className="seksjon-topp"><h2>Åpent nær deg</h2><Lenke til="/k/mat?aapen=1&sort=naer">Se flere</Lenke></div>
          <div className="liste">{aapentNær.map(s => <StedKort key={s.id} s={s} />)}</div>
        </section>
      ) : null}

      <section>
        <div className="seksjon-topp"><h2>Billigst øl</h2><Lenke til="/k/barer?sort=pris">Alle barer</Lenke></div>
        {billigst.length ? (
          <div className="liste">{billigst.map(s => <StedKort key={s.id} s={s} visPris />)}</div>
        ) : (
          <div className="tom-boks">
            <strong>Ingen ølpriser ennå</strong>
            <p>Prisene kommer fra brukerne. Er du på en bar? Åpne baren i appen og meld inn hva en halvliter koster.</p>
            <Lenke til="/k/barer" className="knapp">Finn baren</Lenke>
          </div>
        )}
      </section>

      <section>
        <div className="seksjon-topp"><h2>{regn ? "Ting å gjøre inne" : "Gratis å gjøre"}</h2><Lenke til={regn ? "/k/museer" : "/gratis"}>Se alle</Lenke></div>
        <div className="karusell">
          {forslag.map(s => (
            <Lenke key={s.id} til={`/sted/${s.id}`} className="karusell-kort">
              <span className="karusell-type">{s.t}{s.g ? " · gratis" : ""}</span>
              <span className="karusell-navn">{s.n}</span>
            </Lenke>
          ))}
          {!lastet ? <span className="laster">Laster …</span> : null}
        </div>
      </section>

      <footer className="bunntekst">
        <Lenke til="/om">Om appen og kildene</Lenke>
        <p>Steder og åpningstider: © OpenStreetMap-bidragsytere. Vær: MET Norge.</p>
      </footer>
    </div>
  );
}
