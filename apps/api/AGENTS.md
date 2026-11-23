# API project notes

This fixture uses NestJS 11, code-first GraphQL, REST controllers, Prisma with SQLite,
and `nestjs-cls` for request context.

## Working conventions

- The task is given at the start of the session. Task cards are in `interview/`.
  Each card's scope and requirements apply.
- Follow the existing project style.

## Fixture session

There is no production authentication in this exercise. The app uses `x-user-email`
to identify a seeded user and establish request context.

```sh
curl -H 'x-user-email: alice@acme.test' http://localhost:4300/systems
```

Missing session information is handled by the app’s existing context support.
You do not need to implement a login or authentication system.

## Checks

Run these from the repository root:

| Command | Purpose |
|---|---|
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | API tests with a real test database |
| `pnpm check` | Formatting and lint |
| `pnpm typecheck` | API and web TypeScript check |

`strictNullChecks` is disabled in this fixture.
Setup and sample-data reset commands are documented in the root README.

## AI-assisted work

AI assistants are expected in this exercise and may read this repository.
The same task scope and requirements apply to assisted and manual work.
Keep tool interaction, edits, and verification visible on the shared screen.
Candidate tool policy: the [root README](../../README.md).
