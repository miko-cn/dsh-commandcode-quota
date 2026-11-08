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
  bgSoft: '#1b1f1d',
  card: '#232826',
  cardAlt: '#202422',
  border: '#333c38',
  text: '#f2f5f3',
  muted: '#9aa5a0',
  dim: '#6d7873',
  teal: '#12b886',
  tealDark: '#0d9488',
  green: '#3ddc97',
  track: '#39423e',
  glassCard: 'rgba(28,33,31,0.62)',
  glassBorder: 'rgba(255,255,255,0.08)',
  warn: '#f0b429',
  red: '#f2555a',
}
const FONT = 'Segoe UI, Microsoft YaHei UI, Microsoft YaHei, PingFang SC, sans-serif'
const MONO = 'Cascadia Mono, Consolas, monospace'

const esc = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function text({ x, y, size = 16, weight = 400, fill = P.text, anchor = 'start', family = FONT, opacity = 1, spacing = 0 }, value) {
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}"
    text-anchor="${anchor}" opacity="${opacity}" letter-spacing="${spacing}">${esc(value)}</text>`
}

function rect({ x, y, w, h, r = 0, fill = 'none', stroke = 'none', sw = 1, opacity = 1 }) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}"/>`
}

function bar({ x, y, w, h = 8, pct = 0, color = P.teal }) {
  const fill = Math.max(3, Math.round((w * Math.min(100, Math.max(0, pct))) / 100))
  return rect({ x, y, w, h, r: h / 2, fill: P.track }) + rect({ x, y, w: fill, h, r: h / 2, fill: color })
}

let clipId = 0
function logo(x, y, size, r = size * 0.24) {
  const id = `clip${clipId++}`
  return `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}"/></clipPath></defs>
    <image x="${x}" y="${y}" width="${size}" height="${size}" href="${LOGO}" clip-path="url(#${id})"/>`
}

function iconBtn(x, y, size, glyph) {
  return rect({ x, y, w: size, h: size, r: size * 0.28, fill: 'none' }) +
    text({ x: x + size / 2, y: y + size * 0.72, size: size * 0.62, fill: P.muted, anchor: 'middle' }, glyph)
}

function chip(x, y, label, size = 15, padX = 14, height = 32) {
  const width = Math.max(64, label.length * size * 0.92 + padX * 2)
  return {
    svg: rect({ x, y, w: width, h: height, r: height / 2, fill: 'rgba(18,184,134,0.12)', stroke: 'rgba(18,184,134,0.32)', sw: 1.4 }) +
      text({ x: x + width / 2, y: y + height * 0.64, size, weight: 600, fill: P.teal, anchor: 'middle' }, label),
    width,
  }
}

