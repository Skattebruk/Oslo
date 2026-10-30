// Været i Oslo sentrum fra MET Norge (api.met.no). Mellomlagres i 30 min.
// MET krever en identifiserende User-Agent.
export default async function handler(req, res) {
  try {
    const svar = await fetch("https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.913&lon=10.752", {
      headers: { "user-agent": "oslo-app/1.0 github.com/Skattebruk/oslo" },
    });
    if (!svar.ok) throw new Error("MET " + svar.status);
    const d = await svar.json();
    const nå = d.properties.timeseries[0];
    const neste = nå.data.next_1_hours || nå.data.next_6_hours || {};
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
    return res.status(200).json({
      temp: nå.data.instant.details.air_temperature,
      symbol: neste.summary?.symbol_code || null,
      nedbør: neste.details?.precipitation_amount ?? null,
      tid: nå.time,
    });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ feil: "Fikk ikke hentet været" });
  }
}
