import { describe, it, expect } from "vitest";
import { processBfhl } from "../bfhl";

describe("processBfhl — PDF example", () => {
  it("matches the expected response from the spec", () => {
    const res = processBfhl([
      "A->B", "A->C", "B->D", "C->E", "E->F",
      "X->Y", "Y->Z", "Z->X",
      "P->Q", "Q->R",
      "G->H", "G->H", "G->I",
      "hello", "1->2", "A->",
    ]);

    expect(res.hierarchies).toEqual([
      {
        root: "A",
        tree: { A: { B: { D: {} }, C: { E: { F: {} } } } },
        depth: 4,
      },
      { root: "X", tree: {}, has_cycle: true },
      { root: "P", tree: { P: { Q: { R: {} } } }, depth: 3 },
      { root: "G", tree: { G: { H: {}, I: {} } }, depth: 2 },
    ]);
    expect(res.invalid_entries).toEqual(["hello", "1->2", "A->"]);
    expect(res.duplicate_edges).toEqual(["G->H"]);
    expect(res.summary).toEqual({
      total_trees: 3,
      total_cycles: 1,
      largest_tree_root: "A",
    });
  });
});

describe("processBfhl — validation", () => {
  it("rejects non-edge-shaped strings", () => {
    const res = processBfhl(["hello", "A-B", "AB->C", "1->2", "A->", "", "A->A"]);
    expect(res.invalid_entries).toEqual(["hello", "A-B", "AB->C", "1->2", "A->", "", "A->A"]);
    expect(res.hierarchies).toEqual([]);
  });

  it("trims whitespace before validating", () => {
    const res = processBfhl([" A->B "]);
    expect(res.invalid_entries).toEqual([]);
    expect(res.hierarchies).toEqual([
      { root: "A", tree: { A: { B: {} } }, depth: 2 },
    ]);
  });

  it("treats self-loops as invalid", () => {
    const res = processBfhl(["A->A"]);
    expect(res.invalid_entries).toEqual(["A->A"]);
    expect(res.hierarchies).toEqual([]);
  });
});

describe("processBfhl — duplicates", () => {
  it("records each duplicate once regardless of repetition count", () => {
    const res = processBfhl(["A->B", "A->B", "A->B"]);
    expect(res.duplicate_edges).toEqual(["A->B"]);
    expect(res.hierarchies).toEqual([
      { root: "A", tree: { A: { B: {} } }, depth: 2 },
    ]);
  });
});

describe("processBfhl — multi-parent / diamond", () => {
  it("keeps the first parent edge and discards the later one silently", () => {
    const res = processBfhl(["A->D", "B->D"]);
    // A->D kept (A is root, D child). B->D dropped (D already has parent A).
    // B becomes its own one-node tree? No — B appears only as an orphan parent with no children kept.
    // Actually B is a node with no parent and no children after the drop.
    // UF connects A-D (via kept), and B stands alone (its edge was dropped, so B has no edges in finalEdges).
    // But B was added to nodeFirstIndex when the edge B->D was recorded as a kept-unique edge (before first-parent-wins).
    // So B is in the union-find, standing alone as its own group.
    expect(res.hierarchies).toContainEqual({
      root: "A",
      tree: { A: { D: {} } },
      depth: 2,
    });
    expect(res.hierarchies).toContainEqual({
      root: "B",
      tree: { B: {} },
      depth: 1,
    });
  });
});

describe("processBfhl — cycles", () => {
  it("detects a pure cycle and uses lex smallest as root", () => {
    const res = processBfhl(["X->Y", "Y->Z", "Z->X"]);
    expect(res.hierarchies).toEqual([
      { root: "X", tree: {}, has_cycle: true },
    ]);
    expect(res.summary).toEqual({
      total_trees: 0,
      total_cycles: 1,
      largest_tree_root: "",
    });
  });

  it("detects mutual cycle A<->B", () => {
    const res = processBfhl(["A->B", "B->A"]);
    expect(res.hierarchies).toEqual([
      { root: "A", tree: {}, has_cycle: true },
    ]);
  });
});

describe("processBfhl — summary tiebreaker", () => {
  it("breaks depth ties with lex smallest root", () => {
    const res = processBfhl(["B->C", "A->D"]);
    // Both trees depth 2. Lex smaller root = A.
    expect(res.summary.largest_tree_root).toBe("A");
    expect(res.summary.total_trees).toBe(2);
  });
});

describe("processBfhl — empty / non-array input", () => {
  it("returns empty structures for empty array", () => {
    const res = processBfhl([]);
    expect(res.hierarchies).toEqual([]);
    expect(res.invalid_entries).toEqual([]);
    expect(res.duplicate_edges).toEqual([]);
    expect(res.summary).toEqual({
      total_trees: 0,
      total_cycles: 0,
      largest_tree_root: "",
    });
  });

  it("treats non-array input as empty", () => {
    const res = processBfhl(null);
    expect(res.hierarchies).toEqual([]);
  });
});

describe("processBfhl — identity fields", () => {
  it("includes the configured user identity", () => {
    const res = processBfhl([]);
    expect(res.user_id).toMatch(/^[a-z]+_\d{8}$/);
    expect(res.email_id).toContain("@");
    expect(res.college_roll_number.length).toBeGreaterThan(0);
  });
});
