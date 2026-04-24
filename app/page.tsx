"use client";

import { useState } from "react";
import type {
  BfhlPayload as BfhlResponse,
  EdgeTree as TreeNode,
  HierarchyItem as Hierarchy,
} from "@/lib/types";

const EXAMPLE = [
  "G->H",
  "G->H",
  "G->I",
  "X->Y",
  "Y->Z",
  "Z->X",
  "P->Q",
  "Q->R",
  "A->B",
  "A->C",
  "B->D",
  "C->E",
  "E->F",
  "hello",
  "1->2",
  "A->",
].join("\n");

function parseInput(raw: string): string[] {
  const t = raw.trim();
  if (t.startsWith("[")) {
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // fall through to line-split
    }
  }
  return t
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function TreeView({ node }: { node: TreeNode }) {
  const entries = Object.entries(node);
  if (entries.length === 0) return null;
  return (
    <ul>
      {entries.map(([label, children]) => {
        const isLeaf = Object.keys(children).length === 0;
        return (
          <li key={label}>
            <span className={isLeaf ? "leaf" : ""}>{label}</span>
            <TreeView node={children} />
          </li>
        );
      })}
    </ul>
  );
}

export default function Home() {
  const [input, setInput] = useState(EXAMPLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BfhlResponse | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const data = parseInput(input);
      const res = await fetch("/bfhl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const json = (await res.json()) as BfhlResponse;
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <p className="subtitle">&lt;BFHL / HIERARCHY ANALYZER&gt;</p>
      <h1>Hierarchy Signal Processor</h1>
      <p className="subtitle">
        Paste edges like <code>A-&gt;B</code> (one per line, comma-separated, or a JSON array).
        Submits to <code>/bfhl</code>.
      </p>

      <section className="panel" data-title="/INPUT">
        <label htmlFor="input">Edges</label>
        <textarea
          id="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
        />
        <div className="row">
          <button onClick={submit} disabled={loading}>
            {loading ? "Processing…" : "Submit"}
          </button>
          <button
            className="btn-ghost"
            onClick={() => setInput(EXAMPLE)}
            disabled={loading}
          >
            Load example
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              setInput("");
              setResult(null);
              setError(null);
            }}
            disabled={loading}
          >
            Clear
          </button>
          <span className="hint">
            Tip: valid entries look like <code>X-&gt;Y</code> (single uppercase letters).
          </span>
        </div>
        {error && <div className="error">Request failed — {error}</div>}
      </section>

      {result && (
        <>
          <section className="panel" data-title="/IDENTITY">
            <h2>Identity</h2>
            <div className="identity">
              <div className="ikv">
                <div className="k">user_id</div>
                <div className="v">{result.user_id}</div>
              </div>
              <div className="ikv">
                <div className="k">email_id</div>
                <div className="v">{result.email_id}</div>
              </div>
              <div className="ikv">
                <div className="k">college_roll_number</div>
                <div className="v">{result.college_roll_number}</div>
              </div>
            </div>
          </section>

          <section className="panel" data-title="/HIERARCHIES">
            <h2>Hierarchies ({result.hierarchies.length})</h2>
            {result.hierarchies.length === 0 ? (
              <p className="empty">No valid hierarchies.</p>
            ) : (
              <div className="grid">
                {result.hierarchies.map((h, i) => (
                  <div className="hcard" key={`${h.root}-${i}`}>
                    <div className="hcard-head">
                      <span className="badge">root: {h.root}</span>
                      {h.has_cycle ? (
                        <span className="badge cycle">cycle</span>
                      ) : (
                        <span className="badge depth">depth: {h.depth}</span>
                      )}
                    </div>
                    {h.has_cycle ? (
                      <p className="empty">Cyclic group — no tree to render.</p>
                    ) : (
                      <ul className="tree">
                        {Object.entries(h.tree).map(([label, children]) => (
                          <li key={label}>
                            <span>{label}</span>
                            <TreeView node={children} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel" data-title="/INVALID">
            <h2>Invalid entries ({result.invalid_entries.length})</h2>
            {result.invalid_entries.length === 0 ? (
              <p className="empty">None.</p>
            ) : (
              <div className="chips">
                {result.invalid_entries.map((e, i) => (
                  <span className="chip warn" key={i}>
                    {JSON.stringify(e)}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="panel" data-title="/DUPLICATES">
            <h2>Duplicate edges ({result.duplicate_edges.length})</h2>
            {result.duplicate_edges.length === 0 ? (
              <p className="empty">None.</p>
            ) : (
              <div className="chips">
                {result.duplicate_edges.map((e, i) => (
                  <span className="chip" key={i}>
                    {e}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="panel" data-title="/SUMMARY">
            <h2>Summary</h2>
            <div className="summary">
              <div className="ikv">
                <div className="k">total_trees</div>
                <div className="v">{result.summary.total_trees}</div>
              </div>
              <div className="ikv">
                <div className="k">total_cycles</div>
                <div className="v">{result.summary.total_cycles}</div>
              </div>
              <div className="ikv">
                <div className="k">largest_tree_root</div>
                <div className="v">{result.summary.largest_tree_root || "—"}</div>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
