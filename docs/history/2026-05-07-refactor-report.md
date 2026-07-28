# SeviWeb — Refactor, Test & Regression Report

> **Historical record — not current state.** This is a point-in-time report from
> 2026-05-07, kept for the reasoning it captures. It predates the two-entry
> public/admin split, the AIS authentication work, and the shadcn cull, and it
> refers to modules that no longer exist. For how the repository is structured
> today, read `README.md`.

**Date:** 2026-05-07
**Scope:** Total refactor of `app/` source, unit-test infrastructure, regression validation.

---

## 1. Summary

| Phase | Status | Outcome |
|---|---|---|
| Refactor | Done | Shared utilities and 3 custom hooks extracted; `App.tsx` reduced from 425 → 320 lines |
| Test infrastructure | Done | Vitest + React Testing Library + jsdom + V8 coverage |
| Unit tests | Done | **73 tests passing** across 13 files |
| Component tests | Done | Smoke tests for ChatMessage, CategoryCard, QuickActionButton, TypingIndicator |
| Regression | Done | `tsc -b`: clean · `vite build`: clean (295 KB JS / 95 KB gzip) · all tests green |
| Coverage | Done | `lib/` 81.7% statements · `hooks/` 97.5% statements |
| Auto perms | Blocked | Skill-level guardrail prevented writing `.claude/settings.json` directly. Proposal in §6 — apply manually. |

---

## 2. Files Added

### Shared utilities (`app/lib/`)
| File | Purpose |
|---|---|
| `types.ts` | Centralised `Message` + `Sender` types previously inlined in `App.tsx` |
| `time.ts` | `timeNow(date?)` — replaces local `timeNow()` in `App.tsx` |
| `iconMap.ts` | `ICON_MAP` + `pickIcon(tag)` extracted from `App.tsx` |
| `cn.ts` | `cn(...inputs)` — tailwind-merge helper (mirrors `components/ui/utils.ts` for app code) |

### Custom hooks (`app/lib/hooks/`)
| File | Replaces | Why |
|---|---|---|
| `useTypewriter.ts` | inline hook in `ChatMessage.tsx` | Reusable, fully unit-tested, generic over `charDelayMs` |
| `useSmartScroll.ts` | scroll logic + 4 useState/useRef in `App.tsx` | Encapsulates smart-scroll behaviour and the "↓ New message" indicator |
| `useChat.ts` | message state + `pushMessage` + `sendToApi` in `App.tsx` | Centralises chat lifecycle; lifts API/error handling out of the view |

### Test infrastructure
| File | Purpose |
|---|---|
| `vitest.config.ts` | Vitest config: jsdom environment, path alias, coverage settings |
| `tests/setup.ts` | Auto-cleanup, localStorage/sessionStorage reset, `scrollIntoView` polyfill |

### Tests (`tests/`)
- `tests/lib/time.test.ts` (3 tests)
- `tests/lib/iconMap.test.ts` (7 tests)
- `tests/lib/cn.test.ts` (6 tests)
- `tests/lib/ids.test.ts` (8 tests)
- `tests/lib/topicCatalog.test.ts` (10 tests)
- `tests/lib/api.test.ts` (6 tests)
- `tests/lib/hooks/useTypewriter.test.tsx` (5 tests)
- `tests/lib/hooks/useSmartScroll.test.tsx` (6 tests)
- `tests/lib/hooks/useChat.test.tsx` (6 tests)
- `tests/components/ChatMessage.test.tsx` (9 tests)
- `tests/components/QuickActionButton.test.tsx` (2 tests)
- `tests/components/CategoryCard.test.tsx` (2 tests)
- `tests/components/TypingIndicator.test.tsx` (2 tests)

---

## 3. Files Modified

| File | Change |
|---|---|
| `package.json` | Added scripts (`test`, `test:watch`, `test:ui`, `test:coverage`, `typecheck`); added test devDependencies |
| `tsconfig.json` | Added `baseUrl`, `paths` (`@/* → ./app/*`), Vitest type globals |
| `vite.config.ts` | Added `@/` path alias |
| `app/App.tsx` | Refactored to consume `useChat`, `useSmartScroll`, `pickIcon`, `timeNow`. Lifted threshold constants (`LOW_CONFIDENCE_THRESHOLD`, `MEDIUM_CONFIDENCE_THRESHOLD`) to module top. Now 320 lines vs original 425. |
| `app/components/ChatMessage.tsx` | Replaced inline `useTypewriter` with import from `@/lib/hooks/useTypewriter` |