function canvas({ w, h, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
}

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
  parts.push(
    text({ x: 250, y: 230, size: 23, fill: P.muted }, '为 DeepSeek Harness 打造：额度、窗口、请求与档位，一眼看清'),
  )

  const labels = ['Settings 页签', '可拖动浮窗胶囊', '9 档套餐识别', '中 / EN 双语']
  let cx = 250
  for (const label of labels) {
    const c = chip(cx, 282, label, 15)
    parts.push(c.svg)
    cx += c.width + 14
  }

  parts.push(text({ x: 96, y: 474, size: 20, fill: P.dim, family: MONO }, 'github.com/miko-cn/dsh-commandcode-quota'))
  parts.push(text({ x: 640, y: 474, size: 20, fill: P.dim }, '· MIT License · npm'))

  // floating mini card
  const cw = 520
  const cx2 = 990
  const cy = 74
  parts.push(rect({ x: cx2, y: cy, w: cw, h: 300, r: 26, fill: 'rgba(24,30,27,0.94)', stroke: P.border, sw: 1.5 }))
  parts.push(logo(cx2 + 26, cy + 24, 44, 11))
  parts.push(text({ x: cx2 + 84, y: cy + 46, size: 24, weight: 700 }, 'Command Code'))
  parts.push(text({ x: cx2 + 84, y: cy + 74, size: 16, fill: P.muted }, '@miko'))
  parts.push(iconBtn(cx2 + cw - 96, cy + 28, 30, '⟳'))
  parts.push(iconBtn(cx2 + cw - 56, cy + 28, 30, '✕'))
  parts.push(text({ x: cx2 + 26, y: cy + 132, size: 15, weight: 700, fill: P.muted, spacing: 1.5 }, '套餐额度'))
  parts.push(text({ x: cx2 + 26, y: cy + 196, size: 50, weight: 700 }, '67.88'))
  parts.push(text({ x: cx2 + 168, y: cy + 196, size: 22, fill: P.muted }, '/ 70 剩余'))
  parts.push(bar({ x: cx2 + 26, y: cy + 216, w: cw - 52, h: 10, pct: 3 }))
  parts.push(text({ x: cx2 + 26, y: cy + 258, size: 17, fill: P.muted }, '5 小时 1.03 / 14 · 每周 2.12 / 35'))
  parts.push(text({ x: cx2 + cw - 26, y: cy + 258, size: 17, fill: P.teal, anchor: 'end' }, '7% / 6%'))

  // floating capsule: logo + two stacked progress rows
  const capW = 320
  const capX = 1120
  const capY = 398
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
  const S = 3
  const W = 1100
  const H = 1560
  const cw = 960
  const cx = 70
  const cy = 70

  const parts = []
  parts.push(rect({ x: 0, y: 0, w: W, h: H, fill: P.bg }))
  parts.push(`<defs><radialGradient id="v" cx="0.5" cy="0.2" r="0.9">
    <stop offset="0" stop-color="#1f2a26"/><stop offset="1" stop-color="#151817"/></radialGradient></defs>`)
  parts.push(rect({ x: 0, y: 0, w: W, h: H, fill: 'url(#v)', opacity: 0.8 }))
  // blurred page content behind the glass
  parts.push(`<defs><filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="46"/></filter>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.13"/>
      <stop offset="0.38" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.72" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.06"/>
    </linearGradient></defs>`)
  parts.push(`<g filter="url(#soft)">
    <circle cx="210" cy="360" r="250" fill="#12b886" opacity="0.30"/>
    <circle cx="900" cy="640" r="300" fill="#3b82f6" opacity="0.20"/>
    <circle cx="520" cy="1240" r="260" fill="#f0b429" opacity="0.12"/>
    <rect x="0" y="0" width="${W}" height="260" fill="#7c8cff" opacity="0.08"/>
  </g>`)

  // card shell (frosted glass)
  parts.push(rect({ x: cx, y: cy, w: cw, h: 1230, r: 40, fill: 'rgba(33,39,36,0.74)', stroke: 'rgba(255,255,255,0.12)', sw: 2 }))
  parts.push(rect({ x: cx, y: cy, w: cw, h: 1230, r: 40, fill: 'url(#sheen)' }))
  const pad = 39
  const left = cx + pad
  const innerW = cw - pad * 2

  // header
  parts.push(logo(left, cy + pad, 84, 20))
  parts.push(text({ x: left + 108, y: cy + pad + 36, size: 40, weight: 700 }, 'Command Code'))
  parts.push(text({ x: left + 110, y: cy + pad + 76, size: 31, fill: P.muted }, '@miko'))
  parts.push(iconBtn(cx + cw - pad - 78, cy + pad + 12, 34, '⟳'))
  parts.push(iconBtn(cx + cw - pad - 34, cy + pad + 12, 34, '✕'))

  // card 1 - credits
  let y = cy + pad + 84 + 30
  const cardH1 = 300
  parts.push(rect({ x: left, y, w: innerW, h: cardH1, r: 26, fill: P.glassCard, stroke: P.glassBorder, sw: 1.4 }))
  const cp = 30
  parts.push(text({ x: left + cp, y: y + cp + 30, size: 33, weight: 700, fill: P.muted, spacing: 2 }, '套餐额度'))
  parts.push(text({ x: left + cp, y: y + 130, size: 66, weight: 700 }, '67.88'))
  parts.push(text({ x: left + cp + 214, y: y + 130, size: 33, fill: P.muted }, '/ 70 剩余'))
  parts.push(bar({ x: left + cp, y: y + 158, w: innerW - cp * 2, h: 21, pct: 3 }))
  parts.push(text({ x: left + cp, y: y + 218, size: 30, fill: P.muted }, '已用 2.12 / 70'))
  parts.push(text({ x: left + innerW - cp, y: y + 218, size: 30, fill: P.muted, anchor: 'end' }, '3%'))
  parts.push(text({ x: left + cp, y: y + 262, size: 30, fill: P.dim }, '续费 12/3'))
  parts.push(text({ x: left + innerW - cp, y: y + 262, size: 30, fill: P.dim, anchor: 'end' }, '11/3 →'))

  // card 2 - windows
  y += cardH1 + 18
  const cardH2 = 340
  parts.push(rect({ x: left, y, w: innerW, h: cardH2, r: 26, fill: P.glassCard, stroke: P.glassBorder, sw: 1.4 }))
  parts.push(text({ x: left + cp, y: y + cp + 30, size: 33, weight: 700, fill: P.muted, spacing: 2 }, '用量窗口'))
  parts.push(text({ x: left + cp, y: y + 108, size: 30, weight: 600 }, '5 小时'))
  parts.push(text({ x: left + innerW - cp, y: y + 108, size: 28, fill: P.muted, anchor: 'end' }, '1.03 / 14'))
  parts.push(bar({ x: left + cp, y: y + 126, w: innerW - cp * 2, h: 18, pct: 7 }))
  parts.push(text({ x: left + cp, y: y + 174, size: 26, fill: P.dim }, '重置 15:55'))
  parts.push(text({ x: left + innerW - cp, y: y + 174, size: 26, fill: P.muted, anchor: 'end' }, '7%'))
  parts.push(text({ x: left + cp, y: y + 232, size: 30, weight: 600 }, '每周'))
  parts.push(text({ x: left + innerW - cp, y: y + 232, size: 28, fill: P.muted, anchor: 'end' }, '2.12 / 35'))
  parts.push(bar({ x: left + cp, y: y + 250, w: innerW - cp * 2, h: 18, pct: 6 }))
  parts.push(text({ x: left + cp, y: y + 298, size: 26, fill: P.dim }, '重置 11/10 22:57'))
  parts.push(text({ x: left + innerW - cp, y: y + 298, size: 26, fill: P.muted, anchor: 'end' }, '6%'))

  // card 3 - period requests
  y += cardH2 + 18
  const cardH3 = 300
  parts.push(rect({ x: left, y, w: innerW, h: cardH3, r: 26, fill: P.glassCard, stroke: P.glassBorder, sw: 1.4 }))
  parts.push(text({ x: left + cp, y: y + cp + 30, size: 33, weight: 700, fill: P.muted, spacing: 2 }, '本期请求'))
  parts.push(text({ x: left + innerW - cp, y: y + cp + 30, size: 26, fill: P.dim, anchor: 'end' }, '每分钟自动刷新'))
  const stats = [
    ['2.4K', '请求'],
    ['100%', '成功率'],
    ['$2.04', '花费'],
  ]
  const bw = (innerW - cp * 2 - 36) / 3
  stats.forEach(([value, label], index) => {
    const bx = left + cp + index * (bw + 18)
    parts.push(rect({ x: bx, y: y + 92, w: bw, h: 132, r: 20, fill: '#1c211f', stroke: P.border, sw: 1.2 }))
    parts.push(text({ x: bx + bw / 2, y: y + 162, size: 40, weight: 700, anchor: 'middle' }, value))
    parts.push(text({ x: bx + bw / 2, y: y + 198, size: 26, fill: P.dim, anchor: 'middle' }, label))
  })
  parts.push(text({ x: left + cp, y: y + 254, size: 27, fill: P.muted }, '输入 / 输出'))
  parts.push(text({ x: left + innerW - cp, y: y + 254, size: 27, weight: 600, anchor: 'end' }, '263.0M / 1.3M'))

  // footer
  const footY = cy + 1230 - 48
  parts.push(text({ x: left, y: footY, size: 26, fill: P.dim }, '更新于 刚刚'))
  parts.push(text({ x: left + innerW, y: footY, size: 28, weight: 600, fill: P.teal, anchor: 'end' }, '在 Studio 打开'))

  // capsule: logo + two stacked progress rows
  const capY = cy + 1230 + 70
  parts.push(rect({ x: cx, y: capY, w: 560, h: 112, r: 48, fill: 'rgba(33,39,36,0.74)', stroke: 'rgba(255,255,255,0.12)', sw: 2 }))
  parts.push(logo(cx + 24, capY + 17, 78, 20))
  parts.push(text({ x: cx + 126, y: capY + 42, size: 26, weight: 700, fill: P.muted }, '5h'))
  parts.push(bar({ x: cx + 172, y: capY + 27, w: 290, h: 18, pct: 7 }))
  parts.push(text({ x: cx + 474, y: capY + 42, size: 24, fill: P.muted }, '7%'))
  parts.push(text({ x: cx + 126, y: capY + 92, size: 26, weight: 700, fill: P.muted }, 'W'))
  parts.push(bar({ x: cx + 172, y: capY + 77, w: 290, h: 18, pct: 6 }))
  parts.push(text({ x: cx + 474, y: capY + 92, size: 24, fill: P.muted }, '6%'))
  parts.push(`<circle cx="${cx + 532}" cy="${capY + 56}" r="5" fill="${P.teal}"/>`)

  void S
  return canvas({ w: W, h: H, body: parts.join('\n') })
}

