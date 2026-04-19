/**
 * Removes `.next/dev/lock` when the recorded PID is no longer running
 * (e.g. after a crash). Lets `next dev` start again without manual cleanup.
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
  process.exit(0)
}

let pid
try {
  pid = readLockPid(lockPath)
} catch {
  removeLockFile(lockPath)
  process.exit(0)
}

if (pid === undefined) {
  process.exit(0)
}

const alive = isPidAlive(pid)

if (!alive) {
  removeLockFile(lockPath)
}
