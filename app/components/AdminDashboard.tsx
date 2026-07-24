import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, BarChart3, MessageSquare, AlertTriangle, ThumbsUp, Map as MapIcon, Plus, Server, Smartphone } from "lucide-react";
import { adminApi as api } from "../lib/adminApi";
import { AdminMapEditor } from "./AdminMapEditor";
import { IntentOnboarding } from "./IntentOnboarding";
import { SystemPanel } from "./SystemPanel";

interface AdminDashboardProps {
  onClose: () => void;
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [today, setToday] = useState<any>(null);
  const [feedbackStats, setFeedbackStats] = useState<any>(null);
  const [fallbacks, setFallbacks] = useState<any[]>([]);
  const [devices, setDevices] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMapEditor, setShowMapEditor] = useState(false);
  const [showIntentOnboarding, setShowIntentOnboarding] = useState(false);
  const [showSystem, setShowSystem] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, f, fb, dv] = await Promise.all([
          api.getTodayStats().catch(() => null),
          api.getFeedbackStats().catch(() => null),
          api.getFallbacks(20).catch(() => null),
          api.getDeviceStats(30).catch(() => null),
        ]);
        if (cancelled) return;
        setToday(t);
        setFeedbackStats(f);
        setFallbacks(Array.isArray(fb) ? fb : fb?.fallbacks ?? []);
        setDevices(dv);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col bg-white"
    >
      <div className="flex flex-shrink-0 items-center justify-between bg-gradient-to-r from-green-600 to-green-700 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <BarChart3 className="h-5 w-5 flex-shrink-0 text-white sm:h-6 sm:w-6" />
          <h2 className="truncate text-lg text-white sm:text-xl">Sevi Admin Dashboard</h2>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            onClick={() => setShowSystem(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/20 px-3 text-xs font-medium text-white transition-colors hover:bg-white/30 sm:text-sm"
            title="System status, LLM toggle, and moderation feed"
          >
            <Server className="h-4 w-4" />
            System
          </button>
          <button
            onClick={() => setShowIntentOnboarding(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/20 px-3 text-xs font-medium text-white transition-colors hover:bg-white/30 sm:text-sm"
            title="Onboard a new intent with sanitation checks"
          >
            <Plus className="h-4 w-4" />
            New Intent
          </button>
          <button
            onClick={() => setShowMapEditor(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/20 px-3 text-xs font-medium text-white transition-colors hover:bg-white/30 sm:text-sm"
            title="Edit campus map markers"
          >
            <MapIcon className="h-4 w-4" />
            Edit Map
          </button>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showMapEditor && (
          <AdminMapEditor onClose={() => setShowMapEditor(false)} />
        )}
        {showIntentOnboarding && (
          <IntentOnboarding onClose={() => setShowIntentOnboarding(false)} />
        )}
        {showSystem && <SystemPanel onClose={() => setShowSystem(false)} />}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:space-y-6 sm:p-6">
        {loading && <p className="text-gray-500">Loading stats...</p>}
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
            Could not reach API: {error}
          </div>
        )}

        {!loading && (
          <div className="space-y-5 sm:space-y-6">
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              <StatCard
                icon={MessageSquare}
                label="Messages Today"
                value={today?.total_messages ?? today?.messages ?? "-"}
              />
              <StatCard
                icon={ThumbsUp}
                label="Helpful %"
                value={
                  feedbackStats?.helpful_pct !== undefined
                    ? `${Math.round(feedbackStats.helpful_pct)}%`
                    : "-"
                }
              />
              <StatCard
                icon={BarChart3}
                label="Avg Rating"
                value={
                  feedbackStats?.avg_rating !== undefined
                    ? Number(feedbackStats.avg_rating).toFixed(2)
                    : "-"
                }
              />
            </section>

            {devices?.by_class?.length > 0 && (
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm text-gray-700">
                  <Smartphone className="h-4 w-4 text-green-600" />
                  Device usage (last {devices.days} days)
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  <StatCard
                    icon={Smartphone}
                    label="Unique Devices"
                    value={devices.unique_devices ?? "-"}
                  />
                  <StatCard
                    icon={Smartphone}
                    label="On a Phone"
                    value={pct(devices.by_form_factor?.phone, devices.turns_with_device)}
                  />
                  <StatCard
                    icon={Smartphone}
                    label="In Landscape"
                    value={pct(devices.by_orientation?.landscape, devices.turns_with_device)}
                  />
                </div>
                <div className="mt-2 space-y-1">
                  {devices.by_class.map((row: any) => (
                    <div
                      key={row.device_class}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                    >
                      <span className="text-gray-800">{row.device_class}</span>
                      <span className="text-xs text-gray-600">
                        {row.turns} turns | {row.devices} devices
                      </span>
                    </div>
                  ))}
                </div>
                {devices.turns_without_device > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    {devices.turns_without_device} of {devices.total_turns} turns carry no
                    device id (older clients, or the API called directly) and are excluded
                    from the percentages above.
                  </p>
                )}
              </section>
            )}

            {feedbackStats?.low_rated_intents?.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm text-gray-700">Low-Rated Intents</h3>
                <div className="space-y-2">
                  {feedbackStats.low_rated_intents.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-sm text-amber-900">{item.intent}</span>
                      <span className="text-xs text-amber-700">
                        avg {Number(item.avg_rating).toFixed(2)} | {item.count} ratings
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm text-gray-700">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Recent Fallbacks (training gaps)
              </h3>
              {fallbacks.length === 0 ? (
                <p className="text-sm text-gray-500">No recent fallbacks.</p>
              ) : (
                <div className="space-y-2">
                  {fallbacks.slice(0, 10).map((fallback: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800"
                    >
                      "{fallback.message ?? fallback.user_message ?? fallback.text ?? JSON.stringify(fallback)}"
                    </div>
                  ))}
                </div>
              )}
            </section>

            {feedbackStats?.recent_comments?.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm text-gray-700">Recent Comments</h3>
                <div className="space-y-2">
                  {feedbackStats.recent_comments.map((comment: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-sm text-gray-800">"{comment.comment}"</p>
                      {comment.intent && (
                        <p className="mt-1 text-xs text-gray-500">on {comment.intent}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Share of `total` as a whole-number percent, or "-" when there is nothing
 *  to divide by (an empty window would otherwise read as a confident 0%). */
function pct(part: number | undefined, total: number | undefined): string {
  if (!total || part === undefined) return "-";
  return `${Math.round((part / total) * 100)}%`;
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-4">
      <div className="mb-2 flex items-center gap-2 text-green-700">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl text-gray-900">{value}</p>
    </div>
  );
}
