import { useEffect } from "react";
import { useApp } from "../App";
import { Tilbake } from "../komponenter";

export default function Om() {
  const { hentet, steder } = useApp();
  useEffect(() => { document.title = "Om appen – Oslo"; }, []);
  return (
    <div className="side tekstside">
      <header className="topp topp-liste"><Tilbake /><h1>Om appen</h1></header>
      <p>Oslo samler barer, restauranter, kafeer, parker, badeplasser, museer og aktiviteter i hele byen på ett sted, med filtre for det som er åpent nå, gratis eller nær deg.</p>

      <h2>Hvor kommer dataene fra?</h2>
      <ul>
        <li><strong>Steder, adresser og åpningstider:</strong> OpenStreetMap, en åpen kartdatabase som alle kan bidra til. Dataene hentes på nytt hver natt. {steder.length ? `Nå: ${steder.length.toLocaleString("nb-NO")} steder` : ""}{hentet ? `, sist hentet ${new Date(hentet).toLocaleDateString("nb-NO")}` : ""}.</li>
        <li><strong>Ølpriser:</strong> meldt inn av brukerne. Vi viser medianen av de siste innmeldingene og når prisen sist ble meldt.</li>
        <li><strong>Vær:</strong> MET Norge (Meteorologisk institutt).</li>
        <li><strong>Kart:</strong> © OpenStreetMap-bidragsytere.</li>
      </ul>
      <p>«Gratis» betyr at stedet er gratis å besøke: parker, utsiktspunkter, lekeplasser og badeplasser ute, og steder som er registrert uten inngangspenger.</p>

      <h2>Personvern</h2>
      <p>Posisjonen din brukes bare i nettleseren for å regne ut avstander, og sendes ikke til oss. Lagrede steder ligger bare på din enhet. Når du melder inn en pris, lagrer vi bare stedet, prisen og tidspunktet.</p>

      <h2>Installer som app</h2>
      <p>På iPhone: trykk på Del-knappen i Safari og velg «Legg til på Hjem-skjerm». På Android: trykk på menyen i Chrome og velg «Installer app».</p>

      <h2>Kontakt</h2>
      <p>[Fyll inn e-postadresse]</p>
    </div>
  );
}
