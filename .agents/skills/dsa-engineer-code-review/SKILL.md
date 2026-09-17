---
name: dsa-engineer-code-review
description: >
  Deep DSA-level code and architecture review. Automatically spawns a specialized
  DSA subagent to trace end-to-end execution paths, calculate time/space complexities,
  analyze database query patterns (B-Tree lookups vs full table scans, joins, indexes),
  event loop bottlenecks, and provide exact algorithmic performance audits.
  Trigger when user mentions "dsa review", "dsa analysis", "dsa trace", "complexity analysis",
  "dsa-engineer", or "/dsa-review".
---

# DSA Engineer & Algorithmic Code Review Skill

When invoked, this skill conducts an algorithmic deep dive into the requested code or queries, specifically modeling performance at scale (e.g., 10K, 1 Lakh, 1 Crore rows).

## 🚀 Execution Workflow

1. **Spawn Specialized Subagent**:
   Invoke subagent `research` or `self` with role `DSA Performance Engineer`.
   Provide prompt instructions to:
   - Trace the end-to-end execution pipeline from input/trigger to database/output.
   - Profile the data structures used (e.g., B-Tree, Hash Maps, Priority Queues, Ring Buffers).
   - Compute Big-O Time & Space Complexity ($O(1)$, $O(\log N)$, $O(N)$, $O(N^2)$, $O(N \times Q)$).
   - Identify database access patterns (B-Tree Seek vs Sequential Full Table Scan, correlated subqueries vs Hash Joins).
   - Identify Single-Thread / Event-Loop blocking bottlenecks.

2. **Output Format**:
   Deliver a high-impact, formatted breakdown:
   - **Pipeline Execution Trace Table**: Step, Data Structure, Algorithm, Operations, Estimated Latency ($T_{before}$ vs $T_{after}$).
   - **Database Complexity Breakdown**: Scan vs Seek operations, B-Tree level comparisons ($\log_2 N$).
   - **Event-Loop & Concurrency Audit**: Synchronous lock blocks, memory footprints (RAM allocation, OOM risks).
   - **Algorithmic Solutions / Index Fixes**: Concrete minimal patches that transition nested loops $O(N \times M)$ to indexed lookups $O(N \log M)$ or $O(1)$.
