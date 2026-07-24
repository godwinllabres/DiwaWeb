import {
  MessageCircle, Sparkles, Map, Languages, ClipboardList, Lock, ShieldCheck,
  Zap, Network, Cpu, Phone, ExternalLink, Maximize2,
} from "lucide-react";
import { SeviAvatar } from "./SeviAvatar";
import { SeviMoodCycle } from "./SeviSticker";

/**
 * LandingPage — what visitors see when they hit the SeviWeb root URL without
 * ?embed=1. The widget (loaded from index.html) drops a chat bubble in the
 * bottom-right; this page is the informative introduction to Sevi so the
 * bubble isn't floating on a blank canvas, and so stakeholders previewing the
 * dev URL understand what the cvsu.edu.ph integration will feel like.
 *
 * The chat itself never renders here — tapping the bubble (or "Open chat")
 * opens the iframed embed (?embed=1) on top.
 */
export function LandingPage() {
  return (
    <div className="min-h-dvh w-full bg-gradient-to-br from-green-50 via-white to-green-100 text-gray-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:py-7">
        <div className="flex items-center gap-3">
          <SeviAvatar className="h-10 w-10 sm:h-12 sm:w-12" title="Sevi" />
          <div>
            <p className="text-sm font-semibold text-green-900 sm:text-base">Sevi</p>
            <p className="text-[11px] text-green-700/80 sm:text-xs">CvSU Virtual Assistant</p>
          </div>
        </div>
        <a
          href="https://cvsu.edu.ph"
          className="inline-flex items-center gap-1.5 rounded-full border border-green-300 px-3.5 py-1.5 text-xs font-medium text-green-800 hover:bg-green-50 sm:text-sm"
        >
          cvsu.edu.ph <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        {/* HERO */}
        <section className="mt-6 grid items-start gap-10 sm:mt-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
              <Sparkles className="h-3 w-3" />
              Most answers in under a second — English, Filipino, or Taglish
            </p>
            <div className="mt-5 flex items-start gap-4 sm:gap-6">
              <h1 className="text-3xl font-semibold leading-tight text-gray-900 sm:text-4xl lg:text-5xl">
                Ask Sevi anything about Cavite State University.
              </h1>
              <SeviAvatar className="h-28 w-28 flex-shrink-0 sm:h-36 sm:w-36 lg:h-44 lg:w-44" animated />
            </div>
            <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
              Admissions, enrollment, courses, scholarships, fees, campus facilities,
              walking directions on the Indang main campus — all in one chat. Available in
              English, Filipino, or Taglish. No login, nothing personal stored.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => (window as any).diwa?.open?.()}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 sm:text-base"
              >
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                Open chat
              </button>
              <a
                href="?chat=1"
                target="_blank"
                rel="noopener"
                className="hidden items-center gap-2 rounded-xl border border-green-300 bg-white px-5 py-3 text-sm font-semibold text-green-700 hover:bg-green-50 sm:inline-flex sm:text-base"
              >
                <Maximize2 className="h-4 w-4" />
                Fullscreen chat
              </a>
              <a
                href="#how-sevi-thinks"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:text-base"
              >
                How Sevi thinks
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Try asking
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              {[
                "What are admission requirements?",
                "Is there an admission exam?",
                "Where is the library?",
                "Kelan magsisimula ang enrollment?",
                "Tell me about scholarships",
                "How can I contact the registrar?",
              ].map((q) => (
                <li
                  key={q}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 hover:border-green-300 hover:bg-green-50"
                >
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* STAT STRIP */}
        <section className="mt-10 grid grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-4 sm:gap-4">
          <Stat value="3" label="ways it works out your answer" />
          <Stat value="<1s" label="for most replies" />
          <Stat value="EN·FIL·TL" label="English · Filipino · Taglish" />
          <Stat value="0" label="logins · anonymous by default" />
        </section>

        {/* SEE IT IN ACTION */}
        <section className="mt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">Getting started</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            New here? Watch the quick tour
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600">
            Open the chat, ask in any language, and get a clear answer — here&rsquo;s the whole flow in four steps.
          </p>
          <div className="mt-7 overflow-hidden rounded-3xl border border-green-200 shadow-lg ring-1 ring-black/5">
            <video
              className="block w-full"
              src="/how-to-use-sevi.webm"
              poster="/how-to-use-sevi-poster.png"
              autoPlay
              loop
              muted
              playsInline
              aria-label="Animated tour: how to use Sevi"
            />
          </div>
        </section>

        {/* ARCHITECTURE */}
        <section id="how-sevi-thinks" className="mt-20 scroll-mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">How Sevi thinks</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Three ways to answer, not one
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600">
            Every question gets three tries. The quick ones handle what they can; only genuinely
            open-ended questions reach the part that writes a full answer &mdash; and that runs on
            CvSU&rsquo;s <b>own servers</b>, so nothing leaves the university.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <Tier
              n="First try" icon={<Zap className="h-5 w-5" />}
              title="Instant answers"
              body="Recognises the questions students ask most, and replies right away."
              tag="instant"
            />
            <Tier
              n="Second try" icon={<Network className="h-5 w-5" />}
              title="However you phrase it"
              body="Catches the same question asked ten different ways — in English, Filipino, or Taglish."
              tag="flexible · multilingual"
            />
            <Tier
              n="If needed" icon={<Cpu className="h-5 w-5" />}
              title="A fuller answer, kept on campus"
              body="For anything unusual, Sevi writes a clear answer from CvSU's own pages, on CvSU's own servers."
              tag="private · on campus"
            />
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Under the hood: Na&iuml;ve Bayes pattern matching &rarr; an LSTM neural network &rarr; a
            locally hosted large language model. Most replies land in under a second.
          </p>
        </section>

        {/* FEATURES */}
        <section className="mt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">What Sevi does</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Built for the CvSU community
          </h2>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={<MessageCircle className="h-5 w-5" />} title="Fast by default"
              body="Most questions come back in under a second. Only the unusual ones take a little longer." />
            <Feature icon={<Map className="h-5 w-5" />} title="Interactive campus map"
              body="Pan and zoom the Indang main campus. Pick a From and To — the walking route draws itself." />
            <Feature icon={<Languages className="h-5 w-5" />} title="English · Filipino · Taglish"
              body="Ask however you speak. Sevi understands and replies in the language of the question." />
            <Feature icon={<ClipboardList className="h-5 w-5" />} title="Structured, cited answers"
              body="Programs, requirements, deadlines and fees come back organised — with links to the official CvSU pages." />
            <Feature icon={<Lock className="h-5 w-5" />} title="Always-on, anonymous"
              body="No login. No personal data stored. Just point a question at it and get a clear answer." />
            <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Safe by design"
              body="Messages are auto-screened for safety, and Sevi never asks for passwords in chat." />
          </div>
        </section>

        {/* CHARACTER */}
        <section className="mt-20 grid items-center gap-8 rounded-3xl border border-green-200 bg-white/70 p-8 sm:grid-cols-2 sm:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">The character</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              A face rooted in CvSU
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              Sevi wears a <b>salakot</b> bearing the real Cavite State University seal, over the
              university green — friendly, unmistakably CvSU, and instantly recognisable at any
              size, from a chat bubble to a banner.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <SeviMoodCycle className="h-52 w-52 sm:h-60 sm:w-60" />
            <p className="text-xs text-gray-500">
              Sevi&rsquo;s animated moods — you&rsquo;ll meet them in chat.
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-green-200 pt-8 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-green-900">Sevi · CvSU Virtual Assistant</p>
            <p className="mt-1 text-xs text-gray-500">Built for Cavite State University · Runs on CvSU&rsquo;s own servers</p>
          </div>
          <div className="text-left text-xs text-gray-500 sm:text-right">
            <a href="https://cvsu.edu.ph" className="font-medium text-green-700 hover:underline">cvsu.edu.ph</a>
            <p className="mt-1 inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Urgent concerns? Call CvSU trunkline: 4839250
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Stat({ value, label }: { readonly value: string; readonly label: string }) {
  return (
    <div className="rounded-2xl border border-green-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-bold tabular-nums text-green-700">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{label}</div>
    </div>
  );
}

function Tier({
  n, icon, title, body, tag,
}: {
  readonly n: string; readonly icon: React.ReactNode; readonly title: string;
  readonly body: string; readonly tag: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-green-500 to-green-700" />
      <div className="flex items-center gap-2 text-green-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100">{icon}</div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-600">{n}</span>
      </div>
      <h3 className="mt-3 text-base font-bold text-gray-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{body}</p>
      <span className="mt-3 inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
        {tag}
      </span>
    </div>
  );
}

function Feature({
  icon, title, body,
}: {
  readonly icon: React.ReactNode; readonly title: string; readonly body: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
        {icon}
      </div>
      <h3 className="mt-3 text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}
