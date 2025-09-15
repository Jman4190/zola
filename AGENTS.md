# Repository Guidelines

## Project Structure & Modules
- `app/`: Next.js App Router pages, API routes, layout, and hooks.
- `components/`: Reusable UI, icons, motion primitives, and prompt-kit components.
- `lib/`: Core logic (config, models, providers, stores, Supabase, encryption, usage).
- `public/`: Static assets.
- `utils/`: Utilities (e.g., `utils/supabase`).
- `.github/workflows/`: CI for linting, type checks, build, and Docker.

## Build, Test, and Development
- `npm run dev`: Start the dev server at `http://localhost:3000`.
- `npm run build`: Production build via Next.js.
- `npm start`: Run the production server.
- `npm run lint`: ESLint (Next.js core-web-vitals + TypeScript).
- `npm run type-check`: TypeScript checks with `tsc`.
- Env: copy `.env.example` to `.env.local` and fill keys (e.g., `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `CSRF_SECRET`, `ENCRYPTION_KEY`).

## Coding Style & Naming
- Language: TypeScript, strict mode (`tsconfig.json`).
- Formatting: Prettier (2 spaces, no semicolons, trailing commas `es5`).
- Linting: ESLint with Next presets; fix issues before pushing.
- Imports: sorted by `@ianvs/prettier-plugin-sort-imports`.
- Tailwind: `prettier-plugin-tailwindcss` for class ordering.
- Naming: React components `PascalCase`, hooks `use-*.ts`, routes/segments lower-case, utility modules `camelCase.ts`.

## Testing Guidelines
- Framework: Not yet configured. Prefer Vitest or Jest + React Testing Library for new tests.
- File names: `*.test.ts`/`*.test.tsx` colocated with source or under `__tests__/`.
- Scope: Cover `lib/` logic and critical UI behavior; include a minimal test plan in PRs.

## Commit & Pull Requests
- Commits: Clear, present tense; Conventional Commits encouraged (e.g., `feat: add chat pinning`, `fix: focus prompt-input`).
- PRs: Include purpose, linked issues, screenshots for UI, env/config changes, and a test plan. Keep changes scoped.
- CI: PRs must pass lint and type-check; builds run in CI. No failing ESLint/TS.

## Security & Configuration
- Secrets in `.env.local` only; never commit secrets.
- Required keys for providers (OpenAI, Mistral, Anthropic, Gemini, OpenRouter) and Supabase.
- Generate strong `CSRF_SECRET` and 32-byte base64 `ENCRYPTION_KEY` (see `INSTALL.md`).

## Architecture Notes
- Next.js App Router + server actions; state via stores in `lib/`.
- Provider-agnostic model layer; Ollama auto-detection in dev; disabled in prod unless configured.
