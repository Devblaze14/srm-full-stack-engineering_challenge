import { USER_ID, EMAIL_ID, COLLEGE_ROLL_NUMBER } from "./identity";

export type TreeNode = { [label: string]: TreeNode };

export interface Hierarchy {
  root: string;
  tree: TreeNode;
  depth?: number;
  has_cycle?: true;
}

export interface BfhlResponse {
  user_id: string;
  email_id: string;
  college_roll_number: string;
  hierarchies: Hierarchy[];
  invalid_entries: string[];
  duplicate_edges: string[];
  summary: {
    total_trees: number;
    total_cycles: number;
    largest_tree_root: string;
  };
}

const EDGE_RE = /^[A-Z]->[A-Z]$/;

export function processBfhl(data: unknown): BfhlResponse {
  const invalid_entries: string[] = [];
  const duplicate_edges: string[] = [];

  const rawList = Array.isArray(data) ? data : [];

  const keptEdges: Array<[string, string]> = [];
  const edgeSeen = new Set<string>();
  const dupSeen = new Set<string>();
  const nodeFirstIndex = new Map<string, number>();
  let nodeCounter = 0;

  for (const rawEntry of rawList) {
    if (typeof rawEntry !== "string") {
      invalid_entries.push(String(rawEntry));
      continue;
    }
    const trimmed = rawEntry.trim();
    if (!EDGE_RE.test(trimmed)) {
      invalid_entries.push(rawEntry);
      continue;
    }
    const [parent, child] = trimmed.split("->") as [string, string];
    if (parent === child) {
      invalid_entries.push(rawEntry);
      continue;
    }
    const key = `${parent}->${child}`;
    if (edgeSeen.has(key)) {
      if (!dupSeen.has(key)) {
        dupSeen.add(key);
        duplicate_edges.push(key);
      }
      continue;
    }
    edgeSeen.add(key);
    keptEdges.push([parent, child]);
    if (!nodeFirstIndex.has(parent)) nodeFirstIndex.set(parent, nodeCounter++);
    if (!nodeFirstIndex.has(child)) nodeFirstIndex.set(child, nodeCounter++);
  }

  // First-parent-wins: drop edges whose child already has a parent.
  const parentOf = new Map<string, string>();
  const childrenOf = new Map<string, string[]>();
  const finalEdges: Array<[string, string]> = [];

  for (const [parent, child] of keptEdges) {
    if (parentOf.has(child)) continue;
    parentOf.set(child, parent);
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent)!.push(child);
    finalEdges.push([parent, child]);
  }

  // Union-Find over all nodes appearing in final edges.
  const parentUF = new Map<string, string>();
  const find = (x: string): string => {
    let p = parentUF.get(x) ?? x;
    if (p === x) return x;
    const r = find(p);
    parentUF.set(x, r);
    return r;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parentUF.set(ra, rb);
  };

  for (const n of nodeFirstIndex.keys()) parentUF.set(n, n);
  for (const [p, c] of finalEdges) union(p, c);

  // Group nodes by root.
  const groups = new Map<string, string[]>();
  for (const n of nodeFirstIndex.keys()) {
    const r = find(n);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(n);
  }

  // Order groups by earliest node first-encounter index.
  const groupList = Array.from(groups.values()).sort((a, b) => {
    const ai = Math.min(...a.map((n) => nodeFirstIndex.get(n)!));
    const bi = Math.min(...b.map((n) => nodeFirstIndex.get(n)!));
    return ai - bi;
  });

  const hierarchies: Hierarchy[] = [];

  for (const nodes of groupList) {
    const parentless = nodes.filter((n) => !parentOf.has(n));
    if (parentless.length === 0) {
      // Pure cycle — lex smallest as root.
      const root = [...nodes].sort()[0];
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      // After first-parent-wins, exactly one parentless node per component.
      const root = parentless[0];
      const tree: TreeNode = { [root]: buildSubtree(root, childrenOf) };
      const depth = computeDepth(root, childrenOf);
      hierarchies.push({ root, tree, depth });
    }
  }

  // Summary.
  const trees = hierarchies.filter((h) => !h.has_cycle);
  const cycles = hierarchies.filter((h) => h.has_cycle);
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
      total_cycles: cycles.length,
      largest_tree_root,
    },
  };
}

function buildSubtree(
  node: string,
  childrenOf: Map<string, string[]>
): TreeNode {
  const kids = childrenOf.get(node) ?? [];
  const out: TreeNode = {};
  for (const k of kids) out[k] = buildSubtree(k, childrenOf);
  return out;
}

function computeDepth(
  node: string,
  childrenOf: Map<string, string[]>
): number {
  const kids = childrenOf.get(node) ?? [];
  if (kids.length === 0) return 1;
  return 1 + Math.max(...kids.map((k) => computeDepth(k, childrenOf)));
}
