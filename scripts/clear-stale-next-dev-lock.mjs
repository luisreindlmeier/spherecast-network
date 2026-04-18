/**
 * Removes `.next/dev/lock` when the recorded PID is no longer running
 * (e.g. after a crash). Lets `next dev` start again without manual cleanup.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lockPath = path.join(root, '.next', 'dev', 'lock')

if (!fs.existsSync(lockPath)) {
  process.exit(0)
}

let pid
try {
  const parsed = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
  if (typeof parsed.pid === 'number' && Number.isFinite(parsed.pid)) {
    pid = parsed.pid
  }
} catch {
  try {
    fs.unlinkSync(lockPath)
  } catch {
    /* ignore */
  }
  process.exit(0)
}

if (pid === undefined) {
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
  try {
    fs.unlinkSync(lockPath)
  } catch {
    /* ignore */
  }
}
