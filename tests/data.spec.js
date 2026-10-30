import { test, expect } from "@playwright/test";
import { kategori, gratis, tilSteder } from "../scripts/hent-data.mjs";

test("kategorisering av OSM-tagger", () => {
  expect(kategori({ amenity: "pub" })).toBe("barer");
  expect(kategori({ amenity: "fast_food" })).toBe("mat");
  expect(kategori({ leisure: "park" })).toBe("parker");
  expect(kategori({ natural: "beach" })).toBe("bading");
  expect(kategori({ leisure: "sports_centre", sport: "swimming" })).toBe("bading");
  expect(kategori({ leisure: "sports_centre", sport: "soccer" })).toBe(null);
  expect(kategori({ tourism: "museum" })).toBe("museer");
});

test("gratis-regler", () => {
  expect(gratis("parker", {})).toBe(true);
  expect(gratis("museer", {})).toBe(false);
  expect(gratis("museer", { fee: "no" })).toBe(true);
  expect(gratis("bading", { leisure: "sports_centre" })).toBe(false);
});

test("tilSteder tar bare navngitte og fjerner duplikater", () => {
  const el = [
    { type: "node", id: 1, lat: 59.9, lon: 10.7, tags: { amenity: "bar", name: "A", opening_hours: "24/7" } },
    { type: "way", id: 2, center: { lat: 59.9, lon: 10.7 }, tags: { amenity: "bar", name: "A" } },
    { type: "node", id: 3, lat: 59.9, lon: 10.7, tags: { amenity: "bar" } },
  ];
  const s = tilSteder(el);
  expect(s).toHaveLength(1);
  expect(s[0]).toMatchObject({ id: "n1", k: "barer", oh: "24/7" });
});
