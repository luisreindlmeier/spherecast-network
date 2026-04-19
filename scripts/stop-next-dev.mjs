/**
 * Stops the Next.js dev server that holds `.next/dev/lock` (same PID Next prints).
 * Run: `pnpm dev:stop` then `pnpm dev` if you see "Another next dev server is already running".
 */
import {
  getNextDevLockPath,
  isPidAlive,
  lockFileExists,
  readLockPid,
  removeLockFile,
} from './next-dev-lock-utils.mjs'

const lockPath = getNextDevLockPath(import.meta.url)

if (!lockFileExists(lockPath)) {
  console.log('No .next/dev/lock — nothing to stop.')
  process.exit(0)
}

let pid
try {
  pid = readLockPid(lockPath)
} catch {
  console.log('Removing unreadable lock file.')
  removeLockFile(lockPath)
  process.exit(0)
}

if (pid === undefined) {
  removeLockFile(lockPath)
  process.exit(0)
}

const alive = isPidAlive(pid)

if (!alive) {
  console.log(`PID ${pid} is not running; removing stale lock.`)
  removeLockFile(lockPath)
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

removeLockFile(lockPath)

console.log('Done. You can run `pnpm dev` again.')
