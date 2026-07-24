/**
 * Entry point for the standalone admin app (admin.html).
 *
 * Separate from app/main.tsx by design — this is what makes the admin bundle
 * independent of the public chat bundle rather than a chunk hanging off it.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../styles/index.css";
import AdminApp from "./AdminApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
