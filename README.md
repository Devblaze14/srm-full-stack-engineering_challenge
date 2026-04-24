# Hierarchy Signal Processor

A Next.js app built for the SRM Full Stack Engineering Challenge. It exposes a single `POST /bfhl` endpoint that takes a raw list of edge strings, figures out what's valid, builds the trees, detects cycles, and hands back a clean structured response — all in one shot.

There's also a frontend so you can poke at it without touching a terminal.

---

## API

**`POST /bfhl`** — `Content-Type: application/json`

```json
{ "data": ["A->B", "A->C", "B->D"] }
```

Response includes:

| Field | What it is |
|---|---|
| `user_id` | `fullname_ddmmyyyy` format |
| `email_id` | College email |
| `college_roll_number` | Roll number |
| `hierarchies` | Array of tree or cycle objects |
| `invalid_entries` | Strings that didn't match the valid format |
| `duplicate_edges` | Repeated edges (first occurrence is kept, rest go here) |
| `summary` | `total_trees`, `total_cycles`, `largest_tree_root` |

CORS is open to all origins. Preflight `OPTIONS` returns 204.

---

## Running locally

```bash
npm install
npm test          # unit tests via vitest
npm run dev       # http://localhost:3000
npm run build && npm start
```

Quick smoke test (Windows — use `curl.exe`):

```bash
curl.exe -X POST http://localhost:3000/bfhl \
  -H "Content-Type: application/json" \
  --data-binary "@payload.json"
```

---

## How it works

The algorithm runs in a single pass over the input. As each entry comes in, it's trimmed and checked — each side of `->` must be exactly one uppercase letter, no self-loops. Invalid entries are collected immediately. Duplicates are flagged once (no matter how many times they repeat) and the first occurrence is kept. The first-parent-wins rule is enforced here too: if a child node already has a recorded parent, any later edge pointing to that same child is silently dropped.

Kept edges populate an undirected adjacency map. Once the pass is done, iterative BFS discovers connected components in first-encounter order. For each component:

- If every node has a parent recorded → it's a pure cycle. Root is the lexicographically smallest node, `tree` is `{}`, `has_cycle: true`, no `depth`.
- Otherwise → the one parentless node is the root. A single post-order DFS walk builds the nested `tree` object and computes `depth` at the same time.

The summary tallies up non-cyclic trees, cycles, and picks the deepest tree root (lex-smallest on ties).

---

## Project structure

```
app/
  bfhl/route.ts     → POST handler + OPTIONS preflight
  page.tsx          → single-page frontend
  globals.css       → styles
lib/
  bfhl.ts           → core algorithm (analyzeEdges)
  types.ts          → shared TypeScript types
  cors.ts           → withCors helper
  identity.ts       → user_id, email_id, college_roll_number
  __tests__/
    bfhl.test.ts    → spec example + edge case coverage
```


