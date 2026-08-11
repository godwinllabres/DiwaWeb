import type { ReactNode } from "react";
import {
  MessageCircle, Map, Languages, ClipboardList, ShieldCheck, GraduationCap,
  CalendarDays, Zap, Network, Cpu, Phone, ExternalLink, Maximize2, ArrowUpRight,
} from "lucide-react";
import { motion, type MotionProps, type Transition } from "motion/react";
import { SeviAvatar } from "./SeviAvatar";
import { SeviMoodCycle } from "./SeviSticker";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

// Vite rewrites root-relative URLs in HTML attributes, but NOT string literals
// in TSX. A hardcoded "/foo.png" therefore resolves to the server root and 404s
// under a based deploy. Same pattern as SeviAvatar/SeviSticker.
const BASE_URL = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";

/**
 * LandingPage — what visitors see when they hit the SeviWeb root URL without
 * ?embed=1. The widget (loaded from index.html) drops a chat bubble in the
 * bottom-right; this page is the informative introduction to Sevi so the
 * bubble isn't floating on a blank canvas, and so stakeholders previewing the
 * dev URL understand what the cvsu.edu.ph integration will feel like.
 *
 * The chat itself never renders here — tapping the bubble (or "Open chat")
 * opens the iframed embed (?embed=1) on top.
 *
 * Layout note: the "what you can ask" section is a bento grid, not a list of
 * equal tiles. Admissions is the question students actually arrive with, so it
 * gets a card twice everyone else's size and carries real sample questions;
 * the rest fill in around it. Asymmetry is the point — a 3x2 grid of identical
 * boxes reads as a form to be worked through, a bento reads as somewhere to
 * browse.
 *
 * Spacing follows one rule throughout: the section's own padding is always
 * larger than the gaps between its children (px-6 vs gap-3 on phones, px-8+
 * vs gap-4 above), so the page never looks like it is pressing against the
 * viewport edge.
 */

// Open the chat the way this page can: the widget if it loaded, otherwise
// the fullscreen route, which is the same chat without the iframe.
function openChat() {
  const widget = (window as { diwa?: { open?: () => void } }).diwa;
  if (widget?.open) {
    widget.open();
    return;
  }
  window.location.href = "?chat=1";
}

// Spring, not duration-easing — the cards should settle rather than stop.
const SPRING: Transition = { type: "spring", stiffness: 210, damping: 26, mass: 0.9 };

