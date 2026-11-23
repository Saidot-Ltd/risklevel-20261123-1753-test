# INT-3: the same write from a nightly job

Builds on INT-1.

New script `pnpm task:normalise-risk-levels`: boots the app without an HTTP request and sets every non-deleted system whose risk level is not `Low`, `Medium` or `High` to `Low` through the same code path. The sample data has none; your test creates one.

Acceptance:
- Audit rows exist for every changed system and name a non-human actor consistently.
- Running the script twice changes nothing the second time and writes no second audit row.
- One test runs the script against the real database and asserts the two points above.
- No mutation argument, request field or environment variable lets a caller choose the actor.

Question for the conversation: a request carries a user, a job does not. Where does identity come from in each case, and what must never be the source?
