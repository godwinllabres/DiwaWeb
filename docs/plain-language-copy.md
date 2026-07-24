# Plain-language copy — standard and audit

**Date:** 2026-07-25
**Story:** As a user, I want the terminology, labelling, and error/alert/display
messages to be mostly free of jargon.
**Scope agreed:** student-facing surfaces only. Staff chat surfaces (AIS sign-in,
disbursement-voucher modals) and the admin panels were deliberately excluded —
see §5.

---

## 1. Where these changes actually live

The code changes described here are **already on `main` in both repos**, but they
are not in a commit that names them. A concurrent `git commit -a` swept the
working tree into two unrelated commits before they could be committed on their
own:

| Repo | Files | Commit it landed in |
|---|---|---|
| sevi-web | `app/App.tsx`, `app/components/ChatMessage.tsx`, `app/components/LandingPage.tsx`, `app/lib/hooks/useChat.ts`, `tests/lib/hooks/useChat.test.tsx` | `8b7ca31` — *fix(admin): keep cross-origin deploys working, re-lock on expired session* |
| sevi-api | `api/hybrid_chatbot.py` | `9b89e37` — *fix: regressions found by the pre-merge review* |

Both messages describe admin/auth regression work and say nothing about copy, so
`git log` will not lead anyone here. That is the gap this file closes. History
was left alone rather than rewritten, because both commits were already pushed to
`origin` and `personal`.

---

## 2. The rule

User-facing strings name **what the user sees or does**, never how the system is
built. In particular:

- No model or algorithm names in the UI — no "Naive Bayes", "LSTM", "LLM",
  "neural network", "intent", "tier", "fallback".
- No transport detail in an error — no status codes, no route paths, no
  "unreachable", "timed out after 45s", "API /chat failed".
- Every error says what happened **and** what to do next.
- Internal system acronyms (AIS, MCP, RAG) get a plain gloss, or the CvSU-facing
  name, whichever a student would recognise.
- Raw enum values never reach the screen. If a `snake_case` key is rendered, it
  is a bug.

Technical detail is not deleted — it moves to where developers look: the console,
`onError`, a commit message, or a small explicitly-labelled footnote.

---

## 3. What changed

### Errors and alerts — `app/lib/hooks/useChat.ts`

`api.request` throws developer-facing text (`API /chat failed: 500`,
`API /chat timed out after 45s`). That string was being rendered verbatim into
the chat banner as ``Sevi couldn't get a reply (API /chat failed: 500).``

A new `plainApiError()` maps the four real failure shapes to a sentence with an
action in it:

| Raw | Shown to the user |
|---|---|
| `…timed out after 45s` | Sevi took too long to answer. Please try again. |
| `…failed: 429` | That's a lot of questions at once — please wait a moment, then try again. |
| `…failed: 5xx` | Something went wrong on the CvSU side. Please try again in a moment. |
| anything else | Sevi couldn't connect. Please check your internet and try again. |

The raw error still reaches `console.warn` and the `onError` callback, so nothing
is lost for debugging. **`app/lib/api.ts` was deliberately not changed** — admin
code branches on `e.message.includes("401")` / `("503")`, and rewording the thrown
message there would have broken the admin PIN gate.

The offline bot bubble also moved from "trouble reaching the server" to "trouble
connecting".

### Chat shell — `app/App.tsx`

- Banner: the raw-error parenthetical is gone; `apiError` is now already a
  complete sentence and renders directly.
- Offline banner: "Can't reach the CvSU server right now — replies may fail." →
  "Sevi can't connect to CvSU right now — replies may not come through."
- Input placeholder: "Server unreachable — …" → "Can't connect right now — …"

### Answer-source labels — `app/components/ChatMessage.tsx`

These are the AI-transparency cues under each reply (see
`sevi-api/docs/privacy_compliance.md` §3.11).

| Source | Before | After |
|---|---|---|
| `llm_local` | AI · on-campus model | AI answer · on CvSU servers |
| `llm_claude` | AI assistant | AI answer |
| `charter_rag` | Citizens' Charter | CvSU Citizens' Charter |
| `ais_mcp` | AIS live data | Live CvSU record |
| `connectors_mcp` | Live lookup | Live CvSU lookup |
| `campus_directory` | Citizens' Charter directory | CvSU office directory |

Table footer: "Showing 3 of 12 loaded row(s)." → "Showing 3 of 12 on this list."

### Landing page — `app/components/LandingPage.tsx`

The public page led with "Powered by Naive Bayes + Neural Network + Local LLM"
and explained the architecture in ML terms. Rewritten for a student reader, with
the stack preserved in **one** small grey footnote under the tier cards:

> Under the hood: Naïve Bayes pattern matching → an LSTM neural network → a
> locally hosted large language model. Most replies land in under a second.

| Element | Before | After |
|---|---|---|
| Hero badge | Powered by Naive Bayes + Neural Network + Local LLM | Most answers in under a second — English, Filipino, or Taglish |
| Stat | 3 · reasoning tiers, one answer | 3 · ways it works out your answer |
| Heading | A hybrid brain, not one big model | Three ways to answer, not one |
| Card 1 | Tier 01 · Naïve Bayes pattern match | First try · Instant answers |
| Card 2 | Tier 02 · Neural network (LSTM) | Second try · However you phrase it |
| Card 3 | Tier 03 · Local LLM fallback | If needed · A fuller answer, kept on campus |
| Feature | Three-tier intent routing | Fast by default |
| Footer | Powered by Naive Bayes + … | Built for Cavite State University · Runs on CvSU's own servers |

### Refusal copy — `sevi-api/api/hybrid_chatbot.py`

`ScopeGate.REFUSAL_MESSAGES[1]`: "That's outside my scope." → "That's not
something I can help with." The other two refusals, the `safety.py` responses,
and the `nlu_fallback` intent copy were already plain and were left alone.
`safety.py` additionally carries a "placeholder pending Guidance-office sign-off"
marker, so its wording is not ours to change.

---

## 4. Verification

- `tsc --noEmit` — clean.
- Vitest — 91 passed, including 3 new cases asserting `apiError` is rewritten and
  never contains the raw string.
- Two failures predate this work and reproduce on a stashed tree:
  `useChat > sendMessage hits /chat…` (stale fixture returning `response:` where
  the hook reads `res.text`) and `useTypewriter > starts empty…`.
- `api/hybrid_chatbot.py` got a syntax check only — no environment on the machine
  had `pytest` and `fastapi` installed. Nothing in the repo asserts on that
  string.

---

## 5. Known jargon left in place

Out of the agreed scope, but real, and worth picking up next:

**Staff chat surfaces** — these render inside the student chat component, so they
are the closest to the line:
- `formatContextChip` in `ChatMessage.tsx` renders `ctx.uacs.kind` raw, producing
  chips that read `last lookup: responsibility_center`. A raw enum on screen is a
  display bug regardless of audience.
- A failed voucher action renders `Action failed: <error_code>`.
- "Write tools are in pilot — request access from accounting."

**Admin panels** — `AdminMapEditor.tsx` ("marker coords", "waypoints"),
`SystemPanel.tsx` ("circuit open", "Classifier", "Neural net"),
`IntentOnboarding.tsx` ("snake_case_tag", "Sanitation check failed"). These are
staff tools whose users know the terms; de-jargoning them is a separate call.
