import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const fixture = readFileSync(new URL("./fixture.json", import.meta.url), "utf8");

test.beforeEach(async ({ page }) => {
  await page.route("**/data/steder.json", r => r.fulfill({ contentType: "application/json", body: fixture }));
  await page.route("**/api/priser", r => r.request().method() === "GET"
    ? r.fulfill({ contentType: "application/json", body: JSON.stringify({ n3: { pris: 59, dato: "2026-10-29T18:00:00Z", n: 3 }, n1: { pris: 89, dato: "2026-10-28T18:00:00Z", n: 1 } }) })
    : r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ feil: "Prisinnmelding er ikke slått på ennå." }) }));
  await page.route("**/api/vaer", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ temp: 7.4, symbol: "cloudy" }) }));
  await page.route("https://tile.openstreetmap.org/**", r => r.fulfill({ status: 204 }));
  await page.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 204 }));
});

test("forsiden viser kategorier med antall og billigst øl", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Oslo" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Barer\s*3/ })).toBeVisible();
  await expect(page.getByText("Billigbaren")).toBeVisible();
  await expect(page.getByText("7°")).toBeVisible();
});

test("barlisten sorterer på billigst øl og filtrerer på åpent nå", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-30T21:00:00+01:00"));
  await page.goto("/k/barer");
  const kort = page.getByTestId("sted");
  await expect(kort).toHaveCount(3);
  await expect(kort.first()).toContainText("Billigbaren");
  await expect(kort.first()).toContainText("59 kr");
  await page.getByRole("button", { name: "Åpent nå" }).click();
  await expect(kort).toHaveCount(2);
  await expect(page).toHaveURL(/aapen=1/);
});

test("stedsiden viser åpningstider, lagring og prisskjema", async ({ page }) => {
  await page.goto("/sted/n1");
  await expect(page.getByRole("heading", { name: "Testbar Nord" })).toBeVisible();
  await expect(page.getByText("Åpent hele døgnet").first()).toBeVisible();
  await page.getByRole("button", { name: "Lagre" }).click();
  await page.getByRole("link", { name: "Lagret" }).click();
  await expect(page.getByTestId("sted")).toHaveCount(1);
  await page.goto("/sted/n1");
  await page.getByRole("button", { name: /Meld inn/ }).click();
  await page.getByLabel("Hva koster en halvliter pils her?").fill("10");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("mellom 20 og 250")).toBeVisible();
});

test("gratis-siden viser bare gratis steder", async ({ page }) => {
  await page.goto("/gratis");
  await expect(page.getByTestId("sted")).toHaveCount(4);
});

test("bar åpen over midnatt viser riktig stengetid", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-30T21:00:00+01:00"));
  await page.goto("/sted/n3");
  await expect(page.getByText("Åpen til 03:30").first()).toBeVisible();
});

test("søk finner steder", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Søk etter steder").fill("museet");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/sok\?q=museet/);
  await expect(page.getByTestId("sted")).toHaveCount(1);
});

test("kartet laster med markører", async ({ page }) => {
  await page.goto("/kart");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.getByText("3 steder")).toBeVisible();
});