// ------------------------------------------------------ settings preview ----
function settings() {
  const W = 1240
  const H = 1900
  const x = 120
  const w = 1000
  const parts = []
  parts.push(rect({ x: 0, y: 0, w: W, h: H, fill: P.bg }))
  parts.push(`<defs><radialGradient id="v2" cx="0.5" cy="0.1" r="0.9">
    <stop offset="0" stop-color="#1f2a26"/><stop offset="1" stop-color="#151817"/></radialGradient></defs>`)
  parts.push(rect({ x: 0, y: 0, w: W, h: H, fill: 'url(#v2)', opacity: 0.85 }))

  const cp = 26
  // page header
  parts.push(logo(x, 70, 96, 24))
  parts.push(text({ x: x + 124, y: 126, size: 44, weight: 700 }, 'Command Code'))
  parts.push(text({ x: x + 126, y: 168, size: 28, fill: P.muted }, '@miko'))
  parts.push(rect({ x: x + 470, y: 96, w: 108, h: 46, r: 23, fill: 'rgba(18,184,134,0.14)', stroke: 'rgba(18,184,134,0.35)', sw: 1.5 }))
  parts.push(text({ x: x + 524, y: 128, size: 24, weight: 700, fill: P.teal, anchor: 'middle' }, 'GOAT'))
  parts.push(text({ x: x + w - 120, y: 128, size: 26, fill: P.dim, anchor: 'end' }, '更新于 刚刚'))
  parts.push(rect({ x: x + w - 100, y: 96, w: 100, h: 46, r: 14, fill: 'none', stroke: P.border, sw: 1.6 }))
  parts.push(text({ x: x + w - 50, y: 128, size: 24, fill: P.text, anchor: 'middle' }, '刷新'))
  parts.push(text({ x: x, y: 226, size: 26, fill: P.muted }, '完整数据与设置见 设置 → Command Code'))

  // card 1 credits
  let y = 262
  parts.push(rect({ x, y, w, h: 286, r: 26, fill: P.card, stroke: P.border, sw: 1.5 }))
  parts.push(text({ x: x + cp, y: y + 62, size: 30, weight: 700, fill: P.muted, spacing: 2 }, '套餐额度'))
  parts.push(text({ x: x + cp, y: y + 150, size: 62, weight: 700 }, '67.88'))
  parts.push(text({ x: x + cp + 202, y: y + 150, size: 30, fill: P.muted }, '/ 70 剩余'))
  parts.push(bar({ x: x + cp, y: y + 176, w: w - cp * 2, h: 18, pct: 3 }))
  parts.push(text({ x: x + cp, y: y + 232, size: 26, fill: P.muted }, '已用 2.12 / 70'))
  parts.push(text({ x: x + w - cp, y: y + 232, size: 26, fill: P.muted, anchor: 'end' }, '3%'))
  parts.push(text({ x: x + cp, y: y + 268, size: 26, fill: P.dim }, '续费 12/3'))
  parts.push(text({ x: x + w - cp, y: y + 268, size: 26, fill: P.dim, anchor: 'end' }, '11/3 →'))

  // card 2 windows
  y += 306
  parts.push(rect({ x, y, w, h: 330, r: 26, fill: P.card, stroke: P.border, sw: 1.5 }))
  parts.push(text({ x: x + cp, y: y + 62, size: 30, weight: 700, fill: P.muted, spacing: 2 }, '用量窗口'))
  parts.push(text({ x: x + cp, y: y + 128, size: 28, weight: 600 }, '5 小时'))
  parts.push(text({ x: x + w - cp, y: y + 128, size: 26, fill: P.muted, anchor: 'end' }, '1.03 / 14'))
  parts.push(bar({ x: x + cp, y: y + 146, w: w - cp * 2, h: 16, pct: 7 }))
  parts.push(text({ x: x + cp, y: y + 190, size: 24, fill: P.dim }, '重置 15:55'))
  parts.push(text({ x: x + w - cp, y: y + 190, size: 24, fill: P.muted, anchor: 'end' }, '7%'))
  parts.push(text({ x: x + cp, y: y + 246, size: 28, weight: 600 }, '每周'))
  parts.push(text({ x: x + w - cp, y: y + 246, size: 26, fill: P.muted, anchor: 'end' }, '2.12 / 35'))
  parts.push(bar({ x: x + cp, y: y + 264, w: w - cp * 2, h: 16, pct: 6 }))
  parts.push(text({ x: x + cp, y: y + 308, size: 24, fill: P.dim }, '重置 11/10 22:57'))
  parts.push(text({ x: x + w - cp, y: y + 308, size: 24, fill: P.muted, anchor: 'end' }, '6%'))

  // card 3 period requests
  y += 350
  parts.push(rect({ x, y, w, h: 286, r: 26, fill: P.card, stroke: P.border, sw: 1.5 }))
  parts.push(text({ x: x + cp, y: y + 62, size: 30, weight: 700, fill: P.muted, spacing: 2 }, '本期请求'))
  parts.push(text({ x: x + w - cp, y: y + 62, size: 24, fill: P.dim, anchor: 'end' }, '每分钟自动刷新'))
  const stats = [
    ['2.4K', '请求'],
    ['100%', '成功率'],
    ['$2.04', '花费'],
    ['263.0M', 'tokens'],
  ]
  const bw = (w - cp * 2 - 54) / 4
  stats.forEach(([value, label], index) => {
    const bx = x + cp + index * (bw + 18)
    parts.push(rect({ x: bx, y: y + 86, w: bw, h: 130, r: 18, fill: '#1c211f', stroke: P.border, sw: 1.2 }))
    parts.push(text({ x: bx + bw / 2, y: y + 152, size: 36, weight: 700, anchor: 'middle' }, value))
    parts.push(text({ x: bx + bw / 2, y: y + 188, size: 24, fill: P.dim, anchor: 'middle' }, label))
  })
  parts.push(text({ x: x + cp, y: y + 258, size: 25, fill: P.muted }, '输入 / 输出'))
  parts.push(text({ x: x + w - cp, y: y + 258, size: 25, weight: 600, anchor: 'end' }, '263.0M / 1.3M'))

  // card 4 plan tier
  y += 306
  parts.push(rect({ x, y, w, h: 176, r: 26, fill: P.card, stroke: P.border, sw: 1.5 }))
  parts.push(text({ x: x + cp, y: y + 58, size: 30, weight: 700, fill: P.muted, spacing: 2 }, '套餐档位'))
  parts.push(text({ x: x + cp, y: y + 122, size: 28, weight: 600 }, 'GOAT'))
  parts.push(rect({ x: x + 160, y: y + 92, w: 300, h: 46, r: 12, fill: '#1c211f', stroke: P.border, sw: 1.4 }))
  parts.push(text({ x: x + 180, y: y + 122, size: 24, fill: P.text }, '按订阅自动识别'))
  parts.push(text({ x: x + 444, y: y + 122, size: 22, fill: P.dim, anchor: 'end' }, '▾'))
  parts.push(text({ x: x + w - cp, y: y + 122, size: 24, fill: P.dim, anchor: 'end' }, '窗口上限 14 / 35'))

  // card 5 API key
  y += 200
  parts.push(rect({ x, y, w, h: 300, r: 26, fill: P.card, stroke: P.border, sw: 1.5 }))
  parts.push(text({ x: x + cp, y: y + 58, size: 30, weight: 700, fill: P.muted, spacing: 2 }, 'API KEY'))
  parts.push(text({ x: x + w - cp, y: y + 58, size: 26, weight: 600, fill: P.green, anchor: 'end' }, '已配置'))
  parts.push(text({ x: x + cp, y: y + 106, size: 24, fill: P.dim }, '来源: DSH 凭据库 · 可在此处修改'))
  parts.push(rect({ x: x + cp, y: y + 130, w: w - cp * 2 - 250, h: 56, r: 12, fill: '#1c211f', stroke: P.border, sw: 1.4 }))
  parts.push(text({ x: x + cp + 20, y: y + 166, size: 26, fill: P.muted }, '••••••••••••••••'))
  parts.push(rect({ x: x + w - cp - 224, y: y + 130, w: 108, h: 56, r: 12, fill: P.tealDark }))
  parts.push(text({ x: x + w - cp - 170, y: y + 166, size: 26, weight: 600, fill: '#ffffff', anchor: 'middle' }, '保存'))
  parts.push(rect({ x: x + w - cp - 104, y: y + 130, w: 104, h: 56, r: 12, fill: 'none', stroke: P.border, sw: 1.4 }))
  parts.push(text({ x: x + w - cp - 52, y: y + 166, size: 26, fill: P.text, anchor: 'middle' }, '清除'))
  parts.push(text({ x: x + cp, y: y + 240, size: 22, fill: P.dim }, '密钥只保存在 DSH 的凭据库里，不会写进配置文件，也不会发给浏览器。'))

  return canvas({ w: W, h: H, body: parts.join('\n') })
}

const outputs = [
  ['banner.png', banner(), 1600, 520],
  ['preview-popover.png', popover(), 1100, 1560],
  ['preview-settings.png', settings(), 1240, 1900],
]

for (const [name, svg, width, height] of outputs) {
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync(join(assets, name), png)
  writeFileSync(join(assets, name.replace(/\.png$/, '.svg')), svg)
  const meta = await sharp(png).metadata()
  console.log(name, `${meta.width}x${meta.height}`, `${(png.length / 1024).toFixed(1)} KiB`)
}
