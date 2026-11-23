# Development environment

## Required

- A macOS or Linux machine with a Unix shell. On Windows, use WSL 2.
- Git.
- Node.js 24 or newer, with npm. pnpm 11.1.2 is optional: `npm run bootstrap` fetches it
  through `npx` if it is missing.
- Your usual editor, a modern browser, and your usual AI coding assistant.
- A call tool with microphone and screen sharing allowed: Tuple on macOS (preferred),
  or Zoom, Google Meet or Teams on Linux. Share the screen that contains your editor,
  terminal, browser, and AI assistant.
- Internet access for dependency installation and documentation.
- Local ports 4300 (API) and 4373 (web) available.

The database is local SQLite. No database server or Docker is required.

## Check versions

```sh
git --version
node --version     # v24 or newer
npm --version
```

## Prepare the app

Follow Step 1 in the root README. Confirm that http://localhost:4373 opens and the
reproduction runs. The reproduction deliberately exercises a failure; an error printed
by that request is part of the exercise.

Database reset and reproduction commands overwrite sample data. Use this checkout
only for the interview.