export function LandingPage() {
  const reducedMotion = usePrefersReducedMotion();

  // One helper for every entry animation on the page. Reduced motion collapses
  // it to a plain fade-free render — no transform, no stagger, no delay.
  const rise = (index = 0): MotionProps =>
    reducedMotion
      ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 22 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-80px" },
          transition: { ...SPRING, delay: index * 0.06 },
        };

  return (
    <div className="relative min-h-dvh w-full bg-paper text-ink-800">
      {/* One soft, warm wash behind the fold. Radial and paper-toned — depth
          without a drop shadow, and nothing that reads as a "gradient hero". */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(120%_90%_at_50%_-20%,rgba(22,128,60,0.09),transparent_62%)]"
      />

      <div className="relative">
        {/* Keyboard users shouldn't have to tab the brand, the CvSU link and
            six topic tiles to reach the thing the page is for. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:rounded-2xl focus:bg-forest-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>

        {/* Sticky, and glass only once the page has moved: at rest the header
            sits on the hero's wash with no seam, and the hairline + blur fade
            in as content starts passing under it. `backdrop-blur` earns its
            keep here — unlike a bar with a solid fill, there is real page
            behind this one. */}
        <header className="sevi-sticky-header sticky top-0 z-30 border-b backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-12 sm:py-5">
            <div className="flex items-center gap-3">
              <SeviAvatar className="h-10 w-10 sm:h-11 sm:w-11" title="Sevi" />
              <div>
                <p className="text-sm font-semibold tracking-tight text-forest-900 sm:text-base">Sevi</p>
                <p className="text-[11px] text-ink-500 sm:text-xs">CvSU Virtual Assistant</p>
              </div>
            </div>
            <a
              href="https://cvsu.edu.ph"
              className="inline-flex items-center gap-1.5 rounded-full border border-forest-900/10 bg-paper-raised px-4 py-2 text-xs font-medium text-forest-800 transition-colors hover:bg-forest-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:text-sm"
            >
              cvsu.edu.ph <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-6xl px-6 pb-28 sm:px-12">
          {/* HERO */}
          <section className="mt-8 grid items-center gap-10 sm:mt-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <motion.div {...rise(0)}>
              <p className="inline-flex items-center gap-2 rounded-full border border-forest-900/10 bg-paper-raised px-4 py-2 text-xs font-medium text-ink-600">
                {/* The one place gold appears above the fold: a live marker. */}
                <span className="h-1.5 w-1.5 rounded-full bg-gold-500" aria-hidden="true" />
                Answering now — in English, Filipino, or Taglish
              </p>

              <h1 className="mt-7 max-w-[16ch] text-[2.5rem] leading-[1.08] text-forest-900 sm:text-5xl lg:text-[3.5rem]">
                Ask Sevi anything about Cavite State University.
              </h1>

              <p className="mt-6 max-w-[58ch] text-base leading-[1.7] text-ink-600 sm:text-lg">
                Admissions, enrollment, courses, scholarships, fees, campus facilities and
                walking directions on the main campus — all in one conversation,
                in the language you actually speak.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openChat}
                  className="group inline-flex items-center gap-2.5 rounded-2xl bg-forest-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-forest-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:text-base"
                >
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  Open chat
                </button>
                <a
                  href="?chat=1"
                  target="_blank"
                  rel="noopener"
                  className="hidden items-center gap-2 rounded-2xl border border-forest-900/10 bg-paper-raised px-6 py-3.5 text-sm font-semibold text-forest-800 transition-colors hover:bg-forest-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:inline-flex sm:text-base"
                >
                  <Maximize2 className="h-4 w-4" />
                  Fullscreen
                </a>
                <a
                  href="#how-sevi-thinks"
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-ink-600 transition-colors hover:bg-paper-sunken hover:text-forest-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:text-base"
                >
                  How Sevi thinks
                </a>
              </div>
            </motion.div>

            <motion.div className="flex justify-center lg:justify-end" {...rise(1)}>
              {/* The avatar artwork is a bust crop — it ends in a straight
                  horizontal cut across the sweater. Floating bare on the page
                  that cut reads as a broken asset (most visibly on phones), so
                  the mascot sits in a portrait medallion and the circle clips
                  the crop line.

                  The idle float lives on the medallion, not the image: with
                  the image static inside the circle, the crop line can sit
                  just past the bottom arc (-mb-2) and the figure fills the
                  frame — no oversized margin reserved for bob travel, which
                  read as the mascot slumping to the bottom of an empty
                  circle. Width-only sizing keeps the image at the artwork's
                  own aspect, so there is no letterbox gap to compensate for. */}
              <div className="sevi-animated flex h-48 w-48 items-end justify-center overflow-hidden rounded-full border border-forest-900/10 bg-paper-raised sm:h-60 sm:w-60 lg:h-72 lg:w-72">
                <SeviAvatar className="-mb-2 w-48 sm:w-60 lg:w-72" />
              </div>
            </motion.div>
          </section>

          {/* BENTO — what you can ask */}
          <section className="mt-24 sm:mt-32">
            <motion.div {...rise(0)}>
              <Eyebrow>What you can ask</Eyebrow>
              <h2 className="mt-3 text-3xl text-forest-900 sm:text-4xl">
                Start anywhere.
              </h2>
              <p className="mt-4 max-w-[56ch] text-base leading-[1.7] text-ink-600">
                These are the questions Sevi is asked most. Open the chat and ask in your
                own words — nothing here is a menu you have to follow.
              </p>
            </motion.div>

            {/* 4 columns at lg; Admissions takes a 2x2 block and everything else
                fills the space around it. The minmax row keeps every tile at a
                comfortable height without letting a long line clip. */}
            <div className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:auto-rows-[minmax(11.5rem,auto)]">
              <BentoCard
                index={0}
                rise={rise}
                icon={<GraduationCap className="h-5 w-5" />}
                title="Admissions"
                body="Requirements, the CvSUCAT entrance exam, deadlines, and what to bring on the day — step by step, with links to the official CvSU pages so you can check anything for yourself."
                className="sm:col-span-2 lg:row-span-2"
                featured
              >
                {/* mt-auto: the tile is twice everyone else's height, and
                    without this the questions bunched under the body copy and
                    left ~180px of dead card below them. Pinned to the floor
                    they bracket the card — heading at the top, the things you
                    can actually say at the bottom. */}
                <span className="mt-auto flex flex-col gap-3 pt-8">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                    People usually start with
                  </span>
                  <span className="flex flex-wrap gap-2">
                  {[
                    "What are the admission requirements?",
                    "Is there an entrance exam?",
                    "Kelan ang deadline ng application?",
                    "How much is the application fee?",
                    "When do results come out?",
                  ].map((q) => (
                    <span
                      key={q}
                      className="rounded-full border border-forest-900/10 bg-paper px-4 py-2.5 text-[13px] leading-tight text-ink-600 transition-colors group-hover:border-forest-900/15 group-hover:bg-paper-raised"
                    >
                      {q}
                    </span>
                  ))}
                  </span>
                </span>
              </BentoCard>

              <BentoCard
                index={1}
                rise={rise}
                icon={<CalendarDays className="h-5 w-5" />}
                title="Enrollment"
                body="Schedules, the enlistment flow, fees and assessment — plus what to do when a subject is already closed."
                className="sm:col-span-2"
              />

              <BentoCard
                index={2}
                rise={rise}
                icon={<Map className="h-5 w-5" />}
                title="Campus maps"
                body="Pan and zoom Indang. Pick a From and a To — the walking route draws itself."
              />

              <BentoCard
                index={3}
                rise={rise}
                icon={<Languages className="h-5 w-5" />}
                title="EN · FIL · Taglish"
                body="Ask however you speak. Sevi replies in the language of the question."
              />

              <BentoCard
                index={4}
                rise={rise}
                icon={<ClipboardList className="h-5 w-5" />}
                title="Scholarships & records"
                body="Grants and requirements explained, and live lookups for the CvSU services already connected — like tracking an ORPS ticket."
                className="sm:col-span-2"
              />

              <BentoCard
                index={5}
                rise={rise}
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Anonymous by default"
                body="No login. Chats are not kept on your device unless you switch on Saved chats yourself — and Sevi never asks for a password in chat."
                className="sm:col-span-2"
              />
            </div>
          </section>

          {/* QUICK TOUR */}
          <section className="mt-24 sm:mt-32">
            <motion.div {...rise(0)}>
              <Eyebrow>Getting started</Eyebrow>
              <h2 className="mt-3 text-3xl text-forest-900 sm:text-4xl">
                New here? The whole flow, in four steps
              </h2>
              <p className="mt-4 max-w-[56ch] text-base leading-[1.7] text-ink-600">
                Open the chat, ask in any language, and get a clear answer.
              </p>
            </motion.div>
            <motion.div
              className="mt-10 overflow-hidden rounded-3xl border border-forest-900/10 bg-paper-raised p-2 sm:p-3"
              {...rise(1)}
            >
              <video
                className="block w-full rounded-2xl"
                src={`${BASE_URL}how-to-use-sevi.webm`}
                poster={`${BASE_URL}how-to-use-sevi-poster.png`}
                autoPlay
                loop
                muted
                playsInline
                aria-label="Animated tour: how to use Sevi"
              />
            </motion.div>
          </section>

          {/* ARCHITECTURE */}
          <section id="how-sevi-thinks" className="mt-24 scroll-mt-28 sm:mt-32">
            <motion.div {...rise(0)}>
              <Eyebrow>How Sevi thinks</Eyebrow>
              <h2 className="mt-3 text-3xl text-forest-900 sm:text-4xl">
                Three ways to answer, not one
              </h2>
              <p className="mt-4 max-w-[62ch] text-base leading-[1.7] text-ink-600">
                Every question gets three tries. The quick ones handle what they can; only
                genuinely open-ended questions reach the part that writes a full answer —
                and that runs on CvSU&rsquo;s <b className="font-semibold text-ink-800">own servers</b>,
                so nothing leaves the university.
              </p>
            </motion.div>

            <div className="mt-10 grid gap-3 sm:gap-4 lg:grid-cols-3">
              <Tier
                index={0} rise={rise}
                n="First try" icon={<Zap className="h-5 w-5" />}
                title="Instant answers"
                body="Recognises the questions students ask most, and replies right away."
                tag="instant"
              />
              <Tier
                index={1} rise={rise}
                n="Second try" icon={<Network className="h-5 w-5" />}
                title="However you phrase it"
                body="Catches the same question asked ten different ways — in English, Filipino, or Taglish."
                tag="flexible · multilingual"
              />
              <Tier
                index={2} rise={rise}
                n="If needed" icon={<Cpu className="h-5 w-5" />}
                title="A fuller answer, kept on campus"
                body="For anything unusual, Sevi writes a clear answer from CvSU's own pages, on CvSU's own servers."
                tag="private · on campus"
              />
            </div>

            <p className="mt-6 max-w-[62ch] text-sm leading-[1.7] text-ink-500">
              Under the hood: Na&iuml;ve Bayes pattern matching &rarr; an LSTM neural network &rarr; a
              locally hosted large language model. Most answers land in a moment.
            </p>
          </section>

          {/* CHARACTER */}
          <motion.section
            className="mt-24 grid items-center gap-10 rounded-3xl border border-forest-900/10 bg-paper-raised px-5 py-10 sm:mt-32 sm:grid-cols-2 sm:px-10 sm:py-14"
            {...rise(0)}
          >
            <div>
              <Eyebrow>The character</Eyebrow>
              <h2 className="mt-3 text-3xl text-forest-900 sm:text-4xl">
                A face rooted in CvSU
              </h2>
              <p className="mt-4 max-w-[52ch] text-base leading-[1.7] text-ink-600">
                Sevi wears a <b className="font-semibold text-ink-800">salakot</b> bearing the real
                Cavite State University seal, over the university green — friendly,
                unmistakably CvSU, and legible at any size, from a chat bubble to a banner.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <SeviMoodCycle className="h-52 w-52 sm:h-60 sm:w-60" />
              <p className="text-xs text-ink-500">
                Sevi&rsquo;s animated moods — you&rsquo;ll meet them in chat.
              </p>
            </div>
          </motion.section>

          {/* FOOTER */}
          <footer className="mt-20 flex flex-col items-start justify-between gap-5 border-t border-forest-900/10 pt-10 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-forest-900">Sevi · CvSU Virtual Assistant</p>
              <p className="mt-1.5 text-xs text-ink-500">
                Built for Cavite State University · Runs on CvSU&rsquo;s own servers
              </p>
            </div>
            <div className="text-left text-xs text-ink-500 sm:text-right">
              <a
                href="https://cvsu.edu.ph"
                className="rounded font-medium text-forest-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                cvsu.edu.ph
              </a>
              <p className="mt-1.5 inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Urgent concerns? Call CvSU trunkline: 4839250
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Eyebrow({ children }: { readonly children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-forest-700">
      {children}
    </p>
  );
}

