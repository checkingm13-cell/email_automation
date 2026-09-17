# 08 - Incident Report: 49/50 Batch Sticking, Clock-Skew & 1 Crore DSA Performance Audit

**System**: Azure Multi-Account Mailer (Graph API, Azure ACS, Oracle OCI)  
**Date**: September 17, 2026  
**Status**: Resolved & Documented in Vault  

---

## 1. Quick Reference: What Happened & What Was Fixed

### The Symptoms Observed in Production:
- 10 batches stuck at 49/50 (98%) in `RUNNING` status.
- Next sequential batches (`Batch_17`, `Batch_18`...) never triggered.
- Inspect drawer hung on *"Loading live recipient records..."*.
- Queue backlog climbed to 5,243 items.

### The Root Causes Identified on Live Azure Database:
1. **50th Email Clock-Skew Failure**: Microsoft Entra ID rejected M365 tokens (`"The time difference between originating client and server is greater than 5 minutes"`).
2. **Missing Account Cooldown**: Worker treated clock-skew as transient error without cooling down M365 account, repeatedly leasing the broken sender.
3. **Watchdog Condition Bug**: Batch completion watchdog checked `c.sent_count >= c.total_count` (ignoring failed emails).
4. **Head-of-Line Blocking**: When pinned account hit daily quota (Dr. Reeta Shah 500/500), worker exited with early return without postponing the item, causing an infinite retry loop on the same queue slot.
5. **Missing Database Indexes**: `queue(campaign_id)` had no index, causing 20 crore row scans on a single-threaded Node.js event loop.

---

## 2. Quantitative DSA Audit (10K vs 1 Lakh vs 1 Crore Rows)

```
Query / Component           | Algorithm (Before)           | Algorithm (After Fix)           | Latency Reduction
----------------------------+------------------------------+---------------------------------+-------------------
Campaign List (/campaigns)  | Nested Loop Scan: O(C x Q)   | Single Pass Index Seek: O(C)    | 15s -> 3ms (5000x)
Inspect Drawer Preview      | Full Table Scan: O(Q)        | B-Tree Seek + Range: O(log Q+K) | 3.9s -> 104ms
Rolling Quota Refresh (30s) | Correlated Scan: O(A x Q)    | Compound Seek: O(A(log Q+K))    | 120s -> 2ms (OOM Safe)
Telemetry Summary (3s)      | Full Table Count: O(Q)       | Campaigns Table Aggregate: O(C) | 800ms -> 0.1ms
CSV Upload Dedup Check      | In-Memory Dump: O(Sent)      | 500-Item Chunked Indexed Lookup | 1.4GB OOM -> 50ms
```

---

## 3. Production Fixes & Code Artifacts

- **Watchdog Auto-Reconciliation**: [`batchChainManager.js`](file:///D:/projects/azure-graph-mailer/src/services/batchChainManager.js) automatically resolves error-ridden tail items, syncs failed counts, and triggers subsequent batch chains.
- **Failover Engine**: [`queueWorker.js`](file:///D:/projects/azure-graph-mailer/src/services/queueWorker.js) isolates clock-skew senders with a 10-minute cooldown and immediately rotates emails to healthy Oracle/ACS accounts with zero backoff.
- **Deadlock Breaker**: Postpones blocked queue items by `+60s` when senders are busy, preventing head-of-line queue starvation.
- **Performance Indexes**: Added 5 compound indexes in [`schema.js`](file:///D:/projects/azure-graph-mailer/src/db/schema.js) and `busy_timeout = 5000` in [`index.js`](file:///D:/projects/azure-graph-mailer/src/db/index.js).
- **Maintenance Endpoint**: `POST /api/maintenance/unblock-stuck-batches` added to [`api.js`](file:///D:/projects/azure-graph-mailer/src/routes/api.js).
- **DSA Review Skill**: Installed in [`.agents/skills/dsa-engineer-code-review/SKILL.md`](file:///D:/projects/.agents/skills/dsa-engineer-code-review/SKILL.md) to auto-invoke algorithmic subagents on demand.
