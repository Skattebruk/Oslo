/* global process */
// Ølpriser meldt inn av brukere.
// Lagres i Upstash Redis (Vercel Marketplace → Upstash, eller miljøvariablene
// UPSTASH_REDIS_REST_URL og UPSTASH_REDIS_REST_TOKEN). Uten dem er innmelding av.
//
// GET  /api/priser          → { [stedId]: { pris, dato, n } }
// POST /api/priser {id,pris} → { pris: { pris, dato, n } }

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function redis(...kommando) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(kommando),
  });
  if (!r.ok) throw new Error("Redis " + r.status);
  return (await r.json()).result;
}

const median = l => { const s = [...l].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };

export default async function handler(req, res) {
  if (!URL_ || !TOKEN) {
    if (req.method === "GET") return res.status(200).json({});
    return res.status(503).json({ feil: "Prisinnmelding er ikke slått på ennå." });
  }

  if (req.method === "GET") {
    const flat = (await redis("HGETALL", "priser")) || [];
    const ut = {};
    for (let i = 0; i < flat.length; i += 2) { try { ut[flat[i]] = JSON.parse(flat[i + 1]); } catch { /* hopp over */ } }
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(ut);
  }

  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    const id = String(body?.id || "");
    const pris = Number(body?.pris);
    if (!/^[nwr]\d{1,12}$/.test(id)) return res.status(400).json({ feil: "Ukjent sted." });
    if (!Number.isInteger(pris) || pris < 20 || pris > 250) return res.status(400).json({ feil: "Prisen må være mellom 20 og 250 kr." });

    // Enkel misbruksgrense: én innmelding per IP per sted per 10 minutter
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "ukjent";
    const ok = await redis("SET", `rl:${ip}:${id}`, "1", "NX", "EX", "600");
    if (ok !== "OK") return res.status(429).json({ feil: "Du har nettopp meldt inn en pris her. Prøv igjen senere." });

    await redis("LPUSH", `rapporter:${id}`, String(pris));
    await redis("LTRIM", `rapporter:${id}`, "0", "4");
    const siste = ((await redis("LRANGE", `rapporter:${id}`, "0", "4")) || []).map(Number);
    const gammel = await redis("HGET", "priser", id);
    const n = (gammel ? JSON.parse(gammel).n : 0) + 1;
    const ny = { pris: median(siste), dato: new Date().toISOString(), n };
    await redis("HSET", "priser", id, JSON.stringify(ny));
    return res.status(200).json({ pris: ny });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ feil: "Ikke tillatt" });
}
