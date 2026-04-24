// Pipeline: one pass classifies each raw entry (invalid / duplicate / kept),
// enforces first-parent-wins while recording adjacency. A separate BFS walk
// groups connected components; each group renders either as a tree with depth
// (single-walk post-order DFS) or as a pure cycle with the lex-smallest root.

import { USER_ID, EMAIL_ID, COLLEGE_ROLL_NUMBER } from "./identity";
import type { BfhlPayload, EdgeTree, HierarchyItem } from "./types";

export type { BfhlPayload, EdgeTree, HierarchyItem } from "./types";

const SINGLE_UPPER = /^[A-Z]$/;

function isValidEdge(raw: string): [string, string] | null {
  const parts = raw.split("->");
  if (parts.length !== 2) return null;
  const [p, c] = parts;
  if (!SINGLE_UPPER.test(p) || !SINGLE_UPPER.test(c)) return null;
  if (p === c) return null;
  return [p, c];
}

export function analyzeEdges(data: unknown): BfhlPayload {
  const invalid_entries: string[] = [];
  const duplicate_edges: string[] = [];
  const firstParent = new Map<string, string>();
  const childMap = new Map<string, string[]>();
  const adjacency = new Map<string, Set<string>>();
  const nodeOrder = new Map<string, number>();
  const seenKeys = new Set<string>();
  const reportedDupes = new Set<string>();

  const touchNode = (n: string) => {
    if (!nodeOrder.has(n)) nodeOrder.set(n, nodeOrder.size);
    if (!adjacency.has(n)) adjacency.set(n, new Set());
  };

  const raw = Array.isArray(data) ? data : [];

  for (const entry of raw) {
    if (typeof entry !== "string") {
      invalid_entries.push(String(entry));
      continue;
    }
    const parsed = isValidEdge(entry.trim());
    if (!parsed) {
      invalid_entries.push(entry);
      continue;
    }
    const [p, c] = parsed;
    const key = `${p}->${c}`;

    if (seenKeys.has(key)) {
      if (!reportedDupes.has(key)) {
        reportedDupes.add(key);
        duplicate_edges.push(key);
      }
      continue;
    }
    seenKeys.add(key);
    touchNode(p);
    touchNode(c);

    if (!firstParent.has(c)) {
      firstParent.set(c, p);
      if (!childMap.has(p)) childMap.set(p, []);
      childMap.get(p)!.push(c);
      adjacency.get(p)!.add(c);
      adjacency.get(c)!.add(p);
    }
  }

  const hierarchies: HierarchyItem[] = [];
  const visited = new Set<string>();
  const orderedNodes = [...nodeOrder.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([n]) => n);

  for (const seed of orderedNodes) {
    if (visited.has(seed)) continue;

    const component: string[] = [];
    const queue: string[] = [seed];
    visited.add(seed);
    while (queue.length) {
      const n = queue.shift()!;
      component.push(n);
      for (const neighbour of adjacency.get(n)!) {
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          queue.push(neighbour);
        }
      }
    }

    const roots = component.filter((n) => !firstParent.has(n));
    if (roots.length === 0) {
      hierarchies.push({
        root: [...component].sort()[0],
        tree: {},
        has_cycle: true,
      });
    } else {
      const root = roots[0];
      const walk = (node: string): { sub: EdgeTree; depth: number } => {
        const kids = childMap.get(node) ?? [];
        const sub: EdgeTree = {};
        let maxChild = 0;
        for (const k of kids) {
          const { sub: childSub, depth } = walk(k);
          sub[k] = childSub;
          if (depth > maxChild) maxChild = depth;
        }
        return { sub, depth: 1 + maxChild };
      };
      const { sub, depth } = walk(root);
      hierarchies.push({ root, tree: { [root]: sub }, depth });
    }
  }

  const trees = hierarchies.filter((h) => !h.has_cycle);
  const cycles = hierarchies.length - trees.length;
  let largest_tree_root = "";
  if (trees.length > 0) {
    const maxDepth = Math.max(...trees.map((t) => t.depth!));
    largest_tree_root = trees
      .filter((t) => t.depth === maxDepth)
      .map((t) => t.root)
      .sort()[0];
  }

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL_NUMBER,
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees: trees.length,
      total_cycles: cycles,
      largest_tree_root,
    },
  };
}
