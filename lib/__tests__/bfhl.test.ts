import { describe, it, expect } from "vitest";
import { analyzeEdges } from "../bfhl";

describe("analyzeEdges — PDF example", () => {
  it("matches the expected response from the spec", () => {
    const res = analyzeEdges([
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

    for (const h of res.hierarchies) {
      if (!h.has_cycle) expect(h).not.toHaveProperty("has_cycle");
      if (h.has_cycle) expect(h).not.toHaveProperty("depth");
    }
  });
});

describe("analyzeEdges — validation", () => {
  it("rejects non-edge-shaped strings", () => {
    const res = analyzeEdges(["hello", "A-B", "AB->C", "1->2", "A->", "", "A->A"]);
    expect(res.invalid_entries).toEqual(["hello", "A-B", "AB->C", "1->2", "A->", "", "A->A"]);
    expect(res.hierarchies).toEqual([]);
  });

  it("trims whitespace before validating", () => {
    const res = analyzeEdges([" A->B "]);
    expect(res.invalid_entries).toEqual([]);
    expect(res.hierarchies).toEqual([
      { root: "A", tree: { A: { B: {} } }, depth: 2 },
    ]);
  });

  it("treats self-loops as invalid", () => {
    const res = analyzeEdges(["A->A"]);
    expect(res.invalid_entries).toEqual(["A->A"]);
    expect(res.hierarchies).toEqual([]);
  });
});

describe("analyzeEdges — duplicates", () => {
  it("records each duplicate once regardless of repetition count", () => {
    const res = analyzeEdges(["A->B", "A->B", "A->B"]);
    expect(res.duplicate_edges).toEqual(["A->B"]);
    expect(res.hierarchies).toEqual([
      { root: "A", tree: { A: { B: {} } }, depth: 2 },
    ]);
  });
});

describe("analyzeEdges — multi-parent / diamond", () => {
  it("keeps the first parent edge and discards the later one silently", () => {
    const res = analyzeEdges(["A->D", "B->D"]);
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

describe("analyzeEdges — cycles", () => {
  it("detects a pure cycle and uses lex smallest as root", () => {
    const res = analyzeEdges(["X->Y", "Y->Z", "Z->X"]);
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
    const res = analyzeEdges(["A->B", "B->A"]);
    expect(res.hierarchies).toEqual([
      { root: "A", tree: {}, has_cycle: true },
    ]);
  });
});

describe("analyzeEdges — summary tiebreaker", () => {
  it("breaks depth ties with lex smallest root", () => {
    const res = analyzeEdges(["B->C", "A->D"]);
    expect(res.summary.largest_tree_root).toBe("A");
    expect(res.summary.total_trees).toBe(2);
  });
});

describe("analyzeEdges — empty / non-array input", () => {
  it("returns empty structures for empty array", () => {
    const res = analyzeEdges([]);
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
    const res = analyzeEdges(null);
    expect(res.hierarchies).toEqual([]);
  });
});

describe("analyzeEdges — identity fields", () => {
  it("includes the configured user identity", () => {
    const res = analyzeEdges([]);
    expect(res.user_id).toMatch(/^[a-z]+_\d{8}$/);
    expect(res.email_id).toContain("@");
    expect(res.college_roll_number.length).toBeGreaterThan(0);
  });
});
