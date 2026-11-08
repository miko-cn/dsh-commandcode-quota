// Validates market/index.json with the official DSH market index validator.
// Run: npm install && npm run validate:index

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marketInstallTarget, parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = join(root, 'market', 'index.json')
const url = 'https://raw.githubusercontent.com/miko-cn/dsh-commandcode-quota/main/market/index.json'

const index = parseMarketIndex(JSON.parse(readFileSync(file, 'utf8')), url)
console.log(`valid: ${index.plugins.length} plugin(s), title "${index.title.en}"`)
for (const plugin of index.plugins) {
  const version = plugin.versions[0]
  const target = marketInstallTarget(plugin.name, version)
  console.log(`  ${plugin.name}@${version.version} -> ${target.spec}${target.registry ? ` (registry ${target.registry})` : ''}`)
  console.log(`  icon: ${plugin.icon}`)
}
