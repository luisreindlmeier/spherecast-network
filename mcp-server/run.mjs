#!/usr/bin/env node
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const indexPath = path.join(__dirname, 'dist', 'index.js')
const projectRoot = path.resolve(__dirname, '..')

const child = spawn('node', [indexPath], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
})

process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))

child.on('exit', (code) => {
  process.exit(code || 0)
})
