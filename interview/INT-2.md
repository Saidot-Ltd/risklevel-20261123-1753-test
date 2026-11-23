# INT-2: bulk risk level for an organisation

Builds on INT-1.

New mutation `setOrganisationRiskLevel(riskLevel)` and route `PATCH /systems/risk-level` with `{ riskLevel }`: every non-deleted system in the caller's organisation moves to that level.

Acceptance:
- All systems change or none does. An e2e proves it: make the write for system 3 fail (a SQLite trigger in the test is fine), assert every row is unchanged.
- One audit row per changed system, each signed by the caller.
- Notification eligibility follows INT-1 (a change to High). Each eligible owner receives one notification for the batch, not one per system, after commit.
- The per-system mutation and route from INT-1 keep working and share their code with the bulk path.

Question for the conversation: where does responsibility for the transaction sit, and what does that mean for the per-system code you just fixed?
