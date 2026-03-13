# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Studyrok backend — a TypeScript/Express REST API for generating AI-powered study materials (notes, flashcards, quizzes, study boards). Uses Prisma ORM with PostgreSQL, BullMQ + Redis for background job processing, and multiple AI providers (DeepSeek, Gemini).

## Build & Run Commands

```powershell
# Install dependencies
npm install

# Development server (watch mode, uses ts-node-dev)
npm run dev

# Production build
npm run build

# Production start
npm start

# Lint
npm run lint
npm run lint:fix

# Format
npm run format

# Generate Prisma client (required after schema changes)
npx prisma generate

# Run migrations (development)
npx prisma migrate dev

# Apply migrations (CI/production)
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Start local Postgres via Docker
docker-compose up
```

There is no working test runner configured yet (`npm test` is a no-op placeholder). Jest + supertest are installed as dev dependencies and ready to be set up.

## Architecture

### Entry Points

- `src/index.ts` → loads dotenv, imports `src/server.ts`
- `src/server.ts` → starts Express on `PORT`, initializes BullMQ workers
- `src/app.ts` → Express app setup: middleware stack, route mounting, health check

### Module Pattern

Each feature lives in `src/modules/<name>/` with a consistent file structure:

| File | Purpose |
|---|---|
| `index.ts` | Re-exports the router (e.g. `export { default as authRoutes } from './auth.routes'`) |
| `<name>.routes.ts` | Express router — defines endpoints, attaches validation + auth middleware |
| `<name>.controller.ts` | Thin request handlers — extract params, call service, send response via `apiResponse` helpers |
| `<name>.service.ts` | Business logic — Prisma queries, AI calls, data transformation |
| `<name>.validation.ts` | Zod schemas for request validation (validated by `validate()` middleware) |

Active modules: `auth`, `flashcards`, `materials`, `noteGeneration`, `quizzes`, `studyBoards`. The `users` module exists but is empty/scaffold.

### Route Mounting (src/app.ts)

| Prefix | Module |
|---|---|
| `/api/auth` | auth |
| `/api` | studyBoards, quizzes, materials |
| `/api/note` | noteGeneration |
| `/api/flashcards` | flashcards |

### Path Aliases (tsconfig)

```
@/*         → src/*
@config/*   → src/config/*
@middleware/* → src/middleware/*
@modules/*  → src/modules/*
@services/* → src/services/*
@types/*    → src/types/*
@utils/*    → src/utils/*
```

These are resolved at runtime via `tsconfig-paths` (dev) and `tsc-alias` (build).

### Database

- **ORM**: Prisma with `@prisma/adapter-pg` (direct pg adapter, not the default Prisma engine)
- **Client location**: `generated/prisma/` (not `node_modules/.prisma`)
- **Schema**: `prisma/schema.prisma`
- **Singleton**: `src/lib/prisma.ts` — imports from `../../generated/prisma/client`
- Key models: `User`, `StudyBoard`, `Material`, `Topic → Section → Note → Concept`, `FlashcardSet → Flashcard → FlashcardReview`, `Quiz → Question`, `StudySession`, `UserProgress`, `Achievement`

### AI Service Layer

- `src/services/ai/ai.service.ts` — `AIService` class, unified interface with `generateContent()` and `generateNormalContent()`. Default provider is `deepseek`.
- `src/services/ai/clients/deepseek.client.ts` — OpenAI-compatible client pointing at `api.deepseek.com`
- `src/services/ai/clients/gemini.client.ts` — Google Generative AI client
- `src/services/ai/prompts/` — prompt templates and a `promptBuilder.ts`
- `src/services/ai/gemini.service.ts` — legacy/extended Gemini service (large file, mostly used by note generation)
- AI-generated content goes through `MarkdownCleanerService` (`src/utils/markdownCleaner.ts`) for normalization and validation

### Background Jobs (BullMQ + Redis)

- **Redis config**: `src/config/redis.ts` (hardcoded `127.0.0.1:6379`)
- **Queues** (`src/queues/queue.ts`): `materials-generation`, `notes-generation`, `quizzes-generation`, `generation-progress`
- **Workers** (`src/workers/worker.ts`): `materialGenerationWorker` and `quizGenerationWorker` — process jobs with concurrency of 2, report progress via `job.updateProgress()` and Redis hash caching

### Storage & File Processing

- `src/services/storage/r2.service.ts` — Cloudflare R2 (S3-compatible) file uploads/downloads
- `src/services/storage/fileProcessor.service.ts` — file processing pipeline
- `src/services/textExtraction.service.ts` — extracts text from PDF (`pdf-parse`), DOCX (`mammoth`), and images (`tesseract.js` OCR)
- `src/middleware/upload.middleware.ts` — multer-based file upload handling

### Middleware Stack

- `protect` — JWT Bearer token auth, attaches `req.user` (from `auth.middleware.ts`)
- `validate(zodSchema)` — Zod-based request validation against `{ body, query, params }` shape
- `checkAILimit` / `incrementAIRequest` — per-user monthly AI request rate limiting
- `restrictTo(...tiers)` — tier-based access control (e.g. free vs pro)
- `requireOnboarding` — blocks users who haven't completed onboarding
- Rate limiters in `rateLimiter.middleware.ts` (auth-specific and general)

### Response & Error Conventions

- **Responses**: Always use helpers from `src/utils/apiResponse.ts` (`sendSuccess`, `sendCreated`, `sendError`, `sendPaginatedResponse`, etc.). All responses follow a standard envelope: `{ success, statusCode, message, data?, meta?, error?, timestamp }`.
- **Errors**: Throw typed errors from `src/utils/errors.ts` (`AppError`, `ValidationError`, `AuthenticationError`, `NotFoundError`, `ConflictError`, etc.). These carry `statusCode`, `isOperational`, and `code` fields.
- **Async handlers**: Wrap controller functions with `asyncHandler()` from `src/utils/asyncHandler.ts` to catch promise rejections.

### Other Services

- `src/services/cache/cache.service.ts` — in-memory `node-cache` (24h TTL default)
- `src/services/email/` — email service (exists but empty/minimal)
- `src/utils/logger.ts` — Winston logger
- `src/utils/jwt.ts` — JWT sign/verify for access and refresh tokens

### Environment Variables

Defined in `src/env.ts`. Key variables: `PORT`, `NODE_ENV`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`. AI clients also require `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, and optionally `GEMINI_MODEL`.

### Code Style

- **Validation**: Zod schemas, structured as `z.object({ body: z.object({...}) })` so they validate the full Express request shape
- **Linting**: ESLint with `@typescript-eslint`, `no-console` warned (allow `warn`/`error`), `no-explicit-any` warned, unused vars with `_` prefix ignored
- **Formatting**: Prettier — single quotes, semicolons, 2-space indent, trailing commas (es5), LF line endings
- **TypeScript**: Strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, module `nodenext`
