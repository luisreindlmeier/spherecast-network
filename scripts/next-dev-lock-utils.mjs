import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function getNextDevLockPath(fromImportMetaUrl) {
  const root = path.resolve(
    path.dirname(fileURLToPath(fromImportMetaUrl)),
    '..'
  )
  return path.join(root, '.next', 'dev', 'lock')
}

export function removeLockFile(lockPath) {
  try {
    fs.unlinkSync(lockPath)
  } catch {
    /* ignore */
  }
}

export function readLockPid(lockPath) {
  const parsed = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
  if (typeof parsed.pid === 'number' && Number.isFinite(parsed.pid)) {
    return parsed.pid
  }
  return undefined
}

export function isPidAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export function lockFileExists(lockPath) {
  return fs.existsSync(lockPath)
}
