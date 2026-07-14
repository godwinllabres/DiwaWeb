import { MessageCircle, Sparkles, MapPin, Clock } from "lucide-react";
import { SeviAvatar } from "./SeviAvatar";
import { SeviBust } from "./SeviBust";

/**
 * LandingPage — what visitors see when they hit the SeviWeb root URL without
 * ?embed=1. The widget (loaded from index.html) drops a chat bubble in the
 * bottom-right; this page exists so the bubble isn't floating on a blank
 * canvas, and so stakeholders previewing the dev URL can see what the
 * cvsu.edu.ph integration will feel like.
 *
 * The chat itself never renders here — tapping the bubble opens the iframed
 * embed (?embed=1) on top.
 */
export function LandingPage() {
  return (
    <div className="min-h-dvh w-full bg-gradient-to-br from-green-50 via-white to-green-100">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 sm:py-7">
        <div className="flex items-center gap-3">
          <SeviAvatar className="h-10 w-10 sm:h-12 sm:w-12" expression="greeting" title="Sevi" />
          <div>
            <p className="text-sm font-semibold text-green-900 sm:text-base">Sevi</p>
            <p className="text-[11px] text-green-700/80 sm:text-xs">CvSU Virtual Assistant</p>
          </div>
        </div>
        <a
          href="https://cvsu.edu.ph"
          className="rounded-full border border-green-300 px-3.5 py-1.5 text-xs font-medium text-green-800 hover:bg-green-50 sm:text-sm"
        >
          cvsu.edu.ph
        </a>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <section className="mt-6 grid items-start gap-10 sm:mt-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
              <Sparkles className="h-3 w-3" />
              Powered by Naive Bayes + Neural Network + Local LLM
            </p>
            <div className="mt-5 flex items-start gap-4 sm:gap-6">
              <h1 className="text-3xl font-semibold leading-tight text-gray-900 sm:text-4xl lg:text-5xl">
                Ask Sevi anything about Cavite State University.
              </h1>
              <SeviBust className="h-28 w-28 flex-shrink-0 sm:h-36 sm:w-36 lg:h-44 lg:w-44" animated />
            </div>
            <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
              Admissions, enrollment, courses, scholarships, fees, campus facilities,
              walking directions on the Indang main campus — all in one chat. Available in
              English, Filipino, or Taglish.
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
              <span className="text-sm text-gray-500">
                or tap the green bubble bottom-right.
              </span>
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

        <section className="mt-16 grid gap-5 sm:grid-cols-3">
          <FeatureCard
            icon={<MessageCircle className="h-5 w-5" />}
            title="Three-tier intent routing"
            body="Fast pattern matching → LSTM neural network → local LLM fallback. Most replies in under a second."
          />
          <FeatureCard
            icon={<MapPin className="h-5 w-5" />}
            title="Interactive campus map"
            body="Pan and zoom the Indang main campus. Pick a From and To — the walking route draws itself."
          />
          <FeatureCard
            icon={<Clock className="h-5 w-5" />}
            title="Always-on, anonymous"
            body="No login. No personal data stored. Just point a question at it and get a structured answer."
          />
        </section>

        <footer className="mt-16 text-center text-[11px] text-gray-400 sm:text-xs">
          Urgent concerns? Call CvSU: (046) 430-6332
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly body: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}
