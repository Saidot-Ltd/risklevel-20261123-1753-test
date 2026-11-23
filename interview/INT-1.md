# INT-1 — Atomic, tenant-safe risk-level changes

**Time: about 30 minutes, including verification.** Follow-up cards may come after it.

`setSystemRiskLevel` / `PATCH /systems/:systemId/risk-level` can leave inconsistent
state on failure and trusts caller-supplied identity. The web page can show a risk
level that was never saved. Investigate and fix both.

Use your AI assistant as you normally would. Keep it on the shared screen.

## Acceptance, in priority order

1. Organisation and audit actor come from the session. Cross-organisation access
   returns not found, with no writes and no notifications.
2. The risk-level and audit writes are atomic.
3. Events and notifications happen after commit. A delivery failure is logged, and
   the committed save still succeeds.
4. After a failed save, the web row shows the stored value and the error stays visible.
5. A regression test fails on the original code and passes on the fix.

If time runs short, we prefer the first three done well over all five done partially.

## Contract

- Remove `organizationId` and `actorId` from the GraphQL arguments and the REST body.
  Identity comes from the session only. Fix every caller this breaks (web, repro, API tests).
- When delivery fails, the Notification row stays, so the owner is still owed the notice.

## Scope

Single-system operation on both transports, its callers, and the web row.
Keep notification eligibility as it is. No bulk updates, jobs, soft-delete changes,
retries, or unrelated refactoring. `x-user-email` simulates the session;
authentication is out of scope.

Demonstrate the result, and explain your decisions, your verification and the risks
that remain.
