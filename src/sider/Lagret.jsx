import { useEffect } from "react";
import { useApp, Lenke } from "../App";
import { StedKort } from "../komponenter";

export default function Lagret() {
  const { lagret, sted, lastet } = useApp();
  useEffect(() => { document.title = "Lagret – Oslo"; }, []);
  const liste = lagret.map(sted).filter(Boolean);
  return (
    <div className="side">
      <header className="topp topp-liste"><h1>Lagret</h1></header>
      {liste.length ? (
        <div className="liste">{liste.map(s => <StedKort key={s.id} s={s} visPris={s.k === "barer"} />)}</div>
      ) : lastet ? (
        <div className="tom-boks">
          <strong>Ingen lagrede steder</strong>
          <p>Trykk på hjertet på et sted for å lagre det her. Listen lagres bare på denne enheten.</p>
          <Lenke til="/" className="knapp">Utforsk Oslo</Lenke>
        </div>
      ) : null}
    </div>
  );
}
