// Campus-map card. Extracted from ChatMessage.tsx.
import { useState } from "react";

import { X, MapPin, Map as MapIcon, ExternalLink, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CampusMap } from "@/components/CampusMap";
import { readLocal, writeLocal, storageAvailable } from "@/lib/storage";

import type { MapCard as MapCardData } from "@/lib/types";

// One-time coachmark: the first time a map card appears, teach the user the
// map exists and let them choose to open it — instead of the modal springing
// open unbidden. Persisted so it only ever shows once per browser.
const MAP_COACHMARK_KEY = "diwa_map_coachmark_seen";
function mapCoachmarkSeen(): boolean {
  if (readLocal(MAP_COACHMARK_KEY) === "1") return true;
  // readLocal cannot distinguish "never set" from "storage unreachable", and
  // the two must behave differently: a browser blocking site data has to count
  // as seen, or the coachmark returns on every single map card. Probe only on
  // the miss, so the common path stays a plain read.
  return !storageAvailable("local");
}
function markMapCoachmarkSeen() {
  writeLocal(MAP_COACHMARK_KEY, "1");
}

export function MapAccordion({
  mapData,
}: {
  readonly mapData: MapCardData;
}) {
  // The map NEVER auto-opens. Tap-to-expand opens a fullscreen Dialog (mobile)
  // / large modal (desktop) with editable From/To pickers.
  const [open, setOpen] = useState(false);
  // Show the first-run coachmark above the button (only once per browser).
  const [showCoachmark, setShowCoachmark] = useState(() => !mapCoachmarkSeen());

  const dismissCoachmark = () => {
    markMapCoachmarkSeen();
    setShowCoachmark(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showCoachmark && (
        <div className="mb-2 flex items-start gap-2 rounded-2xl border border-forest-900/15 bg-forest-50 px-3 py-2.5 text-sm">
          <MapPin className="h-4 w-4 flex-shrink-0 text-forest-700 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-forest-900">
              This spot is on the campus map.
            </p>
            <p className="mt-0.5 text-xs text-forest-800">
              You can open an interactive map with walking directions.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  dismissCoachmark();
                  setOpen(true);
                }}
                className="rounded-full bg-forest-600 px-3 py-1 text-xs font-medium text-white hover:bg-forest-700 active:bg-forest-800"
              >
                View map
              </button>
              <button
                type="button"
                onClick={dismissCoachmark}
                className="rounded-full border border-forest-900/15 bg-paper-raised px-3 py-1 text-xs font-medium text-forest-800 hover:bg-forest-50 active:bg-forest-100"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissCoachmark}
            aria-label="Dismiss map tip"
            className="flex-shrink-0 rounded-md p-0.5 text-forest-700 hover:bg-forest-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-2xl border border-forest-900/10 bg-forest-50 px-3 py-2 text-left text-sm font-medium text-forest-900 active:bg-forest-100"
          aria-label={`Open campus map for ${mapData.label}`}
        >
          <MapIcon className="h-4 w-4 flex-shrink-0 text-forest-700" />
          <span className="flex-1 min-w-0 truncate">
            View campus map — {mapData.label}
          </span>
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-forest-700" />
        </button>
      </DialogTrigger>
      <DialogContent
        // Fullscreen on mobile, large centered modal on desktop. `gap-0` /
        // `p-0` override DialogContent defaults so the map fills the frame
        // edge-to-edge. `[&>button.absolute]:hidden` suppresses the default
        // Radix close X (we provide our own "Back to chat" affordance below
        // — the floating X confused users into thinking it closed the chat
        // widget itself, since the widget's own close X is at the same screen
        // position when embedded).
        // The sm: block turns the sheet into a centered modal, which a phone in
        // landscape also matches on width — and 90dvh of a 390px-tall screen is
        // a 351px window with a map in it. The short: block hands that case back
        // to the fullscreen treatment, which is the only way the map gets room.
        className="!grid !max-w-none !translate-x-0 !translate-y-0 !top-0 !left-0 !inset-0 !rounded-none !p-0 !gap-0 !border-0 grid-rows-[auto_1fr] h-[100dvh] w-screen overflow-hidden sm:!inset-auto sm:!top-1/2 sm:!left-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:!rounded-2xl sm:!max-w-[min(900px,95vw)] sm:!h-[min(900px,90dvh)] short:!inset-0 short:!top-0 short:!left-0 short:!translate-x-0 short:!translate-y-0 short:!rounded-none short:!max-w-none short:!h-[100dvh] [&>button.absolute]:hidden"
      >
        <DialogHeader className="flex flex-row items-center gap-3 border-b border-forest-900/10 bg-paper-raised px-3 py-2.5 sm:rounded-t-2xl sm:px-4 sm:py-3 short:py-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Back to chat"
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-forest-700 hover:bg-forest-50 active:bg-forest-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to chat</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="min-w-0 flex-1 text-left">
            <DialogTitle className="text-sm font-semibold text-ink-900 sm:text-base">
              Campus map
            </DialogTitle>
            <DialogDescription className="truncate text-xs text-ink-500">
              Pick a From and To — the route updates instantly.
            </DialogDescription>
          </div>
        </DialogHeader>
        {/* Portrait scrolls the whole sheet; landscape hands scrolling to
            CampusMap's own rail so the map pane beside it stays put. Gated on
            `short-wide:` and not `short:` — in the 420px chat widget the map
            stays stacked, so the rail that would have scrolled does not exist
            and hiding the overflow here just clipped the page with no way to
            reach the rest of it. */}
        <div className="overflow-y-auto short-wide:overflow-hidden lg:overflow-hidden">
          <CampusMap place_id={mapData.place_id} label={mapData.label} editableTarget zoomable />
        </div>
      </DialogContent>
    </Dialog>
  );
}
