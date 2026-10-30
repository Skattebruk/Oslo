import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Oslo – barer, mat, parker og ting å gjøre",
        short_name: "Oslo",
        description: "Hva er åpent nå, gratis eller nær deg i Oslo.",
        lang: "nb",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          { src: "/ikon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/ikon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//, /^\/data\//],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname === "/data/steder.json", handler: "StaleWhileRevalidate", options: { cacheName: "steder" } },
          { urlPattern: ({ url }) => url.pathname.startsWith("/api/"), handler: "NetworkFirst", options: { cacheName: "api", networkTimeoutSeconds: 4 } },
          { urlPattern: ({ url }) => url.hostname === "tile.openstreetmap.org", handler: "CacheFirst", options: { cacheName: "kartfliser", expiration: { maxEntries: 400, maxAgeSeconds: 7 * 86400 } } },
        ],
      },
    }),
  ],
});
