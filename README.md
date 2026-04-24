# BFHL — SRM Full Stack Challenge

A Next.js app that exposes `POST /bfhl`, parses arrays of edge strings
(`"A->B"`) into hierarchical trees, detects cycles, and returns structured
insights. Ships with a single-page UI for interactive use.

## API

**`POST /bfhl`** — `Content-Type: application/json`

Request:

```json
{ "data": ["A->B", "A->C", "B->D"] }
```

Response fields: `user_id`, `email_id`, `college_roll_number`,
`hierarchies[]`, `invalid_entries[]`, `duplicate_edges[]`, `summary`.

CORS is enabled for all origins. Preflight `OPTIONS` returns 204.

## Local development

```bash
npm install
npm test           # unit tests (vitest)
npm run dev        # dev server at http://localhost:3000
npm run build && npm start   # production build
```

Smoke test:

```bash
curl -X POST http://localhost:3000/bfhl \
  -H 'Content-Type: application/json' \
  -d '{"data":["A->B","A->C","B->D","C->E","E->F","X->Y","Y->Z","Z->X","P->Q","Q->R","G->H","G->H","G->I","hello","1->2","A->"]}'
```

## Project layout

- `app/bfhl/route.ts` — route handler (POST + OPTIONS, CORS).
- `app/page.tsx` — frontend (textarea, submit, tree view).
- `lib/bfhl.ts` — pure algorithm: validate → dedupe → first-parent-wins →
  group (union-find) → classify (tree or pure cycle) → summarize.
- `lib/identity.ts` — `user_id`, `email_id`, `college_roll_number`.
- `lib/__tests__/bfhl.test.ts` — spec example + edge-case tests.

## Processing rules (summary)

1. Trim then match `^[A-Z]->[A-Z]$`; self-loops are invalid.
2. Duplicate edges: first occurrence kept; later ones go to
   `duplicate_edges` once each.
3. Multi-parent: first parent edge wins; later parent edges for the same
   child are silently discarded.
4. A group with a parentless node renders as a tree; a pure cycle renders
   with `has_cycle: true`, `tree: {}`, and the lexicographically smallest
   node as root.
5. `depth` = node count on the longest root-to-leaf path.
6. `largest_tree_root` ties broken by lexicographically smallest root.

## Deploy (Vercel)

1. Push this repo to GitHub (public).
2. Import the repo in Vercel — framework auto-detects as Next.js.
3. Submit the Vercel URL (evaluator appends `/bfhl`) and the repo URL.
