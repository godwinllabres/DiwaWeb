# API contract

`chatbot-openapi.json` is an OpenAPI 3.1.0 document describing the `sevi-api`
back end (`Cavite-State-University-Official/sevi-api`). It is the contract that
`app/lib/types.ts` is hand-maintained against — there is no code generation.

## Provenance

| | |
|---|---|
| Entered this repo | 2026-05-11, commit `e9d12b7` |
| Declared version | `info.version` 1.0.0, `openapi` 3.1.0 |
| Source ref | **not recorded** — it was pasted in, not exported by a tracked step |

It previously lived at `imports/pasted_text/chatbot-api.json`, a path named after
how the file arrived rather than what it is.

## It is out of date — do not treat it as authoritative

The document declares 20 paths. It describes **none** of the surfaces the web app
currently calls:

- `/auth/login`, `/auth/logout`, `/auth/whoami` — used by `app/lib/hooks/useAuth.ts`
- `/ais/write` — the AIS write path referenced by the same hook
- `/admin/*` — used by `app/lib/adminApi.ts`

So this file predates at least the AIS authentication work and the admin
decoupling. Read it as a historical snapshot of the chat and logging surface,
and treat `sevi-api` itself as the source of truth until it is refreshed.

## Refreshing it

Export from the running API rather than pasting from a browser, and record the
`sevi-api` commit in the table above in the same change:

```bash
curl -s http://127.0.0.1:8009/openapi.json | python -m json.tool \
  > docs/api/chatbot-openapi.json
```
