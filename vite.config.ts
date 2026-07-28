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
  // Use process.env to avoid loadEnv path-mangling on Windows/Git Bash.
  //
  // Because this reads process.env and NOT loadEnv, VITE_BASE_PATH cannot be
  // set in any .env file — putting it there is silently ignored. The only two
  // setters are .github/workflows/deploy.yml (/diwa/) and Dockerfile (/).
  //
  // index.html consumes this as %BASE_URL% for the widget's data-diwa-url, and
  // Vite rewrites root-relative hrefs (favicons, /widget.js) against it.
  const base = process.env.VITE_BASE_PATH || "/";
  // Printed so a wrong base is visible in the build log instead of showing up
  // as 404s after deploy.
  console.log(`[vite] base = ${base}`);

  // Dev/preview parity with production nginx, which serves /admin/ from
  // admin.html (deploy/nginx.conf). Without this the dev server's SPA fallback
  // answers /admin/ with index.html — i.e. the public chat app — which looks
  // like the admin entry is broken locally when it isn't.
  const rewriteAdmin = (req: any, _res: any, next: any) => {
    // Match on the pathname so a query string (?foo=1) still resolves.
    const [pathname] = String(req.url || "").split("?");
    if (pathname === "/admin" || pathname === "/admin/") req.url = "/admin/index.html";
    next();
  };
  const adminPathParity = {
    name: "admin-path-parity",
    configureServer(server: any) { server.middlewares.use(rewriteAdmin); },
    configurePreviewServer(server: any) { server.middlewares.use(rewriteAdmin); },
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
        // The admin entry lives at admin/index.html, NOT admin.html, so the
        // build emits dist/admin/index.html. A static host (GitHub Pages)
        // resolves /admin/ to that directory index on its own; emitting
        // admin.html at the root instead meant /admin/ 404'd there — and since
        // the Pages workflow serves index.html as its 404 page, the operator
        // silently landed back on the public chat app.
        input: {
          main: path.resolve(__dirname, "index.html"),
          admin: path.resolve(__dirname, "admin/index.html"),
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
