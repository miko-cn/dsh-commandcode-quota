// Renders the repository artwork (banner + UI previews) from SVG.
// Dev-only: needs sharp. Run with:
//   SHARP_PATH=C:\path\to\node_modules\sharp node scripts/make-assets.mjs
// Outputs assets/banner.png, assets/preview-popover.png, assets/preview-settings.png.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const sharp = require(process.env.SHARP_PATH || 'sharp')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assets = join(root, 'assets')
mkdirSync(assets, { recursive: true })

const LOGO = `data:image/png;base64,${readFileSync(join(root, 'icon.png')).toString('base64')}`

const P = {
  bg: '#151817',
  card: '#232826',
  glass: 'rgba(33,39,36,0.74)',
  glassCard: 'rgba(28,33,31,0.60)',
  border: '#333c38',
  hairline: 'rgba(255,255,255,0.08)',
  hairlineStrong: 'rgba(255,255,255,0.12)',
  text: '#f2f5f3',
  muted: '#9aa5a0',
  dim: '#6d7873',
  teal: '#12b886',
  tealDark: '#0d9488',
  green: '#3ddc97',
  track: '#39423e',
}
const FONT = 'Segoe UI, Microsoft YaHei UI, Microsoft YaHei, PingFang SC, sans-serif'
const MONO = 'Cascadia Mono, Consolas, monospace'

const esc = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const text = ({ x, y, size = 16, weight = 400, fill = P.text, anchor = 'start', family = FONT, opacity = 1, spacing = 0 }, value) =>
  `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" opacity="${opacity}" letter-spacing="${spacing}">${esc(value)}</text>`

const rect = ({ x, y, w, h, r = 0, fill = 'none', stroke = 'none', sw = 1, opacity = 1 }) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}"/>`

const bar = ({ x, y, w, h = 8, pct = 0, color = P.teal }) => {
  const fill = Math.max(3, Math.round((w * Math.min(100, Math.max(0, pct))) / 100))
  return rect({ x, y, w, h, r: h / 2, fill: P.track }) + rect({ x, y, w: fill, h, r: h / 2, fill: color })
}

let clipId = 0
const logo = (x, y, size, r = size * 0.24) => {
  const id = `clip${clipId++}`
  return `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}"/></clipPath></defs>
    <image x="${x}" y="${y}" width="${size}" height="${size}" href="${LOGO}" clip-path="url(#${id})"/>`
}

const iconBtn = (x, y, size, glyph) =>
  text({ x: x + size / 2, y: y + size * 0.72, size: size * 0.62, fill: P.muted, anchor: 'middle' }, glyph)

function chip(x, y, label, { size = 15, padX = 14, height = 32, color = P.teal } = {}) {
  const width = Math.max(64, label.length * size * 0.94 + padX * 2)
  return {
    svg:
      rect({ x, y, w: width, h: height, r: height / 2, fill: 'rgba(18,184,134,0.12)', stroke: 'rgba(18,184,134,0.32)', sw: 1.4 }) +
      text({ x: x + width / 2, y: y + height * 0.655, size, weight: 600, fill: color, anchor: 'middle' }, label),
    width,
  }
}

