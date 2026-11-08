// Local smoke test for the Client half: loads client.js with stubbed browser
// globals, registers the slots, opens the panel and renders its tree.
// Not part of the installed bundle.
import { fileURLToPath } from 'node:url'

const Fragment = Symbol('Fragment')
const React = {
  Fragment,
  createElement(type, props, ...children) {
    return { type, props: { ...(props || {}), children: children.flat() } }
  },
  useState(value) {
    return [value, () => {}]
  },
  useEffect() {},
}

const created = []
const documentStub = {
  getElementById: () => null,
  createElement: () => {
    const node = { id: '', textContent: '', remove() {} }
    created.push(node)
    return node
  },
  head: { appendChild() {} },
}

const sample = {
  ok: true,
  fetchedAt: new Date().toISOString(),
  keySource: 'test',
  account: { userName: 'miko', name: 'Mi No', email: 'x@example.com' },
  org: null,
  plan: { id: 'individual-goat', name: 'GOAT', credits: 70, fiveHourCap: 14, weeklyCap: 35, source: 'detected', known: true },
  credits: { remaining: 68.17, used: 1.83, purchased: 0, free: 0, total: 70, percent: 2.6, belowThreshold: false },
  windows: {
    limited: true,
    fiveHour: { used: 0.75, cap: 14, exceeded: false, resetAt: Date.now() + 3600000, percent: 5.3 },
    weekly: { used: 1.83, cap: 35, exceeded: false, resetAt: Date.now() + 86400000, percent: 5.2 },
  },
  summary: {
    count: 2261,
    successRate: 100,
    cost: 1.81,
    tokensIn: 230280561,
    tokensOut: 1177496,
    tokens: 231458057,
    avgCost: 0.0008,
    periodStart: '2026-11-03T14:56:56.000Z',
    periodEnd: '2026-12-03T14:56:56.000Z',
    periodBasis: 'billing-period',
    failed: 0,
  },
  subscription: { status: 'active', cancelAtPeriodEnd: false },
  failures: [],
}

let fetchCalls = 0
globalThis.fetch = async (url) => {
  fetchCalls += 1
  return { ok: true, status: 200, json: async () => sample }
}

let loaded = null
globalThis.window = {
  __ModuleLoader__: { load(entry) { loaded = entry } },
  addEventListener() {},
  removeEventListener() {},
}
globalThis.document = documentStub

await import(new URL('../client.js', import.meta.url).href)

if (!loaded || loaded.id !== '@local/commandcode-quota') throw new Error('module did not register with the expected id')

const registrations = []
const ctx = {
  get: () => undefined,
  slots: {
    inject(_key, callback) { callback() },
    register(options, component) { registrations.push({ options, component }) },
  },
  effect(fn) { fn() },
}

const mod = loaded.factory((name) => {
  if (name === 'react') return React
  throw new Error(`unexpected require(${name})`)
})
mod.apply(ctx)

console.log('registered slots:', registrations.map((r) => `${r.options.name}#${r.options.id}`))
if (registrations.length !== 2) throw new Error('expected two slot registrations')
if (!registrations.some((r) => r.options.name === 'sidebar.footer.action')) throw new Error('missing footer registration')
if (!registrations.some((r) => r.options.name === 'shell.overlay')) throw new Error('missing overlay registration')
console.log('styles injected:', created.length === 1 && created[0].id === 'dcq-style')

const footer = registrations.find((r) => r.options.name === 'sidebar.footer.action').component
const panel = registrations.find((r) => r.options.name === 'shell.overlay').component

const button = footer({})
const buttonText = collectText(button)
console.log('button text:', buttonText)
if (!buttonText.includes('Command Code')) throw new Error('footer button label missing')

console.log('panel before open:', panel({}))
button.props.onClick()
await new Promise((resolve) => setTimeout(resolve, 50))

const tree = panel({})
const text = collectText(tree)
console.log('fetch calls:', fetchCalls)
console.log('panel text:', text)
for (const expected of ['GOAT', '68.17', '2.3K', '100%', '$1.81', '230.3M', '14', '35']) {
  if (!text.includes(expected)) throw new Error(`panel is missing ${expected}`)
}
console.log('client smoke test passed')

function collectText(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(collectText).join(' ')
  if (typeof node === 'object') return collectText(node.props && node.props.children)
  return ''
}
