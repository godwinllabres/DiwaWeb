/**
 * Sevi Admin — standalone operator app (Phase 2 of the admin decoupling).
 *
 * This is the root of its OWN Vite entry (admin.html), not a panel inside the
 * chat SPA. The public chat bundle contains no admin code; opening the admin
 * app is a real navigation to /admin/, which loads a separate bundle.
 *
 * It owns the PIN gate that used to live in App.tsx. The PIN is only ever a
 * key to the server-side gate — `require_admin` on the API is the actual
 * authorization boundary, and every admin request carries X-Admin-Pin.
 */
import { useEffect, useState } from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { AdminDashboard } from "../components/AdminDashboard";
import { adminApi, adminUsesPinHeader } from "@/lib/adminApi";

// `import.meta.env` cast the same way api.ts / useAuth.ts do — this project
// doesn't pull in vite/client's ambient types.
const CHAT_URL =
  (import.meta as { env?: Record<string, string | undefined> }).env?.BASE_URL || "/";

export default function AdminApp() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem("admin_authed") === "1",
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // The "unlocked" flag outlives the session it stands for: the admin cookie
  // expires after an hour, and trusting the flag alone would drop the operator
  // into a dashboard whose every request 401s, with no way back to the PIN
  // prompt. Probe the session once on mount and fall back to locked if it is
  // gone.
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    void adminApi
      .getTodayStats()
      .catch(() => {
        if (cancelled) return;
        sessionStorage.removeItem("admin_authed");
        sessionStorage.removeItem("admin_pin");
        setAuthed(false);
        setError("Your admin session expired. Enter the PIN again.");
      });
    return () => { cancelled = true; };
    // Mount-only: re-probing on every state change would spam the endpoint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    const value = pin.trim();
    if (!value) return;
    setLoading(true);
    setError("");
    try {
      // Exchanges the PIN for an httpOnly session cookie. Deliberately does
      // NOT keep the PIN: it used to live in sessionStorage and ride every
      // admin request, so one XSS here lifted the shared secret. Only the
      // "am I unlocked?" flag is stored, and it grants nothing on its own —
      // the server checks the cookie.
      await adminApi.verifyPin(value);
      sessionStorage.setItem("admin_authed", "1");
      // Only a cross-origin deployment (GitHub Pages -> Render) still needs the
      // PIN, because a cookie cannot cross origins there. The same-origin stack
      // stores nothing and relies on the httpOnly cookie.
      if (adminUsesPinHeader) sessionStorage.setItem("admin_pin", value);
      setPin("");
      setAuthed(true);
    } catch {
      setError("That PIN didn't work. Check it and try again.");
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    // Revoke server-side too — clearing local state alone would leave the
    // session token valid for anyone who still holds the cookie.
    void adminApi.logout().catch(() => {});
    sessionStorage.removeItem("admin_authed");
    sessionStorage.removeItem("admin_pin"); // legacy key from before the cookie
    setPin("");
    setAuthed(false);
  };

  if (authed) {
    return <AdminDashboard onClose={signOut} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-700" aria-hidden="true" />
            <h1 className="text-lg font-semibold text-gray-900">Sevi Admin</h1>
          </div>
          <p className="mb-5 text-sm text-gray-500">
            Enter the dashboard PIN to continue.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label htmlFor="admin-pin" className="sr-only">
              Dashboard PIN
            </label>
            <input
              id="admin-pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "admin-pin-error" : undefined}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            {error && (
              <p id="admin-pin-error" role="alert" className="mt-2 text-xs text-red-600">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !pin.trim()}
              className="mt-4 w-full rounded-lg bg-green-700 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Checking…" : "Unlock"}
            </button>
          </form>
        </div>

        <a
          href={CHAT_URL}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 rounded"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Sevi
        </a>
      </div>
    </div>
  );
}
