## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## graphify — first-time setup (after clone)

The committed graph (`graphify-out/graph.json`) only stays in sync if each contributor wires up graphify locally once after cloning (git hooks and the merge driver live in `.git/`, which is not versioned):

```bash
graphify claude install   # PreToolUse hook + this CLAUDE.md section (Claude Code)
graphify hook install     # post-commit/post-checkout hooks: auto-refresh the committed graph
git config merge.graphify-union.driver "graphify merge-driver %O %A %B"   # union-merge graph.json (paired with .gitattributes)
```

Install graphify first if needed: `uv tool install graphifyy` (note the double `y`).
