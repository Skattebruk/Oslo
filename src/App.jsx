import { useEffect, useMemo, useState, useCallback, lazy, Suspense, createContext, useContext } from "react";
import { hentSteder, hentPriser, lagrede, byttLagret } from "./data";
import Forside from "./sider/Forside";
import Liste from "./sider/Liste";
import Sted from "./sider/Sted";
import Lagret from "./sider/Lagret";
import Om from "./sider/Om";
const Kart = lazy(() => import("./sider/Kart"));

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

function lesRute() {
  const { pathname, search } = window.location;
  const deler = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  return { deler, q: new URLSearchParams(search) };
}

export function Lenke({ til, children, ...rest }) {
  const { gå } = useApp();
  return (
    <a href={til} onClick={e => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); gå(til); }} {...rest}>
      {children}
    </a>
  );
}

export default function App() {
  const [rute, setRute] = useState(lesRute);
  const [data, setData] = useState({ steder: [], lastet: false });
  const [priser, setPriser] = useState({});
  const [posisjon, setPosisjon] = useState(null);
  const [posFeil, setPosFeil] = useState(null);
  const [lagret, setLagret] = useState(lagrede);
  const [nå, setNå] = useState(() => new Date());

  useEffect(() => {
    hentSteder().then(d => setData({ ...d, steder: d.steder || [], lastet: true }));
    hentPriser().then(setPriser);
    const t = setInterval(() => setNå(new Date()), 60000);
    const pop = () => setRute(lesRute());
    window.addEventListener("popstate", pop);
    return () => { clearInterval(t); window.removeEventListener("popstate", pop); };
  }, []);

  const gå = useCallback(til => {
    history.pushState(null, "", til);
    setRute(lesRute());
    window.scrollTo(0, 0);
  }, []);

  const finnPosisjon = useCallback(() => {
    if (!navigator.geolocation) { setPosFeil("Nettleseren støtter ikke posisjon"); return; }
    navigator.geolocation.getCurrentPosition(
      p => { setPosisjon({ la: p.coords.latitude, lo: p.coords.longitude }); setPosFeil(null); },
      () => setPosFeil("Fikk ikke tilgang til posisjonen din"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  const verdi = useMemo(() => ({
    ...data, priser, setPriser, posisjon, posFeil, finnPosisjon, lagret,
    byttLagret: id => setLagret(byttLagret(id)), nå, gå,
    sted: id => data.steder.find(s => s.id === id),
  }), [data, priser, posisjon, posFeil, finnPosisjon, lagret, nå, gå]);

  const [side, ...rest] = rute.deler;
  let innhold;
  if (!side) innhold = <Forside />;
  else if (side === "k") innhold = <Liste kategori={rest[0]} q={rute.q} key={"k" + rest[0]} />;
  else if (side === "gratis") innhold = <Liste gratis q={rute.q} key="gratis" />;
  else if (side === "sok") innhold = <Liste sok={rute.q.get("q") || ""} q={rute.q} key={"sok" + rute.q.get("q")} />;
  else if (side === "sted") innhold = <Sted id={rest[0]} key={rest[0]} />;
  else if (side === "kart") innhold = <Suspense fallback={<div className="laster">Laster kart …</div>}><Kart q={rute.q} /></Suspense>;
  else if (side === "lagret") innhold = <Lagret />;
  else if (side === "om") innhold = <Om />;
  else innhold = <div className="side"><h1>Fant ikke siden</h1><Lenke til="/">Til forsiden</Lenke></div>;

  const aktiv = !side ? "/" : side === "kart" ? "/kart" : side === "gratis" ? "/gratis" : side === "lagret" ? "/lagret" : null;

  return (
    <Ctx.Provider value={verdi}>
      <div className="app">
        <main className="innhold">{innhold}</main>
        <nav className="bunnmeny" aria-label="Hovedmeny">
          {[["/", "Utforsk", "M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"],
            ["/kart", "Kart", "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"],
            ["/gratis", "Gratis", "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"],
            ["/lagret", "Lagret", "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"]].map(([til, navn, d]) => (
            <Lenke key={til} til={til} className={"fane" + (aktiv === til ? " aktiv" : "")} aria-current={aktiv === til ? "page" : undefined}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
              {navn}
            </Lenke>
          ))}
        </nav>
      </div>
    </Ctx.Provider>
  );
}
