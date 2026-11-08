// Checks that every UI string key used in client.js exists in both locale
// dictionaries, and that the plugin-manager locale files (locale/*.json) carry
// the same keys. Run: node scripts/check-locales.mjs

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(root, 'client.js'), 'utf8')

const used = [...new Set([...src.matchAll(/tr\('([A-Za-z0-9]+)'\)/g)].map((match) => match[1]))].sort()
const zhStart = src.indexOf('const zh = {')
const enStart = src.indexOf('const en = {')
const fallbackStart = src.indexOf('function fallbackT')
if (zhStart < 0 || enStart < 0 || fallbackStart < 0) throw new Error('cannot locate the locale dictionaries in client.js')

const keysOf = (block) => new Set([...block.matchAll(/^\s{6}([A-Za-z0-9]+):/gm)].map((match) => match[1]))
const zh = keysOf(src.slice(zhStart, enStart))
const en = keysOf(src.slice(enStart, fallbackStart))

const problems = []
for (const key of used) {
  if (!zh.has(key)) problems.push(`tr('${key}') is missing from the zh dictionary`)
  if (!en.has(key)) problems.push(`tr('${key}') is missing from the en dictionary`)
}
for (const key of zh) if (!en.has(key)) problems.push(`zh-only key: ${key}`)
for (const key of en) if (!zh.has(key)) problems.push(`en-only key: ${key}`)

const metaZh = JSON.parse(readFileSync(join(root, 'locale', 'zh.json'), 'utf8'))
const metaEn = JSON.parse(readFileSync(join(root, 'locale', 'en.json'), 'utf8'))
const metaKeys = (value) => Object.keys(value).sort().join(',')
if (metaKeys(metaZh) !== metaKeys(metaEn)) {
  problems.push(`locale/zh.json and locale/en.json key sets differ: ${metaKeys(metaZh)} vs ${metaKeys(metaEn)}`)
}

if (problems.length > 0) {
  console.error('locale check failed:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(`locale ok: ${used.length} keys used, zh/en parity, locale/*.json parity (${Object.keys(metaZh).length} keys)`)
