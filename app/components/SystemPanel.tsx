import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, RefreshCw, Cpu, ShieldAlert, Activity, Server } from "lucide-react";
import {
  adminApi as api,
  type AdminStatus,
  type LlmConfig,
  type ModerationSnapshot,
} from "@/lib/adminApi";

interface SystemPanelProps {
  onClose: () => void;
}

// The dashboard's unlock already established an httpOnly admin session cookie,
// so this panel loads straight away — no PIN is stored or re-prompted.

/**
 * Operational panel for the admin dashboard: live subsystem status, the
 * runtime LLM toggle (/admin/llm), and the moderation feed (/admin/moderation).
 * Self-contained pin auth (session-scoped) so it doesn't depend on the rest of
 * the dashboard threading the admin pin.
 */
export function SystemPanel({ onClose }: SystemPanelProps) {
  // Empty by default: admin calls now authenticate with the httpOnly session
  // cookie set at unlock, so this panel no longer needs (or keeps) the PIN.
  const [pin] = useState<string>("");
  const [authed, setAuthed] = useState(false);
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [llm, setLlm] = useState<LlmConfig | null>(null);
  const [moderation, setModeration] = useState<ModerationSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (usePin: string) => {
      setBusy(true);
      setError(null);
      try {
        const [s, l, m] = await Promise.all([
          api.getAdminStatus(usePin),
          api.getLlmConfig(usePin),
          api.getModeration(usePin),
        ]);
        setStatus(s);
        setLlm(l);
        setModeration(m);
        setAuthed(true);
      } catch (e: any) {
        setError(
          e?.message?.includes("401")
            ? "Incorrect PIN."
            : e?.message?.includes("503")
              ? "Admin access is not configured on the server (no DASHBOARD_PIN)."
              : (e?.message ?? "Failed to load."),
        );
        setAuthed(false);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchModel = async (provider: string, model?: string) => {
    setBusy(true);
    try {
      const updated = await api.setLlmConfig(pin, { provider, model });
      setLlm(updated);
      // Reflect the change in the status card too.
      await load(pin);
    } catch (e: any) {
      setError(e?.message ?? "Failed to switch model.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="absolute inset-0 z-30 flex flex-col bg-white"
    >
      <div className="flex flex-shrink-0 items-center justify-between bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <Server className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          <h2 className="text-lg text-white sm:text-xl">System</h2>
        </div>
        <div className="flex items-center gap-2">
          {authed && (
            <button
              onClick={() => load(pin)}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/20 px-3 text-xs font-medium text-white transition-colors hover:bg-white/30 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
              Refresh
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6">
        {!authed ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void load("");
            }}
            className="mx-auto mt-8 flex max-w-sm flex-col gap-3"
          >
            <p className="text-sm text-gray-700">
              Couldn't load system status — your admin session may have expired.
              Retry, or sign out and unlock again.
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {busy ? "Checking…" : "Unlock"}
            </button>
          </form>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            {/* LLM toggle */}
            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Cpu className="h-4 w-4" /> Responding model
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <StatusDot ok={!!llm?.available} />
                <span className="text-sm text-slate-800">
                  {llm?.provider === "none"
                    ? "LLM disabled"
                    : `${llm?.provider ?? "?"} · ${llm?.model ?? "—"}`}
                  {llm && !llm.available && llm.provider !== "none" && (
                    <span className="ml-1 text-amber-600">(unreachable)</span>
                  )}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(llm?.ollama_models ?? []).map((m) => (
                  <button
                    key={m}
                    disabled={busy}
                    onClick={() => switchModel("ollama", m)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50 ${
                      llm?.provider === "ollama" && llm?.model === m
                        ? "border-green-600 bg-green-50 text-green-800"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
                <button
                  disabled={busy}
                  onClick={() => switchModel("claude")}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50 ${
                    llm?.provider === "claude"
                      ? "border-green-600 bg-green-50 text-green-800"
                      : "border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Claude
                </button>
                <button
                  disabled={busy}
                  onClick={() => switchModel("none")}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50 ${
                    llm?.provider === "none"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Off
                </button>
              </div>
              {status?.llm.second_opinion && (
                <p className="mt-2 text-xs text-slate-500">Safety LLM second opinion: on</p>
              )}
            </section>

            {/* Subsystem status */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MiniCard icon={Activity} label="Classifier" ok={status?.brain.classifier_ready} />
              <MiniCard icon={Activity} label="Neural net" ok={status?.brain.neural_net_ready} />
              <MiniCard
                icon={Activity}
                label={`Charter (${status?.brain.charter_rag?.chunks ?? 0})`}
                ok={status?.brain.charter_rag?.available}
              />
              <MiniCard
                icon={Server}
                label="AIS bridge"
                ok={status ? !status.ais_bridge?.open : undefined}
                note={status?.ais_bridge?.open ? "circuit open" : "closed"}
              />
              <MiniCard
                icon={Server}
                label="Connectors"
                ok={!!status?.connectors_bridge?.mcp_url}
                note={`${status?.connectors_bridge?.tool_ok ?? 0} ok`}
              />
              <MiniCard
                icon={Activity}
                label="Uptime"
                ok
                note={`${Math.floor((status?.uptime_seconds ?? 0) / 60)}m`}
              />
            </section>

            {/* Moderation feed */}
            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                <ShieldAlert className="h-4 w-4" /> Moderation
              </h3>
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                {Object.entries(moderation?.counts ?? {}).map(([k, v]) => (
                  <span key={k} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                    {k}: <b>{v as number}</b>
                  </span>
                ))}
              </div>
              {moderation?.recent?.length ? (
                <div className="space-y-1.5">
                  {moderation.recent
                    .slice()
                    .reverse()
                    .slice(0, 8)
                    .map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs"
                      >
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 font-medium text-slate-700">
                          {r.category}
                        </span>
                        <span className="truncate text-slate-600">"{r.message}"</span>
                        <span className="ml-auto flex-shrink-0 text-slate-400">{r.at.slice(11)}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No flagged messages.</p>
              )}
              {moderation?.lexicon?.loaded && (
                <p className="mt-2 text-xs text-slate-400">
                  Lexicon v{moderation.lexicon.version} · {moderation.lexicon.entries} entries ·{" "}
                  {moderation.lexicon.forms} forms
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatusDot({ ok }: { ok?: boolean }) {
  const color = ok === undefined ? "bg-slate-300" : ok ? "bg-green-500" : "bg-red-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

function MiniCard({
  icon: Icon,
  label,
  ok,
  note,
}: {
  icon: any;
  label: string;
  ok?: boolean;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="truncate text-xs">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <StatusDot ok={ok} />
        <span className="text-xs text-slate-700">{note ?? (ok ? "ok" : ok === false ? "down" : "—")}</span>
      </div>
    </div>
  );
}