---

## 4. Regression Results

### Type check
```
$ npm run typecheck
✓ tsc -b — no errors
```

### Build
```
$ npm run build
✓ tsc -b clean
✓ 1946 modules transformed
dist/index.html                     0.46 KB │ gzip:  0.31 KB
dist/assets/index-DO7j-F8t.css    103.96 KB │ gzip: 16.66 KB
dist/assets/index-CZ-aBZr_.js     295.01 KB │ gzip: 95.03 KB
✓ built in 2.27s
```

### Tests
```
$ npm test
✓ Test Files  13 passed (13)
✓      Tests  73 passed (73)
✓   Duration  5.94s
```

### Coverage (V8 provider)
```
File              | % Stmts | % Branch | % Funcs | % Lines
------------------|---------|----------|---------|--------
All files         |   57.48 |    48.54 |    54.8 |   59.22
 app/lib          |   81.65 |    72.83 |   79.48 |   80.95
 app/lib/hooks    |    97.5 |    81.48 |     100 |     100
 ChatMessage.tsx  |   84.00 |    81.81 |   100   |   95.45
```

`App.tsx` and `AdminDashboard.tsx` are intentionally excluded from unit-level coverage —
they are integration-level surfaces best validated by the existing live tunnel (E2E-style).

---

## 5. Behaviour & API — No Regressions

The refactor was strictly **non-functional**:

- All visual states preserved: typewriter animation, message grouping, smart-scroll FAB, low-confidence amber hint, feedback buttons, categories grid, quick-action chips, admin dashboard modal.
- All event handlers preserved: send on Enter, disabled-send while typing, focus return after typing finishes, follow-up bot messages on confidence < 0.5 / 0.8, "Start Over" reset.
- All API endpoints preserved (`/chat`, `/feedback`, `/intents`, etc.).
- Auto-scroll behaviour identical (tested via `useSmartScroll` unit tests — see `tests/lib/hooks/useSmartScroll.test.tsx`).

---

## 6. Auto Perms — Proposed Allowlist

Writing to `.claude/settings.json` was blocked by a self-modification guardrail. The
proposed allowlist below should be applied manually by the user.

**Path:** `.claude/settings.json` (project-local — does not affect global settings)

```json
{
  "permissions": {
    "allow": [
      "Bash(npm test*)",
      "Bash(npm run build)",
      "Bash(npm run dev)",
      "Bash(npm run typecheck)",
      "Bash(npm run test:*)",
      "Bash(npm install*)",
      "Bash(npm ci)",
      "Bash(npx tsc*)",
      "Bash(npx vitest*)",
      "Bash(git status)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "PowerShell(npm test*)",
      "PowerShell(npm run build)",
      "PowerShell(npm run typecheck)",
      "PowerShell(npm run tunnel:*)",
      "PowerShell(powershell -ExecutionPolicy Bypass -File .\\scripts\\start-trycloudflare.ps1*)",
      "PowerShell(powershell -ExecutionPolicy Bypass -File .\\scripts\\stop-trycloudflare.ps1*)"
    ],
    "deny": [
      "Bash(git push --force*)",
      "Bash(git reset --hard*)",
      "Bash(rm -rf*)",
      "PowerShell(Remove-Item -Recurse -Force*)"
    ]
  }
}
```

---

## 7. Known Gaps / Future Work

1. **`App.tsx` still ~320 lines.** Header, scroll FAB, and quick-action chip strip could be extracted into separate components for smaller files, but each is single-use and small enough that the abstraction wouldn't pay for itself yet.
2. **`AdminDashboard.tsx` has no tests.** It depends on multiple `api.*` calls; a proper test would require a wider fetch mock and is best deferred until the dashboard's design stabilises.
3. **No E2E tests.** Existing live tunnel + manual smoke checks cover the integrated UX path.
4. **Coverage of `app/` overall is 57%.** This is expected — `App.tsx` and `AdminDashboard.tsx` are deliberately excluded from unit-level testing.

---

## 8. How to Run

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# UI mode (Vitest browser UI)
npm run test:ui

# Coverage report
npm run test:coverage

# TypeScript check only
npm run typecheck

# Production build
npm run build
```

---

**End of report.**