type Rise = (index?: number) => MotionProps;

/**
 * A bento tile.
 *
 * The hover state moves the card's *background* — a separate absolutely
 * positioned layer that scales up and warms toward the brand green — rather
 * than the card itself. Scaling the element would resample the text; scaling
 * the layer underneath it reads as the surface leaning forward, and the type
 * stays crisp.
 */
function BentoCard({
  index, rise, icon, title, body, className = "", featured = false, children,
}: {
  readonly index: number;
  readonly rise: Rise;
  readonly icon: ReactNode;
  readonly title: string;
  readonly body: string;
  readonly className?: string;
  readonly featured?: boolean;
  readonly children?: ReactNode;
}) {
  return (
    <motion.div
      className={`group relative isolate flex flex-col rounded-3xl p-5 text-left sm:p-7 ${className}`}
      {...rise(index)}
    >
      {/* No `overflow-hidden` on this card: the layer below is `inset-0` and
          scales to 1.015 on hover, so clipping to the card's own box would
          shave off exactly the 1px border that is doing the work — the hover
          would read as the hairline disappearing. Nothing here bleeds past the
          radius anyway, since the layer carries the same rounding. */}
      <span
        aria-hidden="true"
        className="sevi-lift absolute inset-0 -z-10 rounded-3xl border border-forest-900/10 bg-paper-raised transition-[transform,background-color,border-color] duration-300 ease-out group-hover:scale-[1.015] group-hover:border-forest-900/15 group-hover:bg-forest-50 group-has-[:focus-visible]:border-forest-600/40 group-active:scale-[0.995]"
      />

      <span
        className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
          featured
            ? "bg-forest-900 text-white"
            : "bg-forest-50 text-forest-700 ring-1 ring-inset ring-forest-900/[0.06] group-hover:bg-forest-100"
        }`}
      >
        {icon}
      </span>

      <h3
        className={`mt-5 font-semibold tracking-tight text-forest-900 ${
          featured ? "text-xl sm:text-2xl" : "text-base sm:text-lg"
        }`}
      >
        {title}
      </h3>
      <p
        className={`mt-2.5 max-w-[46ch] text-ink-600 ${
          featured ? "text-base leading-[1.7]" : "text-sm leading-[1.65]"
        }`}
      >
        {body}
      </p>

      {children}

      {/* The card is a div, not a button, so these headings stay real headings
          — role=button makes its entire subtree presentational, which would
          have dropped all six topic headings out of the accessibility tree and
          given each tile a ~50-word accessible name.

          The control is this one button, named for the topic; `after:inset-0`
          stretches its hit area over the whole card, so pointer users still
          click anywhere while a screen reader hears one clean "Ask Sevi about
          Admissions". A phone has no hover, so on touch pointers the label
          stays visible rather than being a state nobody can reach. */}
      <button
        type="button"
        onClick={openChat}
        aria-label={`Ask Sevi about ${title}`}
        className={`${children ? "mt-5" : "mt-auto pt-6"} flex items-center gap-1.5 text-[13px] font-medium text-forest-700 opacity-0 transition-opacity duration-200 after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus:outline-none focus-visible:opacity-100 focus-visible:after:ring-2 focus-visible:after:ring-forest-600 focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-paper group-hover:opacity-100 [@media(hover:none)]:opacity-100`}
      >
        Ask Sevi <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

function Tier({
  index, rise, n, icon, title, body, tag,
}: {
  readonly index: number;
  readonly rise: Rise;
  readonly n: string;
  readonly icon: ReactNode;
  readonly title: string;
  readonly body: string;
  readonly tag: string;
}) {
  return (
    <motion.div
      className="rounded-3xl border border-forest-900/10 bg-paper-raised p-5 sm:p-7"
      {...rise(index)}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-50 text-forest-700 ring-1 ring-inset ring-forest-900/[0.06]">
          {icon}
        </div>
        {/* Sequence label, not a live marker — so it stays on ink. Gold in
            this system means "something is active or has arrived", and three
            static tier labels are neither. */}
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
          {n}
        </span>
      </div>
      <h3 className="mt-5 text-base font-semibold tracking-tight text-forest-900 sm:text-lg">
        {title}
      </h3>
      <p className="mt-2 max-w-[44ch] text-sm leading-[1.65] text-ink-600">{body}</p>
      <span className="mt-5 inline-block rounded-full border border-forest-900/10 bg-paper px-4 py-2 text-[11px] font-medium text-ink-600">
        {tag}
      </span>
    </motion.div>
  );
}
