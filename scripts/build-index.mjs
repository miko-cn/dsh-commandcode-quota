// Builds market/index.json, the format-1 plugin market index this repository
// serves for DSH's Plugins → Discover → index sources.
//
// Run: node scripts/build-index.mjs
// It reads the root package.json, asks the npm registry for the publish time of
// the current version, and writes market/index.json plus market/icon.png.

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const PLUGIN = {
  title: { en: 'Command Code usage panel', zh: 'Command Code 用量面板' },
  description: {
    en: 'Plan credits, 5-hour and weekly windows, period request stats, plan tiers and an in-app API-key editor for Command Code — a Settings tab plus a draggable floating capsule. Requires your own Command Code account or API key.',
    zh: '在 DSH 里查看 Command Code 的套餐额度、5 小时 / 每周滚动窗口、本期请求统计与套餐档位，含设置页签与可拖动的浮窗胶囊，并内置 API key 管理。需要自己的 Command Code 账号 / API key。',
  },
  category: 'usage',
  keywords: ['commandcode', 'usage', 'quota', 'credits', 'balance', 'settings', 'floating'],
  author: 'miko-cn',
  icon: 'icon.webp',
}

const CATEGORY = { title: { en: 'Usage & Billing', zh: '用量与计费' } }

function registryUrl(name) {
  return `https://registry.npmjs.org/${name.replace('/', '%2F')}`
}

async function publishTime(name, version) {
  const response = await fetch(registryUrl(name))
  if (!response.ok) throw new Error(`registry ${response.status} for ${name}`)
  const body = await response.json()
  const stamp = body?.time?.[version]
  if (!stamp) throw new Error(`version ${version} of ${name} is not published yet`)
  return Math.floor(Date.parse(stamp) / 1000)
}

const index = {
  format: 1,
  title: {
    en: 'Command Code tools for DeepSeek Harness',
    zh: 'DeepSeek Harness 的 Command Code 工具',
  },
  description: {
    en: 'Plugins by miko-cn for DeepSeek Harness. Add this file as an index source under Plugins → Discover.',
    zh: 'miko-cn 开发的 DeepSeek Harness 插件。把本文件添加为 Plugins → Discover 里的索引源即可浏览与安装。',
  },
  metadata: {
    categories: { [PLUGIN.category]: CATEGORY },
    labels: {},
    sortKeys: {},
  },
  plugins: [
    {
      name: pkg.name,
      title: PLUGIN.title,
      description: PLUGIN.description,
      icon: PLUGIN.icon,
      author: PLUGIN.author,
      homepage: pkg.homepage,
      repository: { url: pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '') },
      metadata: {
        category: PLUGIN.category,
        keywords: PLUGIN.keywords,
        labels: [],
        sortKeys: {},
      },
      versions: [
        {
          version: pkg.version,
          publishTimestamp: await publishTime(pkg.name, pkg.version),
          source: { type: 'npm' },
          engines: { dsh: pkg.engines.dsh },
        },
      ],
    },
  ],
}

mkdirSync(join(root, 'market'), { recursive: true })
writeFileSync(join(root, 'market', 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8')
copyFileSync(join(root, PLUGIN.icon), join(root, 'market', PLUGIN.icon))

console.log(`market/index.json: ${pkg.name}@${pkg.version}, ${index.plugins[0].versions[0].publishTimestamp}`)
