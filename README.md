# Spherecast

Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui · Vercel · pnpm

---

## Tech Stack

| Layer           | Tool                       |
| --------------- | -------------------------- |
| Framework       | Next.js 16 (App Router)    |
| Language        | TypeScript (strict)        |
| Styling         | Tailwind CSS 4 + shadcn/ui |
| Deployment      | Vercel                     |
| Package Manager | pnpm                       |
| Validation      | Zod                        |

---

## Quickstart

```bash
git clone <repo-url>
cd spherecast
pnpm install
cp .env.example .env.local  # Variablen eintragen
pnpm dev
```

---

## AI-Native Workflow

Dieses Projekt ist für Claude Code optimiert. Die wichtigsten Dateien:

- **`CLAUDE.md`** — Projektgedächtnis. Claude liest das bei jeder Session automatisch. Stack, Regeln, Git-Konventionen stehen dort. Nicht löschen.
- **`.claude/commands/`** — Slash-Commands für wiederkehrende Workflows
- **`.claude/hooks/`** — TypeScript + Prettier laufen automatisch nach jedem Edit
- **`.claude/agents/`** — Spezialisierte Subagenten (Architekt, Code-Reviewer)

### Session starten

```bash
claude
```

Claude kennt sofort den Stack, die Struktur und alle Konventionen.

### Neues Feature

```
/new-feature
```

Claude erstellt den Branch, fragt was gebaut werden soll, und wartet bevor er anfängt.

### Feature abschließen

```
/finish-feature
```

Claude reviewed den Code, fixed kritische Issues, committet und öffnet einen PR.

### Kontext-Management

```
/compact
```

Wenn der Kontext lang wird oder das Feature wechselt — verhindert Halluzinationen bei langen Sessions.

---

## Projektstruktur

```
app/                  # Next.js App Router (Seiten & Layouts)
components/
├── ui/               # shadcn-Komponenten — nie direkt editieren
└── [feature]/        # Eigene Komponenten pro Feature
lib/
└── utils.ts          # cn-Helper und geteilte Utilities
types/                # Globale TypeScript-Typen
.claude/
├── agents/           # Subagenten-Definitionen
├── commands/         # Slash-Commands
└── hooks/            # Post-Edit-Hooks (Typecheck + Prettier)
```

---

## Git-Konventionen

```
feat:     Neues Feature
fix:      Bugfix
chore:    Dependencies, Konfiguration
refactor: Umbau ohne neue Funktionalität
```

Nie direkt auf `main` pushen — immer Branch + PR.

---

## Deployment

PR merge in `main` → Vercel deployed automatisch.
Vercel-Projekt mit GitHub verbinden, Env-Variablen im Vercel Dashboard eintragen.
