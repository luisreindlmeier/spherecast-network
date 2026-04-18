/**
 * Stops the Next.js dev server that holds `.next/dev/lock` (same PID Next prints).
 * Run: `pnpm dev:stop` then `pnpm dev` if you see "Another next dev server is already running".
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lockPath = path.join(root, '.next', 'dev', 'lock')

if (!fs.existsSync(lockPath)) {
  console.log('No .next/dev/lock — nothing to stop.')
  process.exit(0)
}

let pid
try {
  const parsed = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
  if (typeof parsed.pid === 'number' && Number.isFinite(parsed.pid)) {
    pid = parsed.pid
  }
} catch {
  console.log('Removing unreadable lock file.')
  try {
    fs.unlinkSync(lockPath)
  } catch {
    /* ignore */
  }
  process.exit(0)
}

if (pid === undefined) {
  try {
    fs.unlinkSync(lockPath)
  } catch {
    /* ignore */
  }
  process.exit(0)
}

let alive = false
try {
  process.kill(pid, 0)
  alive = true
} catch {
  alive = false
}

if (!alive) {
  console.log(`PID ${pid} is not running; removing stale lock.`)
  try {
    fs.unlinkSync(lockPath)
  } catch {
    /* ignore */
  }
  process.exit(0)
}

console.log(`Stopping Next.js dev (PID ${pid})…`)
try {
  process.kill(pid, 'SIGTERM')
} catch (err) {
  console.error(String(err))
}

for (let i = 0; i < 40; i += 1) {
  try {
    process.kill(pid, 0)
  } catch {
    break
  }
  const until = Date.now() + 50
  while (Date.now() < until) {
    /* short wait without shell sleep */
  }
}

try {
  process.kill(pid, 0)
  console.log('Process still running — sending SIGKILL.')
  process.kill(pid, 'SIGKILL')
} catch {
  /* exited */
}

try {
  fs.unlinkSync(lockPath)
} catch {
  /* lock may already be gone */
}

console.log('Done. You can run `pnpm dev` again.')
