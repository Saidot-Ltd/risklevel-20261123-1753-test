# Risk level pairing exercise

A small governance app for managing AI systems. Each system belongs to an organisation,
has an owner, and has a risk level: Low, Medium, or High.

## Step 1 — Clone and set up

You need Git and Node.js 24 or newer, with npm. Details: [environment](interview/ENVIRONMENT.md).

```sh
git clone https://github.com/Saidot-Ltd/risklevel-20261123-1753-test.git
cd risklevel-20261123-1753-test
npm run bootstrap
```

`npm run bootstrap` checks Node, installs dependencies, creates sample data and runs the
type checks. It uses pnpm 11.1.2, and fetches it through `npx` if you do not have it.
When it finishes, it prints the two commands for Step 2.

## Step 2 — Run the app

Terminal A, leave running:

```sh
pnpm dev     # or: npx pnpm@11.1.2 dev
```

Open http://localhost:4373. The API runs at http://localhost:4300.

Terminal B:

```sh
pnpm repro   # or: npx pnpm@11.1.2 repro — reseeds sample data
```

## Orientation

A request to change a risk level travels like this:

1. The `x-user-email` header identifies a sample user.
2. `SessionMiddleware` looks the user up and stores user and organisation in CLS (`nestjs-cls`).
3. `SessionContext` reads them back anywhere in the request.
4. `AiSystemController` (REST) or `AiSystemResolver` (GraphQL) calls `AiSystemService`.
5. `AiSystemService` updates the system and calls `AuditLogService` and `NotificationsService`.
   It emits an event that `RiskLevelChangedListener` handles.

Code: API in `apps/api/src`, one folder per module (`ai-system`, `audit`, `context`,
`notifications`). Web in `apps/web/app`, the systems page in `routes/systems.tsx`.
API e2e tests in `apps/api/test` run against a real SQLite database (`test.db`), which the
tests recreate with migrations and sample data.

## Step 3 — The task

The interviewer gives you the task at the start of the session. Task cards are in
`interview/`.

## Checks

```sh
pnpm test:e2e
pnpm test
pnpm check
pnpm typecheck
```

Stack, sample data, and routes: [reference](interview/REFERENCE.md).

## Tools and shared screen

AI assistants, Google, Stack Overflow, and documentation are allowed. We expect you to
use your AI assistant as you normally would.
Keep all interview work on the one shared screen: prompts, responses, searches,
code changes, and test output. Do not use an unshared screen or device for assistance.

You remain responsible for the code you submit. Be prepared to explain it, justify
its tradeoffs, and adapt it when we discuss a change in requirements.
