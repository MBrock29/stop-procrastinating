import { mkdir, copyFile, cp } from 'node:fs/promises'
import path from 'node:path'
import { build } from 'esbuild'

const rootDir = process.cwd()
const extensionDir = path.join(rootDir, 'extension')
const srcDir = path.join(extensionDir, 'src')
const staticDir = path.join(extensionDir, 'static')
const outDir = path.join(extensionDir, 'dist')

await mkdir(outDir, { recursive: true })

await Promise.all([
  build({
    bundle: true,
    entryPoints: [path.join(srcDir, 'background.ts')],
    format: 'esm',
    outfile: path.join(outDir, 'background.js'),
    platform: 'browser',
    target: 'chrome114',
  }),
  build({
    bundle: true,
    entryPoints: [path.join(srcDir, 'popup.ts')],
    format: 'esm',
    outfile: path.join(outDir, 'popup.js'),
    platform: 'browser',
    target: 'chrome114',
  }),
  build({
    bundle: true,
    entryPoints: [path.join(srcDir, 'content.ts')],
    format: 'esm',
    outfile: path.join(outDir, 'content.js'),
    platform: 'browser',
    target: 'chrome114',
  }),
])

await Promise.all([
  copyFile(path.join(staticDir, 'manifest.json'), path.join(outDir, 'manifest.json')),
  copyFile(path.join(staticDir, 'popup.html'), path.join(outDir, 'popup.html')),
  copyFile(path.join(staticDir, 'popup.css'), path.join(outDir, 'popup.css')),
  cp(path.join(staticDir, 'icons'), path.join(outDir, 'icons'), { recursive: true }),
])
