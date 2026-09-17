---
name: dsa-engineer-code-review
description: >
  Deep DSA-level code, database, and architecture review. Spawns a specialized
  DSA subagent to trace end-to-end execution paths, calculate mathematical time/space complexities,
  analyze database query patterns (B-Tree lookups vs full table scans, joins, indexes),
  event loop bottlenecks, memory footprints at scale (10K, 1 Lakh, 1 Crore rows),
  and provide exact algorithmic performance audits. Trigger when user mentions "dsa review",
  "dsa analysis", "dsa trace", "complexity analysis", "dsa-engineer", or "/dsa-review".
---

# DSA Performance Engineer & Algorithmic Code Review Skill

Conduct rigorous DSA performance audits and execution traces across the entire software stack.

## 🤖 Subagent Invocation Directive

When triggered, immediately spawn a dedicated subagent to isolate intensive trace analysis:
```javascript
invoke_subagent({
  Subagents: [{
    TypeName: "research",
    Role: "DSA Performance Engineer",
    Model: "inherit",
    Prompt: "Perform an exhaustive DSA execution trace and complexity analysis on the target feature/queries. Trace the pipeline through: 1. Frontend DOM/Event layer, 2. Network/Transport, 3. Event-Loop/Concurrency, 4. Database Engine (B-Trees, Scans, Joins, Locks), 5. Serialization/Memory, 6. DOM Tree Construction and Reflow. Model operations at 10K, 1 Lakh, and 1 Crore scale. Provide an exact comparative scoreboard and minimal algorithmic/index fixes."
  }]
})
```

---

## 🔬 Core 6-Phase Tracing Protocol

Every review must trace the execution pipeline end-to-end:

### Phase 1: Frontend Event & Client Data Structures
- **DOM Access**: Query selectors (`getElementById` $O(1)$ hash lookup vs `querySelectorAll` $O(N)$ tree walk).
- **Class / Attribute Mutations**: Set operations on `DOMTokenList` ($O(K)$).
- **String Construction**: Template literal interpolation, Rope data structure concatenation, `escapeHtml` character scanning ($O(L)$ per string).

### Phase 2: Network & Transport Serialization
- **Payload Framing**: HTTP/1.1 vs HTTP/2 multiplexed streams, TCP Ring Buffers, TLS overhead.
- **Serialization Costs**: `JSON.stringify()` DFS object graph traversal ($O(V + E)$), gzip compression (LZ77 + Huffman coding).

### Phase 3: Server Concurrency & Event Loop
- **Thread Model**: Node.js single-threaded event loop blocking vs Worker threads.
- **Synchronous Locking**: CPU-bound loops, synchronous I/O (`DatabaseSync`), SQLite write lock contention, head-of-line request queue blocking.
- **Memory Footprint**: Heap allocation ($O(N \times \text{row\_size})$), V8 garbage collection pauses, out-of-memory (OOM) risks at $10^7$ rows.

### Phase 4: Database Engine Execution (SQLite / Postgres / MySQL)
- **Table Storage Structure**: Clustered B-Trees, Heap files, rowid indexing.
- **Access Paths**:
  - Full Table Scan (Sequential scan of all leaf pages: $O(N)$).
  - Index Seek + Range Scan (B-Tree traversal $\lceil\log_B N\rceil$ + sequential leaf pointer scan: $O(\log N + K)$).
  - Covering Index lookup (Zero heap/table fetches).
- **Join Algorithms**:
  - Nested Loop Join without index ($O(N \times M)$ — Cartesian-scale freeze).
  - Index Nested Loop Join ($O(N \log M)$).
  - Hash Join / Merge Join ($O(N + M)$).
- **Aggregation & Sorting**:
  - `COUNT(*)` with full table scan vs summary counters ($O(1)$).
  - `COUNT(DISTINCT ...)` temporary hash sets.
  - `ORDER BY ... LIMIT K` Top-N Min/Max Heap ($O(N \log K)$) vs indexed B-Tree reverse traversal ($O(1)$).

### Phase 5: Response Parsing & Deserialization
- **Client Parsing**: `JSON.parse()` recursive descent tokenizer/lexer ($O(\text{chars})$).
- **Memory Allocation**: Object allocations, string interning in V8 engine.

### Phase 6: Client DOM Construction & GPU Rendering
- **Tree Destruction**: Post-order DFS subtree detachment.
- **HTML Tokenizer**: HTML5 state machine transition per character.
- **Tree Builder**: Stack-based open element push/pop ($O(\text{tokens})$).
- **Layout Reflow (Recalculate Style)**: Two-pass table layout algorithms ($O(\text{rows} \times \text{cols})$).
- **Composite & Paint**: GPU render tree rasterization ($O(\text{visible nodes})$).

---

## 📊 Standard Deliverable Scoreboard

Always format final results in this exact structure:

```markdown
### Pipeline Execution Trace: (Feature Name)

| Phase | Data Structure | Algorithm | ❌ Before | ✅ After |
|---|---|---|---|---|
| DOM Query | Hash Map | Hash lookup | 0.001ms | 0.001ms |
| Network Transport | TCP/TLS | HTTP/2 stream | 50ms | 50ms |
| Server Event Loop | FIFO Queue | Async non-blocking | 0.01ms | 0.01ms |
| DB Query Execution | B-Tree (table/index) | Full Scan vs B-Tree Seek | **800ms 🔥** | **0.05ms ✅** |
| Memory / Serialization| Object Graph | DFS Traversal | 0.05ms | 0.05ms |
| DOM Tree Build & Reflow| N-ary DOM Tree | Stack parser + 2-pass reflow | 4ms | 4ms |
| **TOTAL** | | | **~3.9s** | **~104ms** |
```

### Scale Modeling Check (10K vs 1 Lakh vs 1 Crore)
State the mathematical formula showing why unindexed queries degrade exponentially ($O(A \times Q)$ vs $O(A(\log Q + K))$), identifying exact operation counts (e.g. 500 Crore operations vs 2.6 Lakh operations).

---

## 🛠️ Output Rule
Focus on **algorithmic root causes and minimal working code/index patches**. Do not provide generic high-level advice — provide exact Big-O proofs and concrete solutions (compound indexes, batch chunking, summary counters, streaming).
