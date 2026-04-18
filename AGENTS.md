<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Spherecast

Next.js 16 App Router · TypeScript strict · Tailwind CSS 4 · shadcn/ui · pnpm

## File Layout

- `app/` — Next.js App Router (pages & layouts)
- `components/ui/` — shadcn components, never edit directly
- `components/[feature]/` — custom components per feature
- `lib/utils.ts` — shared utilities (cn helper etc.)
- `types/` — global TypeScript types

## Conventions

- No `any` — TypeScript strict mode is enforced
- Server Components by default; add `use client` only when needed
- Validate all user inputs with Zod
- Add shadcn components via `pnpm dlx shadcn@latest add [component]`
