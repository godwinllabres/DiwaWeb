import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  X,
  ChevronRight,
  Plus,
  Save,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";

interface IntentOnboardingProps {
  readonly onClose: () => void;
}

type Finding = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  detail?: Record<string, any> | null;
};

type Report = {
  candidate_tag: string;
  pattern_count: number;
  response_count: number;
  has_errors: boolean;
  has_warnings: boolean;
  findings: Finding[];
};

function splitLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Full-screen admin form for onboarding a new intent.
 *
 * Flow:
 *   1. Author types a tag + a textarea full of patterns + a textarea full of responses.
 *   2. "Run checks" hits POST /admin/intents/sanitize — every finding is rendered
 *      with severity color (red error / amber warning / blue info).
 *   3. "Save intent" hits POST /admin/intents which re-validates and writes to the
 *      canonical intents JSON. On errors the user can still "Save anyway" via
 *      ?force=true after a confirm dialog.
 *   4. After save: the API tells us to retrain manually. We surface that message
 *      so the admin knows the chatbot isn't routing to the new intent yet.
 */
export function IntentOnboarding({ onClose }: IntentOnboardingProps) {
  const [tag, setTag] = useState("");
  const [patternsRaw, setPatternsRaw] = useState("");
  const [responsesRaw, setResponsesRaw] = useState("");

  const [report, setReport] = useState<Report | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [forcePrompt, setForcePrompt] = useState(false);

  const patterns = useMemo(() => splitLines(patternsRaw), [patternsRaw]);
  const responses = useMemo(() => splitLines(responsesRaw), [responsesRaw]);

  const canSubmit = tag.trim().length > 0 && patterns.length > 0 && responses.length > 0;

  const handleRunChecks = async () => {
    if (!canSubmit || checking) return;
    setChecking(true);
    setError(null);
    setStatus(null);
    try {
      const res = await api.sanitizeCandidateIntent({
        tag: tag.trim(),
        patterns,
        responses,
      });
      setReport(res);
    } catch (e: any) {
      setError(e?.message ?? "Sanitation check failed");
    } finally {
      setChecking(false);
    }
  };

  const performSave = async (force: boolean) => {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await api.createIntent(
        { tag: tag.trim(), patterns, responses },
        { force },
      );
      setReport(res.report);
      setStatus(`Saved intent "${res.tag}". ${res.next_step}`);
      setForcePrompt(false);
    } catch (e: any) {
      // FastAPI 422 with structured detail ships JSON in error.message —
      // surface as much of the report as we can.
      setError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!canSubmit || saving) return;
    // If we already know there are errors, escalate to confirm before
    // calling the server (saves a round-trip).
    if (report?.has_errors) {
      setForcePrompt(true);
      return;
    }
    await performSave(false);
  };

  const groupedFindings = useMemo(() => {
    if (!report) return { error: [], warning: [], info: [] };
    return {
      error: report.findings.filter((f) => f.severity === "error"),
      warning: report.findings.filter((f) => f.severity === "warning"),
      info: report.findings.filter((f) => f.severity === "info"),
    };
  }, [report]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col bg-gray-50"
    >
      <div className="flex flex-shrink-0 flex-col gap-2 bg-gradient-to-r from-green-700 to-green-800 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ShieldCheck className="h-5 w-5 flex-shrink-0 text-white sm:h-6 sm:w-6" />
            <h2 className="truncate text-lg font-semibold text-white sm:text-xl">
              New Intent
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
            aria-label="Close intent onboarding"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-green-100 sm:text-sm">
          <nav className="flex items-center gap-1 truncate" aria-label="Breadcrumb">
            <span>Admin Dashboard</span>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
            <span>Intents</span>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
            <span className="font-semibold text-white">Onboarding</span>
          </nav>
        </div>
      </div>

      {forcePrompt && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">
              Save despite sanitation errors?
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              The check reports {groupedFindings.error.length} error
              {groupedFindings.error.length === 1 ? "" : "s"} (e.g. duplicate
              tag, encoding, or profanity). Saving anyway commits the intent
              to <code>data/cavsu_intents.json</code> and may break routing
              for an existing intent. This action is logged.
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setForcePrompt(false)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => performSave(true)}
                disabled={saving}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save anyway"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Tag
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="snake_case_tag"
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-400"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
            </label>
            <p className="mt-1 text-[11px] text-gray-500">
              Lowercase, alphanumeric + underscore, 3–40 chars, must be unique.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Training patterns
              </label>
              <span className="text-[11px] text-gray-500">{patterns.length} line(s)</span>
            </div>
            <textarea
              value={patternsRaw}
              onChange={(e) => setPatternsRaw(e.target.value)}
              placeholder={"One per line. e.g.:\nWhat are the library hours?\nWhen does the library open?"}
              rows={8}
              className="mt-2 w-full resize-y rounded-md border border-gray-300 px-3 py-2 font-mono text-sm leading-snug text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-400"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Aim for 10+ varied paraphrases. The classifier picks up your phrasing
              patterns, so variety beats volume.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Responses
              </label>
              <span className="text-[11px] text-gray-500">{responses.length} line(s)</span>
            </div>
            <textarea
              value={responsesRaw}
              onChange={(e) => setResponsesRaw(e.target.value)}
              placeholder={"One per line. e.g.:\nThe library is open Mon-Fri 7:30 AM-7 PM…"}
              rows={6}
              className="mt-2 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-snug text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-400"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              At least 3 responses so users don't see the same answer every time.
            </p>
          </section>
        </div>

        <aside className="flex w-full flex-col border-t border-gray-200 bg-white lg:w-[420px] lg:flex-shrink-0 lg:border-l lg:border-t-0">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Sanitation report</h3>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Run checks before saving. Errors block save (override possible).
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleRunChecks}
                disabled={!canSubmit || checking}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {checking ? "Checking…" : "Run checks"}
              </button>
              <button
                onClick={handleSave}
                disabled={!canSubmit || saving}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                title="Run checks first; save when no errors."
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving…" : "Save intent"}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {error && (
              <p className="mb-3 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                {error}
              </p>
            )}
            {status && (
              <p className="mb-3 rounded-md bg-green-50 px-2.5 py-1.5 text-xs text-green-800">
                {status}
              </p>
            )}

            {!report && !error && (
              <p className="text-sm text-gray-500">
                Fill out the form and click <strong>Run checks</strong>. Findings will appear here, color-coded by severity.
              </p>
            )}

            {report && (
              <>
                <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                  <Pill
                    label="Errors"
                    count={groupedFindings.error.length}
                    tone="error"
                  />
                  <Pill
                    label="Warnings"
                    count={groupedFindings.warning.length}
                    tone="warning"
                  />
                  <Pill
                    label="Info"
                    count={groupedFindings.info.length}
                    tone="info"
                  />
                </div>

                {groupedFindings.error.length === 0 &&
                  groupedFindings.warning.length === 0 &&
                  groupedFindings.info.length === 0 && (
                    <p className="rounded-md bg-emerald-50 px-2.5 py-2 text-xs text-emerald-800">
                      ✓ No findings. Safe to save.
                    </p>
                  )}

                <FindingSection title="Errors" findings={groupedFindings.error} tone="error" />
                <FindingSection title="Warnings" findings={groupedFindings.warning} tone="warning" />
                <FindingSection title="Info" findings={groupedFindings.info} tone="info" />
              </>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3 text-[11px] text-gray-600">
            <strong>Note:</strong> Saving writes to{" "}
            <code>data/cavsu_intents.json</code> and rebuilds the SQLite mirror.
            The new intent only goes live after re-training. From the SeviAi
            project root:
            <pre className="mt-1 overflow-x-auto rounded bg-gray-900 px-2 py-1 font-mono text-[10px] text-gray-100">
              python training/train_naive_bayes.py
            </pre>
            then restart the API.
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

function Pill({
  label,
  count,
  tone,
}: {
  readonly label: string;
  readonly count: number;
  readonly tone: "error" | "warning" | "info";
}) {
  const palette =
    tone === "error"
      ? "bg-red-50 text-red-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : "bg-blue-50 text-blue-700";
  return (
    <div className={`rounded-lg px-2 py-1.5 ${palette}`}>
      <p className="text-[10px] uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold leading-none">{count}</p>
    </div>
  );
}

function FindingSection({
  title,
  findings,
  tone,
}: {
  readonly title: string;
  readonly findings: Finding[];
  readonly tone: "error" | "warning" | "info";
}) {
  if (findings.length === 0) return null;
  const Icon = tone === "error" ? AlertOctagon : tone === "warning" ? AlertTriangle : Info;
  const palette =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-blue-200 bg-blue-50 text-blue-900";
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </p>
      <ul className="space-y-1.5">
        {findings.map((f, i) => (
          <li
            key={`${f.code}-${i}`}
            className={`flex gap-2 rounded-md border px-2.5 py-2 ${palette}`}
          >
            <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-snug">{f.message}</p>
              {f.detail?.pattern && (
                <p className="mt-0.5 truncate font-mono text-[10px] opacity-75">
                  {String(f.detail.pattern)}
                </p>
              )}
              <p className="mt-0.5 text-[10px] uppercase tracking-wide opacity-60">
                {f.code}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
