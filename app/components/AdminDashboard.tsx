import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, BarChart3, MessageSquare, AlertTriangle, ThumbsUp, Map as MapIcon, Plus } from "lucide-react";
import { api } from "../lib/api";
import { AdminMapEditor } from "./AdminMapEditor";
import { IntentOnboarding } from "./IntentOnboarding";

interface AdminDashboardProps {
  onClose: () => void;
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [today, setToday] = useState<any>(null);
  const [feedbackStats, setFeedbackStats] = useState<any>(null);
  const [fallbacks, setFallbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMapEditor, setShowMapEditor] = useState(false);
  const [showIntentOnboarding, setShowIntentOnboarding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, f, fb] = await Promise.all([
          api.getTodayStats().catch(() => null),
          api.getFeedbackStats().catch(() => null),
          api.getFallbacks(20).catch(() => null),
        ]);
        if (cancelled) return;
        setToday(t);
        setFeedbackStats(f);
        setFallbacks(Array.isArray(fb) ? fb : fb?.fallbacks ?? []);
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
          <h2 className="truncate text-lg text-white sm:text-xl">DIWA Admin Dashboard</h2>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
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
