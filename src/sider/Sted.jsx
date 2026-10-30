import { useEffect, useState } from "react";
import { useApp, Lenke } from "../App";
import { KAT, status, uke, avstand, avstandTekst, osmLenke } from "../data";
import { prisFor, Tilbake } from "../komponenter";

export default function Sted({ id }) {
  const { sted, lastet, nå, posisjon, lagret, byttLagret, priser, setPriser } = useApp();
  const s = sted(id);
  useEffect(() => { if (s) document.title = `${s.n} – Oslo`; }, [s]);

  if (!s) {
    return (
      <div className="side">
        <header className="topp topp-liste"><Tilbake /><h1>{lastet ? "Fant ikke stedet" : "Laster …"}</h1></header>
        {lastet ? <p>Stedet finnes ikke lenger i dataene. <Lenke til="/">Til forsiden</Lenke></p> : null}
      </div>
    );
  }

  const kat = KAT[s.k];
  const st = status(s, nå);
  const tider = uke(s, nå);
  const m = avstand(posisjon, s);
  const erLagret = lagret.includes(s.id);
  const pris = prisFor(priser, s.id);
  const nettside = s.w && !/^https?:\/\//.test(s.w) ? "https://" + s.w : s.w;

  return (
    <div className="side">
      <div className="sted-topp" style={{ background: kat?.bunn }}>
        <Tilbake />
        <button type="button" className={"ikonknapp" + (erLagret ? " lagret" : "")} aria-label={erLagret ? "Fjern fra lagret" : "Lagre"} aria-pressed={erLagret} onClick={() => byttLagret(s.id)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={erLagret ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" /></svg>
        </button>
        <span className="sted-kat" style={{ color: kat?.farge }}>{kat?.navn}</span>
      </div>

      <h1 className="sted-navn">{s.n}</h1>
      <p className="liten">{[s.t, s.c, s.a, avstandTekst(m)].filter(Boolean).join(" · ")}</p>
      <p className={"status stor " + (st.aapen ? (st.snart ? "snart" : "aapen") : st.kjent ? "stengt" : "ukjent")}>{st.tekst}</p>
      <div className="merker">
        {s.g ? <span className="merke gratis">Gratis</span> : null}
        {s.ute ? <span className="merke">Uteservering</span> : null}
        {s.rull ? <span className="merke">Tilgjengelig for rullestol</span> : null}
      </div>
      {s.d ? <p className="beskrivelse">{s.d}</p> : null}

      <div className="knapper">
        <a className="knapp mørk" href={`https://www.google.com/maps/dir/?api=1&destination=${s.la},${s.lo}`} target="_blank" rel="noopener noreferrer">Veibeskrivelse</a>
        <Lenke className="knapp" til={`/kart?sted=${s.id}`}>Vis i kart</Lenke>
        {nettside ? <a className="knapp" href={nettside} target="_blank" rel="noopener noreferrer">Nettside</a> : null}
        {s.p ? <a className="knapp" href={`tel:${s.p.replace(/\s/g, "")}`}>Ring</a> : null}
      </div>

      {s.k === "barer" ? <Priser s={s} pris={pris} setPriser={setPriser} /> : null}

      <section>
        <h2>Åpningstider</h2>
        {tider ? (
          <dl className="tider">
            {tider.map(r => (
              <div key={r.dag} className={r.idag ? "idag" : ""}><dt>{r.idag ? "I dag" : r.dag}</dt><dd>{r.tekst}</dd></div>
            ))}
          </dl>
        ) : <p className="liten">{s.oh ? `Registrert som «${s.oh}», men kunne ikke leses.` : "Ikke registrert. Sjekk stedets nettside."}</p>}
        <p className="liten hint">Åpningstider fra OpenStreetMap kan avvike på helligdager.</p>
      </section>

      <section className="kilde">
        <p>Feil eller mangler? Alle kan rette informasjonen på <a href={osmLenke(s.id)} target="_blank" rel="noopener noreferrer">OpenStreetMap</a>. Rettelser kommer med i appen neste natt.</p>
      </section>
    </div>
  );
}

function Priser({ s, pris, setPriser }) {
  const [åpen, setÅpen] = useState(false);
  const [verdi, setVerdi] = useState("");
  const [svar, setSvar] = useState(null);

  async function send(e) {
    e.preventDefault();
    const tall = Number(verdi.replace(",", "."));
    if (!Number.isFinite(tall) || tall < 20 || tall > 250) { setSvar({ feil: "Skriv en pris mellom 20 og 250 kr." }); return; }
    setSvar({ laster: true });
    try {
      const r = await fetch("/api/priser", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: s.id, pris: Math.round(tall) }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setPriser(p => ({ ...p, [s.id]: d.pris }));
        setSvar({ ok: true });
        setVerdi("");
      } else {
        setSvar({ feil: d.feil || "Kunne ikke lagre prisen nå." });
      }
    } catch {
      setSvar({ feil: "Ingen nettforbindelse." });
    }
  }

  return (
    <section>
      <div className="seksjon-topp"><h2>Ølpris</h2>{pris ? <span className="liten">Sist meldt {new Date(pris.dato).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })} · {pris.n} {pris.n === 1 ? "melding" : "meldinger"}</span> : null}</div>
      <div className="prisboks">
        <span>Pils 0,5 l</span>
        <strong>{pris ? `${pris.pris} kr` : "Ingen pris ennå"}</strong>
      </div>
      {!åpen ? (
        <button type="button" className="knapp stiplet bred" onClick={() => setÅpen(true)}>{pris ? "Har prisen endret seg? Meld inn" : "Vet du prisen? Meld inn"}</button>
      ) : (
        <form className="prisskjema" onSubmit={send}>
          <label htmlFor="pris">Hva koster en halvliter pils her?</label>
          <div className="rad">
            <input id="pris" inputMode="decimal" value={verdi} onChange={e => setVerdi(e.target.value)} placeholder="f.eks. 89" autoComplete="off" />
            <span>kr</span>
            <button type="submit" className="knapp mørk" disabled={svar?.laster}>{svar?.laster ? "Sender …" : "Send"}</button>
          </div>
          {svar?.feil ? <p className="feil">{svar.feil}</p> : null}
          {svar?.ok ? <p className="ok">Takk! Prisen er oppdatert.</p> : null}
          <p className="liten hint">Vi viser medianen av de siste innmeldingene. Ingen personopplysninger lagres.</p>
        </form>
      )}
    </section>
  );
}
