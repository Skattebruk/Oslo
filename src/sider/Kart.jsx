import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useApp, Lenke } from "../App";
import { KATEGORIER, KAT, status } from "../data";

function Følg({ punkt, zoom }) {
  const map = useMap();
  useEffect(() => { if (punkt) map.setView([punkt.la, punkt.lo], zoom); }, [punkt, zoom, map]);
  return null;
}

export default function Kart({ q }) {
  const { steder, sted, posisjon, finnPosisjon, nå } = useApp();
  const valgtSted = q.get("sted") ? sted(q.get("sted")) : null;
  const [kat, setKat] = useState(valgtSted ? valgtSted.k : (q.get("k") || "barer"));
  const [aapen, setAapen] = useState(false);
  useEffect(() => { document.title = "Kart – Oslo"; }, []);

  const punkter = useMemo(
    () => steder.filter(s => s.k === kat && (!aapen || status(s, nå).aapen)),
    [steder, kat, aapen, nå],
  );

  return (
    <div className="kartside">
      <div className="kart-filtre">
        <div className="brikker">
          {KATEGORIER.map(k => (
            <button key={k.id} type="button" className={"brikke" + (kat === k.id ? " valgt" : "")} aria-pressed={kat === k.id} onClick={() => setKat(k.id)}>{k.navn}</button>
          ))}
        </div>
        <div className="brikker">
          <button type="button" className={"brikke" + (aapen ? " valgt" : "")} aria-pressed={aapen} onClick={() => setAapen(!aapen)}>Åpent nå</button>
          <button type="button" className="brikke" onClick={finnPosisjon}>Min posisjon</button>
          <span className="liten">{punkter.length} steder</span>
        </div>
      </div>
      <MapContainer center={[59.9139, 10.7522]} zoom={13} preferCanvas className="kart" zoomControl={false}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragsytere'
          maxZoom={19}
        />
        {valgtSted ? <Følg punkt={valgtSted} zoom={17} /> : posisjon ? <Følg punkt={posisjon} zoom={15} /> : null}
        {posisjon ? <CircleMarker center={[posisjon.la, posisjon.lo]} radius={8} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }} /> : null}
        {punkter.map(s => (
          <CircleMarker key={s.id} center={[s.la, s.lo]} radius={s.id === valgtSted?.id ? 10 : 6}
            pathOptions={{ color: "#ffffff", weight: 1.5, fillColor: KAT[s.k].farge, fillOpacity: 0.9 }}>
            <Popup>
              <strong>{s.n}</strong><br />
              <span>{s.t}{s.a ? ` · ${s.a}` : ""}</span><br />
              <span>{status(s, nå).tekst}</span><br />
              <Lenke til={`/sted/${s.id}`}>Se mer</Lenke>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
