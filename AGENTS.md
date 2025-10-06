# Repository Guidelines

## Project Structure & Module Organization
Jaeger AI centers on `jaeger-ai.js`, which orchestrates the Telegram bot, tool registry, and job queue. Feature code lives under `src/`, grouped by role: `src/core/` for orchestration (`tool-manager.js`, `red-blue-ops.js`), `src/integrations/` for AI adapters, and `src/nlp/` plus `src/security/` for helper logic. Tests mirror this layout in `tests/*.test.js`, with shared hooks in `tests/setup.js`. Persistent assets (`data/`, `logs/`, `backup/`, `jaeger.db`) and operational docs (`docs/*.md`) must remain version-controlled unless they contain secrets.

## Build, Test, and Development Commands
- `npm install` – install or refresh dependencies.
- `npm start` – launch the production bot via `jaeger-ai.js`.
- `npm run dev` – start with development logging (`NODE_ENV=development`).
- `npm test` – run the Jest suite with coverage output to `coverage/`.
- `npm run setup` – execute `start.sh` for bootstrap (env check, DB init, optional install).
Use Node 18+ and ensure `.env` is populated before starting.

## Coding Style & Naming Conventions
Use 4-space indentation and trailing commas per existing modules. Prefer `camelCase` for functions/variables and `PascalCase` for classes such as `UserManager`. Keep modules side-effect free by exporting functions; initialize state in `jaeger-ai.js`. Document complex flows with concise JSDoc headers and favor `async/await` over raw callbacks. Sanitize user input through helpers in `validator`, `xss`, or existing guard utilities.

## Testing Guidelines
All tests reside in `tests/` and follow the `*.test.js` suffix so Jest picks them up. Write unit coverage for helpers in `src/**` and integration checks for bot flows in `integration.test.js`. Target ≥80% coverage (Jest enforces this via `collectCoverageFrom`). Use `tests/setup.js` to stub network calls and reset databases; clean temporary artifacts under `logs/` after test runs.

## Commit & Pull Request Guidelines
Commit history favors emoji-prefixed, imperative messages (e.g., `🔧 Fix: Prioritize Tool Failover`). Keep subjects under 72 characters and detail follow-up work in the body when needed. PRs should summarize user impact, list modified subsystems, link related issues, and attach logs or screenshots for bot output. Confirm `npm test` passes and highlight any security-sensitive changes in the description.

## Security & Configuration Tips
Never commit real `.env` values; update `.env.example` when adding configuration. `start.sh` seeds the SQLite database—run it after schema changes. Review `docs/FILE_STRUCTURE.md` when reorganizing modules so contributors stay aligned. Rotate API keys regularly and validate external inputs with the provided guard functions before invoking shell commands.
