# Studyrok - Backend

This repository contains the backend services for Studyrok: an app for generating study notes, flashcards, quizzes and study boards. It is a TypeScript Node.js API using Prisma for database access and is prepared to run locally (with Docker) or directly in Node.

## What’s included

- REST API server (TypeScript)
- Prisma ORM (schema in `prisma/schema.prisma`, generated client in `generated/prisma`)
- Modules: auth, flashcards, quizzes, note generation, study boards, users
- Middleware for auth, validation, uploads, error handling
- Docker Compose file for local services

## Requirements

- Node 18+ (or the version specified in your environment)
- npm or pnpm
- PostgreSQL (local or remote) — database connection configured via environment variable
- (Optional) Docker & Docker Compose for running dependencies locally

## Quick start

1. Install dependencies

```powershell
npm install
# or: pnpm install
```

2. Create environment variables

This project reads environment configuration from `src/env.ts`. For the canonical list of variable names and usage, see `src/env.ts`. Typical variables you will need:

- `DATABASE_URL` — Prisma database connection string (Postgres)
- `PORT` — API port (e.g. `4000`)
- `NODE_ENV` — `development` | `production`
- `JWT_SECRET` — JWT signing secret
- `EMAIL_*` / SMTP or provider keys — email sending
- Storage and third-party API keys (S3, AI provider, etc.)

Create a `.env` file or set these in your environment. Example (DO NOT commit secrets):

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/studyrok?schema=public
PORT=4000
NODE_ENV=development
JWT_SECRET=supersecret
```

3. Prepare database (Prisma)

```powershell
# generate client
npx prisma generate

# run migrations (development)
npx prisma migrate dev

# or apply migrations in CI/production
npx prisma migrate deploy

# open Prisma Studio
npx prisma studio
```

4. Run the server

```powershell
# development (watch)
npm run dev

# production build and start
npm run build
npm start
```

If you prefer Docker:

```powershell
docker-compose up --build
```

## Scripts

Check `package.json` for available scripts. Common scripts you’ll find are `dev`, `build`, `start`, and test scripts.

## Testing

Run unit and integration tests with:

```powershell
npm test
```

Adjust or extend tests under the `modules/*/*.test.ts` files.

## Development notes

- The Prisma client is generated into `generated/prisma` — keep that directory up-to-date after schema changes.
- The main application entry points are `src/app.ts` and `src/server.ts`.
- Environment variable definitions and type mappings live in `src/env.ts` and are the single source of truth for env names used across the app.

## Troubleshooting

- If Prisma client import fails, run `npx prisma generate` and restart the server.
- If migrations fail, ensure your `DATABASE_URL` points to the correct Postgres instance and that the DB user has privileges.

## Contributing

- Follow the repo’s TypeScript and linting conventions.
- Add tests for new modules and features.

## Contact

If you need help, open an issue in this repository with details and reproduction steps.

---

README created to document basic setup, database and runtime steps. For exact environment variable names and expanded setup (CI, deploy, secret management), see `src/env.ts` and `prisma/schema.prisma` in the repository.
