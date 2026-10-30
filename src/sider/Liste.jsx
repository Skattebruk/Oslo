import { useEffect, useMemo, useState } from "react";
import { useApp } from "../App";
import { KAT, status, avstand } from "../data";
import { StedKort, prisFor, Tilbake } from "../komponenter";

const norm = t => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function Liste({ kategori, gratis, sok, q }) {
  const { steder, lastet, priser, posisjon, finnPosisjon, posFeil, nå } = useApp();
  const kat = kategori ? KAT[kategori] : null;
  const erBar = kategori === "barer";
  const [aapen, setAapen] = useState(q.get("aapen") === "1");
  const [ute, setUte] = useState(q.get("ute") === "1");
  const [type, setType] = useState(q.get("type") || "");
  const [sort, setSort] = useState(q.get("sort") || (erBar ? "pris" : "navn"));
  const [tekst, setTekst] = useState(sok || "");
  const [vis, setVis] = useState(50);

  const tittel = sok ? `Søk: ${sok}` : gratis ? "Gratis" : kat?.navn || "Steder";
  useEffect(() => { document.title = `${tittel} – Oslo`; }, [tittel]);

  // Hold filtrene i adressefeltet, så lenker kan deles
  useEffect(() => {
    const p = new URLSearchParams();
    if (sok) p.set("q", sok);
    if (aapen) p.set("aapen", "1");
    if (ute) p.set("ute", "1");
    if (type) p.set("type", type);
    if (sort && sort !== (erBar ? "pris" : "navn")) p.set("sort", sort);
    const s = p.toString();
    history.replaceState(null, "", window.location.pathname + (s ? "?" + s : ""));
  }, [aapen, ute, type, sort, sok, erBar]);

  useEffect(() => { if (sort === "naer" && !posisjon) finnPosisjon(); }, [sort, posisjon, finnPosisjon]);

  const grunnlag = useMemo(() => {
    if (sok) {
      const n = norm(sok);
      return steder.filter(s => norm(s.n).includes(n) || norm(s.t).includes(n) || (s.a && norm(s.a).includes(n)) || (s.c && norm(s.c).includes(n)));
    }
    if (gratis) return steder.filter(s => s.g);
    return steder.filter(s => s.k === kategori);
  }, [steder, kategori, gratis, sok]);

  const typer = useMemo(() => {
    const m = {};
    grunnlag.forEach(s => { m[s.t] = (m[s.t] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [grunnlag]);

  const liste = useMemo(() => {
    const n = norm(tekst && !sok ? tekst : "");
    let l = grunnlag.filter(s =>
      (!aapen || status(s, nå).aapen) &&
      (!ute || s.ute) &&
      (!type || s.t === type) &&
      (!n || norm(s.n).includes(n) || (s.a && norm(s.a).includes(n))));
    if (sort === "naer" && posisjon) {
      l = l.map(s => [s, avstand(posisjon, s)]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
    } else if (sort === "pris") {
      const p = s => prisFor(priser, s.id)?.pris ?? Infinity;
      l = [...l].sort((a, b) => p(a) - p(b) || a.n.localeCompare(b.n, "nb"));
    } else if (sort === "sent") {
      const m = s => { const st = status(s, nå); return st.aapen ? st.stengerMin : -1; };
      l = [...l].sort((a, b) => m(b) - m(a));
    }
    return l;
  }, [grunnlag, aapen, ute, type, tekst, sok, sort, posisjon, priser, nå]);

  const sorteringer = [
    ...(erBar ? [["pris", "Billigst øl"]] : []),
    ["navn", "A–Å"], ["naer", "Nærmest"],
    ...(["barer", "mat", "kafeer"].includes(kategori) ? [["sent", "Åpent lengst"]] : []),
  ];

  return (
    <div className="side">
      <header className="topp topp-liste">
        <Tilbake />
        <h1>{tittel}</h1>
        <span className="liten">{lastet ? `${liste.length} treff` : "Laster …"}</span>
      </header>

      {!sok ? (
        <div className="sok sok-liten">
          <label htmlFor="filtrer" className="skjult">Filtrer på navn eller adresse</label>
          <input id="filtrer" type="search" value={tekst} onChange={e => { setTekst(e.target.value); setVis(50); }} placeholder={`Søk i ${tittel.toLowerCase()}`} />
        </div>
      ) : null}

      <div className="brikker" role="group" aria-label="Sorter">
        {sorteringer.map(([k, navn]) => (
          <button key={k} type="button" className={"brikke" + (sort === k ? " valgt" : "")} aria-pressed={sort === k} onClick={() => setSort(k)}>{navn}</button>
        ))}
      </div>
      {sort === "naer" && posFeil ? <p className="feil">{posFeil}</p> : null}

      <div className="brikker" role="group" aria-label="Filtre">
        {kategori !== "parker" && kategori !== "utsikt" && kategori !== "lekeplasser" && !gratis ? (
          <button type="button" className={"brikke" + (aapen ? " valgt" : "")} aria-pressed={aapen} onClick={() => setAapen(!aapen)}>Åpent nå</button>
        ) : null}
        {["barer", "mat", "kafeer"].includes(kategori) ? (
          <button type="button" className={"brikke" + (ute ? " valgt" : "")} aria-pressed={ute} onClick={() => setUte(!ute)}>Uteservering</button>
        ) : null}
        {typer.length > 1 ? typer.map(([t, n]) => (
          <button key={t} type="button" className={"brikke" + (type === t ? " valgt" : "")} aria-pressed={type === t} onClick={() => setType(type === t ? "" : t)}>{t} <span className="brikke-antall">{n}</span></button>
        )) : null}
      </div>

      {aapen ? <p className="liten hint">Viser bare steder der åpningstidene er registrert og som er åpne nå.</p> : null}
      {erBar && sort === "pris" ? <p className="liten hint">Ølpriser meldes inn av brukere. Barer uten pris står til slutt.</p> : null}

      <div className="liste">
        {liste.slice(0, vis).map(s => <StedKort key={s.id} s={s} visPris={erBar} />)}
      </div>
      {liste.length > vis ? <button type="button" className="knapp bred" onClick={() => setVis(vis + 50)}>Vis flere ({liste.length - vis} til)</button> : null}
      {lastet && liste.length === 0 ? <p className="tom">Ingen steder passer med filtrene.</p> : null}
    </div>
  );
}