const canvas = ({ w, h, body }) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`

const board = ({ w, h, id, glow }) => {
  const parts = []
  parts.push(`<defs>
    <radialGradient id="${id}" cx="0.5" cy="0.12" r="0.95">
      <stop offset="0" stop-color="#1f2a26"/><stop offset="1" stop-color="#151817"/>
    </radialGradient>
  </defs>`)
  parts.push(rect({ x: 0, y: 0, w, h, fill: 'url(#' + id + ')' }))
  if (glow) parts.push(glow)
  return parts
}

const blobBackdrop = (w, h) =>
  `<defs><filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="46"/></filter></defs>
   <g filter="url(#soft)">
     <circle cx="${w * 0.18}" cy="${h * 0.22}" r="${w * 0.24}" fill="#12b886" opacity="0.28"/>
     <circle cx="${w * 0.84}" cy="${h * 0.38}" r="${w * 0.28}" fill="#3b82f6" opacity="0.18"/>
     <circle cx="${w * 0.46}" cy="${h * 0.8}" r="${w * 0.26}" fill="#f0b429" opacity="0.10"/>
   </g>`

// ---------------------------------------------------------------- banner ----
function banner() {
  const w = 1600
  const h = 520
  const parts = []
  parts.push(`<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0c1210"/><stop offset="1" stop-color="#0f1a16"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.72" cy="0.22" r="0.7">
      <stop offset="0" stop-color="#12b886" stop-opacity="0.28"/><stop offset="1" stop-color="#12b886" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.4" fill="#22302b"/>
    </pattern>
  </defs>`)
  parts.push(rect({ x: 0, y: 0, w, h, fill: 'url(#bg)' }))
  parts.push(rect({ x: 0, y: 0, w, h, fill: 'url(#dots)', opacity: 0.55 }))
  parts.push(rect({ x: 0, y: 0, w, h, fill: 'url(#glow)' }))

  parts.push(logo(96, 92, 112, 26))
  parts.push(text({ x: 248, y: 172, size: 58, weight: 700 }, 'Command Code 用量面板'))
  parts.push(text({ x: 250, y: 230, size: 23, fill: P.muted }, '为 DeepSeek Harness 打造：额度、窗口、请求与档位，一眼看清'))

  const labels = ['Settings 页签', '可拖动浮窗胶囊', '9 档套餐识别', '中 / EN 双语']
  let cx = 250
  for (const label of labels) {
    const c = chip(cx, 282, label, { size: 15 })
    parts.push(c.svg)
    cx += c.width + 14
  }

  parts.push(text({ x: 96, y: 474, size: 20, fill: P.dim, family: MONO }, 'github.com/miko-cn/dsh-commandcode-quota'))
  parts.push(text({ x: 700, y: 474, size: 20, fill: P.dim }, '· MIT License · npm'))

  // right-hand product mock: card 990..1510, capsule aligned to the same edges
  const cardX = 990
  const cardW = 520
  const cardY = 74
  parts.push(rect({ x: cardX, y: cardY, w: cardW, h: 300, r: 26, fill: 'rgba(26,32,29,0.72)', stroke: 'rgba(255,255,255,0.12)', sw: 1.5 }))
  parts.push(logo(cardX + 26, cardY + 24, 44, 11))
  parts.push(text({ x: cardX + 84, y: cardY + 46, size: 24, weight: 700 }, 'Command Code'))
  parts.push(text({ x: cardX + 84, y: cardY + 74, size: 16, fill: P.muted }, '@demo'))
  parts.push(iconBtn(cardX + cardW - 96, cardY + 30, 30, '⟳'))
  parts.push(iconBtn(cardX + cardW - 56, cardY + 30, 30, '✕'))
  parts.push(text({ x: cardX + 26, y: cardY + 132, size: 15, weight: 700, fill: P.muted, spacing: 1.5 }, '套餐额度'))
  parts.push(text({ x: cardX + 26, y: cardY + 196, size: 50, weight: 700 }, '67.88'))
  parts.push(text({ x: cardX + 168, y: cardY + 196, size: 22, fill: P.muted }, '/ 70 剩余'))
  parts.push(bar({ x: cardX + 26, y: cardY + 216, w: cardW - 52, h: 10, pct: 3 }))
  parts.push(text({ x: cardX + 26, y: cardY + 258, size: 17, fill: P.muted }, '5 小时 1.03 / 14 · 每周 2.12 / 35'))
  parts.push(text({ x: cardX + cardW - 26, y: cardY + 258, size: 17, fill: P.teal, anchor: 'end' }, '7% / 6%'))

  const capW = 320
  const capX = cardX + cardW - capW
  const capY = 400
  parts.push(rect({ x: capX, y: capY, w: capW, h: 84, r: 18, fill: 'rgba(30,38,34,0.55)', stroke: 'rgba(255,255,255,0.14)', sw: 1.5 }))
  parts.push(logo(capX + 12, capY + 12, 42, 10))
  parts.push(text({ x: capX + 66, y: capY + 30, size: 14, weight: 700, fill: P.muted }, '5h'))
  parts.push(bar({ x: capX + 96, y: capY + 19, w: 150, h: 10, pct: 7 }))
  parts.push(text({ x: capX + 254, y: capY + 30, size: 14, fill: P.muted }, '7%'))
  parts.push(text({ x: capX + 66, y: capY + 60, size: 14, weight: 700, fill: P.muted }, 'W'))
  parts.push(bar({ x: capX + 96, y: capY + 49, w: 150, h: 10, pct: 6 }))
  parts.push(text({ x: capX + 254, y: capY + 60, size: 14, fill: P.muted }, '6%'))
  parts.push(`<circle cx="${capX + 300}" cy="${capY + 42}" r="4" fill="${P.teal}"/>`)

  return canvas({ w, h, body: parts.join('\n') })
}

// ------------------------------------------------------- popover preview ----
function popover() {
  const W = 1100
  const cw = 960
  const cx = 70
  const cy = 70
  const pad = 36
  const ip = 30
  const left = cx + pad
  const innerW = cw - pad * 2
  const gap = 18

  const headerTop = cy + pad
  const headerH = 88
  let y = headerTop + headerH + 26

  const card1 = { top: y, h: 276 }
  y = card1.top + card1.h + gap
  const card2 = { top: y, h: 304 }
  y = card2.top + card2.h + gap
  const card3 = { top: y, h: 270 }
  const footerBaseline = card3.top + card3.h + 54
  const shellH = footerBaseline + 24 - cy

  const parts = []
  parts.push(...board({ w: W, h: 1560, id: 'pv', glow: blobBackdrop(W, 1400) }))
  parts.push(rect({ x: cx, y: cy, w: cw, h: shellH, r: 40, fill: P.glass, stroke: P.hairlineStrong, sw: 2 }))
  parts.push(`<radialGradient id="sheen" cx="0.16" cy="0" r="0.9">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>`)
  parts.push(rect({ x: cx, y: cy, w: cw, h: shellH, r: 40, fill: 'url(#sheen)' }))

  // header
  parts.push(logo(left, headerTop, 88, 22))
  parts.push(text({ x: left + 112, y: headerTop + 40, size: 40, weight: 700 }, 'Command Code'))
  parts.push(text({ x: left + 114, y: headerTop + 80, size: 30, fill: P.muted }, '@demo'))
  parts.push(iconBtn(cx + cw - pad - 76, headerTop + 28, 34, '⟳'))
  parts.push(iconBtn(cx + cw - pad - 34, headerTop + 28, 34, '✕'))

  // credits card
  {
    const t = card1.top
    const c = left + ip
    const w = innerW - ip * 2
    parts.push(rect({ x: left, y: t, w: innerW, h: card1.h, r: 26, fill: P.glassCard, stroke: P.hairline, sw: 1.4 }))
    parts.push(text({ x: c, y: t + 58, size: 30, weight: 700, fill: P.muted, spacing: 2 }, '套餐额度'))
    parts.push(text({ x: c, y: t + 128, size: 62, weight: 700 }, '67.88'))
    parts.push(text({ x: c + 208, y: t + 128, size: 30, fill: P.muted }, '/ 70 剩余'))
    parts.push(bar({ x: c, y: t + 150, w, h: 18, pct: 3 }))
    parts.push(text({ x: c, y: t + 208, size: 28, fill: P.muted }, '已用 2.26 / 70'))
    parts.push(text({ x: c + w, y: t + 208, size: 28, fill: P.muted, anchor: 'end' }, '3.2%'))
    parts.push(text({ x: c, y: t + 246, size: 28, fill: P.dim }, '续费 12/3 · 还剩 21 天 6 小时'))
    parts.push(text({ x: c + w, y: t + 246, size: 28, fill: P.dim, anchor: 'end' }, '11/3 →'))
  }

  // windows card
  {
    const t = card2.top
    const c = left + ip
    const w = innerW - ip * 2
    parts.push(rect({ x: left, y: t, w: innerW, h: card2.h, r: 26, fill: P.glassCard, stroke: P.hairline, sw: 1.4 }))
    parts.push(text({ x: c, y: t + 58, size: 30, weight: 700, fill: P.muted, spacing: 2 }, '用量窗口'))
    parts.push(text({ x: c, y: t + 104, size: 28, weight: 600 }, '5 小时'))
    parts.push(text({ x: c + w, y: t + 104, size: 26, fill: P.muted, anchor: 'end' }, '1.17 / 14'))
    parts.push(bar({ x: c, y: t + 118, w, h: 16, pct: 8 }))
    parts.push(text({ x: c, y: t + 164, size: 24, fill: P.dim }, '重置 15:55 · 还剩 3h 12m 45s'))
    parts.push(text({ x: c + w, y: t + 164, size: 24, fill: P.muted, anchor: 'end' }, '8%'))
    parts.push(text({ x: c, y: t + 214, size: 28, weight: 600 }, '每周'))
    parts.push(text({ x: c + w, y: t + 214, size: 26, fill: P.muted, anchor: 'end' }, '2.26 / 35'))
    parts.push(bar({ x: c, y: t + 228, w, h: 16, pct: 7 }))
    parts.push(text({ x: c, y: t + 274, size: 24, fill: P.dim }, '重置 11/10 22:57 · 还剩 2d 3h 12m'))
    parts.push(text({ x: c + w, y: t + 274, size: 24, fill: P.muted, anchor: 'end' }, '7%'))
  }

  // period card
  {
    const t = card3.top
    const c = left + ip
    const w = innerW - ip * 2
    parts.push(rect({ x: left, y: t, w: innerW, h: card3.h, r: 26, fill: P.glassCard, stroke: P.hairline, sw: 1.4 }))
    parts.push(text({ x: c, y: t + 58, size: 30, weight: 700, fill: P.muted, spacing: 2 }, '本期请求'))
    parts.push(text({ x: c + w, y: t + 58, size: 24, fill: P.dim, anchor: 'end' }, '每分钟自动刷新'))
    const stats = [
      ['2.5K', '请求'],
      ['100%', '成功率'],
      ['$2.16', '花费'],
    ]
    const bw = (w - 36) / 3
    stats.forEach(([value, label], index) => {
      const bx = c + index * (bw + 18)
      parts.push(rect({ x: bx, y: t + 84, w: bw, h: 116, r: 18, fill: 'rgba(20,24,22,0.45)', stroke: P.hairline, sw: 1.2 }))
      parts.push(text({ x: bx + bw / 2, y: t + 150, size: 36, weight: 700, anchor: 'middle' }, value))
      parts.push(text({ x: bx + bw / 2, y: t + 184, size: 24, fill: P.dim, anchor: 'middle' }, label))
    })
    parts.push(text({ x: c, y: t + 240, size: 26, fill: P.muted }, '输入 / 输出'))
    parts.push(text({ x: c + w, y: t + 240, size: 26, weight: 600, anchor: 'end' }, '296.7M / 1.4M'))
  }

  // footer
  parts.push(text({ x: left, y: footerBaseline, size: 24, fill: P.dim }, '更新于 刚刚'))
  parts.push(text({ x: left + innerW, y: footerBaseline, size: 26, weight: 600, fill: P.teal, anchor: 'end' }, '在 Studio 打开'))

  // floating capsule, left-aligned with the shell, two stacked rows
  const capY = cy + shellH + 54
  const canvasH = capY + 112 + 56
  parts.push(rect({ x: cx, y: capY, w: 560, h: 112, r: 48, fill: P.glass, stroke: P.hairlineStrong, sw: 2 }))
  parts.push(logo(cx + 24, capY + 17, 78, 20))
  parts.push(text({ x: cx + 126, y: capY + 42, size: 26, weight: 700, fill: P.muted }, '5h'))
  parts.push(bar({ x: cx + 172, y: capY + 27, w: 290, h: 18, pct: 8 }))
  parts.push(text({ x: cx + 474, y: capY + 42, size: 24, fill: P.muted }, '8%'))
  parts.push(text({ x: cx + 126, y: capY + 92, size: 26, weight: 700, fill: P.muted }, 'W'))
  parts.push(bar({ x: cx + 172, y: capY + 77, w: 290, h: 18, pct: 7 }))
  parts.push(text({ x: cx + 474, y: capY + 92, size: 24, fill: P.muted }, '7%'))
  parts.push(`<circle cx="${cx + 532}" cy="${capY + 56}" r="5" fill="${P.teal}"/>`)

  return canvas({ w: W, h: canvasH, body: parts.join('\n') })
}

// ------------------------------------------------------ settings preview ----
function settings() {
  const W = 1240
  const x = 120
  const w = 1000
  const gap = 20
  const pad = 28
  const c = x + pad
  const iw = w - pad * 2

  let y = 262
  const card1 = { top: y, h: 268 }
  y = card1.top + card1.h + gap
  const card2 = { top: y, h: 318 }
  y = card2.top + card2.h + gap
  const card3 = { top: y, h: 268 }
  y = card3.top + card3.h + gap
  const card4 = { top: y, h: 168 }
  y = card4.top + card4.h + gap
  const card5 = { top: y, h: 250 }
  const H = card5.top + card5.h + 60

  const parts = []
  parts.push(...board({ w: W, h: H, id: 'st' }))

  // page header
  parts.push(logo(x, 66, 96, 24))
  parts.push(text({ x: x + 124, y: 126, size: 44, weight: 700 }, 'Command Code'))
  parts.push(text({ x: x + 126, y: 166, size: 28, fill: P.muted }, '@demo'))
  parts.push(rect({ x: x + 470, y: 94, w: 108, h: 46, r: 23, fill: 'rgba(18,184,134,0.14)', stroke: 'rgba(18,184,134,0.35)', sw: 1.5 }))
  parts.push(text({ x: x + 524, y: 125, size: 24, weight: 700, fill: P.teal, anchor: 'middle' }, 'GOAT'))
  parts.push(text({ x: x + w - 120, y: 125, size: 26, fill: P.dim, anchor: 'end' }, '更新于 刚刚'))
  parts.push(rect({ x: x + w - 100, y: 94, w: 100, h: 46, r: 14, fill: 'none', stroke: P.border, sw: 1.6 }))
  parts.push(text({ x: x + w - 50, y: 125, size: 24, fill: P.text, anchor: 'middle' }, '刷新'))
  parts.push(text({ x, y: 222, size: 26, fill: P.muted }, '完整数据与设置见 设置 → Command Code'))

  // credits
  {
    const t = card1.top
    parts.push(rect({ x, y: t, w, h: card1.h, r: 26, fill: P.card, stroke: P.border, sw: 1.5 }))
    parts.push(text({ x: c, y: t + 56, size: 30, weight: 700, fill: P.muted, spacing: 2 }, '套餐额度'))
    parts.push(text({ x: c, y: t + 128, size: 60, weight: 700 }, '67.74'))
    parts.push(text({ x: c + 198, y: t + 128, size: 30, fill: P.muted }, '/ 70 剩余'))
    parts.push(bar({ x: c, y: t + 150, w: iw, h: 18, pct: 3 }))
    parts.push(text({ x: c, y: t + 208, size: 26, fill: P.muted }, '已用 2.26 / 70'))
    parts.push(text({ x: c + iw, y: t + 208, size: 26, fill: P.muted, anchor: 'end' }, '3.2%'))
    parts.push(text({ x: c, y: t + 244, size: 26, fill: P.dim }, '续费 12/3 · 还剩 21 天 6 小时'))
    parts.push(text({ x: c + iw, y: t + 244, size: 26, fill: P.dim, anchor: 'end' }, '11/3 →'))
  }

  // windows
  {
    const t = card2.top
    parts.push(rect({ x, y: t, w, h: card2.h, r: 26, fill: P.card, stroke: P.border, sw: 1.5 }))
    parts.push(text({ x: c, y: t + 56, size: 30, weight: 700, fill: P.muted, spacing: 2 }, '用量窗口'))
    parts.push(text({ x: c, y: t + 104, size: 28, weight: 600 }, '5 小时'))
    parts.push(text({ x: c + iw, y: t + 104, size: 26, fill: P.muted, anchor: 'end' }, '1.17 / 14'))
    parts.push(bar({ x: c, y: t + 118, w: iw, h: 16, pct: 8 }))
    parts.push(text({ x: c, y: t + 164, size: 24, fill: P.dim }, '重置 15:55 · 还剩 3h 12m 45s'))
    parts.push(text({ x: c + iw, y: t + 164, size: 24, fill: P.muted, anchor: 'end' }, '8%'))
    parts.push(text({ x: c, y: t + 222, size: 28, weight: 600 }, '每周'))
    parts.push(text({ x: c + iw, y: t + 222, size: 26, fill: P.muted, anchor: 'end' }, '2.26 / 35'))
    parts.push(bar({ x: c, y: t + 236, w: iw, h: 16, pct: 7 }))
    parts.push(text({ x: c, y: t + 282, size: 24, fill: P.dim }, '重置 11/10 22:57 · 还剩 2d 3h 12m'))
    parts.push(text({ x: c + iw, y: t + 282, size: 24, fill: P.muted, anchor: 'end' }, '7%'))
  }

  // period requests
  {
    const t = card3.top
    parts.push(rect({ x, y: t, w, h: card3.h, r: 26, fill: P.card, stroke: P.border, sw: 1.5 }))
    parts.push(text({ x: c, y: t + 56, size: 30, weight: 700, fill: P.muted, spacing: 2 }, '本期请求'))
    parts.push(text({ x: c + iw, y: t + 56, size: 24, fill: P.dim, anchor: 'end' }, '每分钟自动刷新'))
    const stats = [
      ['2.5K', '请求'],
      ['100%', '成功率'],
      ['$2.16', '花费'],
      ['296.7M', 'tokens'],
    ]
    const bw = (iw - 54) / 4
    stats.forEach(([value, label], index) => {
      const bx = c + index * (bw + 18)
      parts.push(rect({ x: bx, y: t + 84, w: bw, h: 112, r: 18, fill: '#1c211f', stroke: P.border, sw: 1.2 }))
      parts.push(text({ x: bx + bw / 2, y: t + 146, size: 34, weight: 700, anchor: 'middle' }, value))
      parts.push(text({ x: bx + bw / 2, y: t + 178, size: 22, fill: P.dim, anchor: 'middle' }, label))
    })
    parts.push(text({ x: c, y: t + 232, size: 25, fill: P.muted }, '输入 / 输出'))
    parts.push(text({ x: c + iw, y: t + 232, size: 25, weight: 600, anchor: 'end' }, '296.7M / 1.4M'))
  }

  // plan tier
  {
    const t = card4.top
    parts.push(rect({ x, y: t, w, h: card4.h, r: 26, fill: P.card, stroke: P.border, sw: 1.5 }))
    parts.push(text({ x: c, y: t + 56, size: 30, weight: 700, fill: P.muted, spacing: 2 }, '套餐档位'))
    parts.push(text({ x: c, y: t + 122, size: 28, weight: 600 }, 'GOAT'))
    parts.push(rect({ x: c + 150, y: t + 92, w: 310, h: 46, r: 12, fill: '#1c211f', stroke: P.border, sw: 1.4 }))
    parts.push(text({ x: c + 170, y: t + 123, size: 24, fill: P.text }, '按订阅自动识别'))
    parts.push(text({ x: c + 440, y: t + 123, size: 22, fill: P.dim, anchor: 'end' }, '▾'))
    parts.push(text({ x: c + iw, y: t + 122, size: 24, fill: P.dim, anchor: 'end' }, '窗口上限 14 / 35'))
  }

  // API key
  {
    const t = card5.top
    parts.push(rect({ x, y: t, w, h: card5.h, r: 26, fill: P.card, stroke: P.border, sw: 1.5 }))
    parts.push(text({ x: c, y: t + 56, size: 30, weight: 700, fill: P.muted, spacing: 2 }, 'API KEY'))
    parts.push(text({ x: c + iw, y: t + 56, size: 26, weight: 600, fill: P.green, anchor: 'end' }, '已配置'))
    parts.push(text({ x: c, y: t + 100, size: 24, fill: P.dim }, '来源: DSH 凭据库 · 可在此处修改'))
    parts.push(rect({ x: c, y: t + 124, w: iw - 250, h: 56, r: 12, fill: '#1c211f', stroke: P.border, sw: 1.4 }))
    parts.push(text({ x: c + 20, y: t + 160, size: 26, fill: P.muted }, '••••••••••••••••'))
    parts.push(rect({ x: c + iw - 224, y: t + 124, w: 108, h: 56, r: 12, fill: P.tealDark }))
    parts.push(text({ x: c + iw - 170, y: t + 160, size: 26, weight: 600, fill: '#ffffff', anchor: 'middle' }, '保存'))
    parts.push(rect({ x: c + iw - 104, y: t + 124, w: 104, h: 56, r: 12, fill: 'none', stroke: P.border, sw: 1.4 }))
    parts.push(text({ x: c + iw - 52, y: t + 160, size: 26, fill: P.text, anchor: 'middle' }, '清除'))
    parts.push(text({ x: c, y: t + 222, size: 22, fill: P.dim }, '密钥只保存在 DSH 的凭据库里，不会写进配置文件，也不会发给浏览器。'))
  }

  return canvas({ w: W, h: H, body: parts.join('\n') })
}

const outputs = [
  ['banner.png', banner()],
  ['preview-popover.png', popover()],
  ['preview-settings.png', settings()],
]

for (const [name, svg] of outputs) {
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync(join(assets, name), png)
  writeFileSync(join(assets, name.replace(/\.png$/, '.svg')), svg)
  const meta = await sharp(png).metadata()
  console.log(name, `${meta.width}x${meta.height}`, `${(png.length / 1024).toFixed(1)} KiB`)
}
