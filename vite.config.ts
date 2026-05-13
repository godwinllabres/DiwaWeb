import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  // Load .env / .env.<mode> / .env.local at config time (Vite only auto-loads
  // them for the client bundle, not for vite.config.ts itself).
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8009";

  // GitHub Pages deploys to /<repo-name>/; local dev stays at /
  // Use process.env to avoid loadEnv path-mangling on Windows/Git Bash
  const base = process.env.VITE_BASE_PATH || "/";

  return {
    base,
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
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ""),
        },
      },
    },
  };
});
