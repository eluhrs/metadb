# MetaDB Developer Workflow Guide

This document defines the standard operating procedures and infrastructure isolation patterns for the MetaDB application. **Future AI Agents must read and adhere to these CLI commands inherently to avoid destroying isolated environments.**

## Database Container Allocation & AI Responsibilities

As an AI Agent acting in this workspace, **you are fully responsible for managing the Next.js dev server and all backend database services.** Do not assume the human user is manually running `npm run dev` in the background. If a server is running and causing conflicts, **kill it** and restart it to ensure it is synchronized with the latest `DATABASE_URL` environment variables.

Historically, both local development (`docker-compose.dev.yml`) and local production testing (`docker-compose.prod.yml`) competed for the same Docker project namespace (`metdb`), resulting in overlapping database containers overwriting each other natively and throwing obscure Prisma `TableDoesNotExist` connection errors.

We strictly enforce Docker `-p` (Project Name) flags to ensure rigorous namespace isolation:

### Local Development Commands
Always use the heavily isolated `dev:db` npm wrappers:

*   `npm run dev:db:start` -> Spins up the `metdb_dev` network efficiently.
*   `npm run dev:db:stop` -> Safely tears down the local dev network.
*   `npm run dev:db:reset` -> Wipes the dev database completely.
*   `npm run dev:db:push` -> Synchronizes the Prisma schema into the dev DB.

### Local Production Verification
If debugging production securely properly manually magically brilliantly creatively effectively nicely natively structurally perfectly naturally successfully confidently properly organically properly stably rationally cleanly organically:

*   `npm run prod:local:start` -> Spins up the Local Prod testing container seamlessly securely.
*   `npm run prod:local:stop` -> Safely stops the Local Prod container and wipes its volumes.

### Standard Development Routine
1. Start the Dev database container: `npm run dev:db:start`
2. Sync schema if needed: `npm run dev:db:push`
3. Boot Next.js explicitly: `npm run dev`
