<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Stack

Next.js 16 App Router · TypeScript strict · Tailwind CSS 4 · shadcn/ui (Radix) · Vercel · pnpm

# Structure

app/ · components/ui/ (shadcn, never edit) · components/[feature]/ · lib/utils.ts · types/

# Rules

- Never use `any`
- Server Components by default, `use client` only for event handlers/hooks/browser APIs
- Validate all inputs with Zod
- `pnpm dlx shadcn@latest add [component]` to add shadcn components
- Always update .env.example when adding new environment variables
- Typography standard:
  - Use simple system sans as primary UI font (`--font-primary`)
  - Use system monospace stack as secondary (`--font-secondary`)
  - Do not introduce additional font families unless explicitly requested

# Git — always do this automatically, never wait to be asked

- Start of every feature: create `feature/name` branch
- After every completed logical unit: commit with `feat:` `fix:` `chore:` `refactor:`
- After 3-5 commits: open PR to main with clear title and description
- Never commit to main directly

# Commands

- `pnpm dev` · `pnpm build` · `pnpm tsc --noEmit`

# Session

- Suggest /compact when context feels long or before switching features
