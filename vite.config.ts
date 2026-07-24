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

  // Dev/preview parity with production nginx, which serves /admin/ from
  // admin.html (deploy/nginx.conf). Without this the dev server's SPA fallback
  // answers /admin/ with index.html — i.e. the public chat app — which looks
  // like the admin entry is broken locally when it isn't.
  const adminPathParity = {
    name: "admin-path-parity",
    configureServer(server: any) {
      server.middlewares.use((req: any, _res: any, next: any) => {
        if (req.url === "/admin/" || req.url === "/admin") req.url = "/admin.html";
        next();
      });
    },
    configurePreviewServer(server: any) {
      server.middlewares.use((req: any, _res: any, next: any) => {
        if (req.url === "/admin/" || req.url === "/admin") req.url = "/admin.html";
        next();
      });
    },
  };

  return {
    base,
    plugins: [react(), tailwindcss(), adminPathParity],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./app"),
      },
    },
    build: {
      rollupOptions: {
        // Two independent entries. The admin app is NOT a chunk of the chat
        // app — it has its own HTML entry and its own bundle, so the public
        // chat bundle ships zero admin code. See app/admin/main.tsx.
        input: {
          main: path.resolve(__dirname, "index.html"),
          admin: path.resolve(__dirname, "admin.html"),
        },
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
