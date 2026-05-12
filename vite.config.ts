import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app"),
    },
  },
  server: {
    // `true` allows any Host header — needed for sharing the dev server
    // via Cloudflare Tunnel / ngrok / LocalTunnel without pre-registering
    // each generated subdomain.
    allowedHosts: true,
    // Proxy /api → local SeviAI server so the chat works over the same
    // tunnel as the web UI (the browser never has to reach the API host
    // directly, which is what made tunneled chat hang).
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
