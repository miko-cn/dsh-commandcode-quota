// Local smoke test for the Client half: a tiny hook-aware renderer loads
// client.js with stubbed browser globals, paints the settings page and the
// floating widget, and checks the rendered text. Not part of the bundle.
const Fragment = Symbol('Fragment')
const errors = []

let currentCtx = null
const instances = new Map()

const React = {
  Fragment,
  createElement(type, props, ...children) {
    return { type, props: { ...(props || {}), children: children.flat() } }
  },
  useState(initial) {
    const ctx = currentCtx
    const index = ctx.index++
    const key = `state:${ctx.id}:${index}`
    if (!instances.has(key)) instances.set(key, typeof initial === 'function' ? initial() : initial)
    const setter = (next) => {
      const value = typeof next === 'function' ? next(instances.get(key)) : next
      instances.set(key, value)
    }
    return [instances.get(key), setter]
  },
  useEffect(fn) {
    const ctx = currentCtx
    ctx.index += 1
    ctx.effects.push(fn)
  },
  useRef(initial) {
    const ctx = currentCtx
    const index = ctx.index++
    const key = `ref:${ctx.id}:${index}`
    if (!instances.has(key)) instances.set(key, { current: initial })
    return instances.get(key)
  },
}

const created = []
const storage = new Map()
const documentStub = {
  visibilityState: 'visible',
  getElementById: () => null,
  createElement: () => {
    const node = { id: '', textContent: '', remove() {} }
    created.push(node)
    return node
  },
  head: { appendChild() {} },
}

const sampleReport = {
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
const sampleKey = {
  ok: true,
  configured: true,
  source: 'credential COMMAND_CODE_API_KEY',
  writable: true,
  candidates: [{ name: 'COMMAND_CODE_API_KEY', configured: true, source: 'credential COMMAND_CODE_API_KEY', writable: true }],
  storedName: 'COMMAND_CODE_API_KEY',
  configKey: false,
}

let fetchCalls = 0
globalThis.fetch = async (url) => {
  fetchCalls += 1
  const body = String(url).includes('/api/key') ? sampleKey : sampleReport
  return { ok: true, status: 200, json: async () => body }
}

let loaded = null
globalThis.window = {
  __ModuleLoader__: { load(entry) { loaded = entry } },
  innerWidth: 1200,
  innerHeight: 800,
  addEventListener() {},
  removeEventListener() {},
  localStorage: {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, value),
  },
}
globalThis.document = documentStub

await import(new URL('../client.js', import.meta.url).href)
if (!loaded || loaded.id !== '@yumiku/dsh-commandcode-quota') throw new Error('module did not register with the expected id')

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

const slots = registrations.map((r) => `${r.options.name}#${r.options.id}`)
console.log('registered slots:', slots)
for (const expected of ['settings.section#commandcode-quota', 'settings.section.icon#commandcode-quota', 'shell.overlay#commandcode-quota-float']) {
  if (!slots.includes(expected)) throw new Error(`missing slot ${expected}`)
}
console.log('styles injected:', created.length === 1 && created[0].id === 'dcq-style')

const settings = registrations.find((r) => r.options.name === 'settings.section').component
const floating = registrations.find((r) => r.options.name === 'shell.overlay').component

// ---- paint helpers: hook-aware expansion of a React element tree ----
function expand(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return null
  if (typeof node === 'string' || typeof node === 'number') return { text: String(node) }
  if (Array.isArray(node)) return { children: node.map(expand).filter(Boolean) }
  const { type, props } = node
  if (type === Fragment) return { children: [].concat(props.children || []).map(expand).filter(Boolean) }
  if (typeof type === 'function') {
    const componentCtx = { id: type.name || 'anon', index: 0, effects: [] }
    const previous = currentCtx
    currentCtx = componentCtx
    let out
    try {
      out = type(props)
    } catch (error) {
      errors.push(error)
      throw error
    } finally {
      currentCtx = previous
    }
    for (const effect of componentCtx.effects) {
      try {
        effect()
      } catch (error) {
        errors.push(error)
        throw error
      }
    }
    return expand(out)
  }
  if (typeof type === 'string') {
    if (props && props.ref && typeof props.ref === 'object') {
      props.ref.current = {
        offsetWidth: 160,
        getBoundingClientRect: () => ({ left: 900, top: 740, bottom: 774, right: 1060, width: 160, height: 34 }),
      }
    }
    return { tag: type, props, children: [].concat(props.children || []).map(expand).filter(Boolean) }
  }
  return null
}

function paint(component) {
  return expand({ type: component, props: {} })
}

function collectText(tree) {
  if (!tree) return ''
  if (tree.text !== undefined) return tree.text
  return (tree.children || []).map(collectText).join(' ')
}

function findNodes(tree, predicate, found = []) {
  if (!tree) return found
  if (tree.tag && predicate(tree)) found.push(tree)
  for (const child of tree.children || []) findNodes(child, predicate, found)
  return found
}

// Settings page: mount, let the effects' fetches settle, repaint.
paint(settings)
await new Promise((resolve) => setTimeout(resolve, 60))
const settingsTree = paint(settings)
const settingsText = collectText(settingsTree)
console.log('settings text:', settingsText)
for (const expected of ['套餐额度', 'GOAT', '68.17', '2.3K', '100%', '$1.81', '230.3M', '用量窗口', 'API key', '浮窗']) {
  if (!settingsText.includes(expected)) throw new Error(`settings page is missing ${expected}`)
}

// Floating widget: the mount effect places it, the second paint renders the pill.
paint(floating)
await new Promise((resolve) => setTimeout(resolve, 30))
const floatTree = paint(floating)
const floatText = collectText(floatTree)
console.log('capsule text:', floatText)
for (const expected of ['5h', 'W', '5%']) {
  if (!floatText.includes(expected)) throw new Error(`capsule is missing ${expected}`)
}

const capsule = findNodes(floatTree, (node) => node.props && node.props.className === 'dcq-float')[0]
if (!capsule) throw new Error('capsule element not found')

// Click (pointer down + up without movement) opens the popover.
const fakeEvent = { button: 0, clientX: 10, clientY: 10, pointerId: 1, currentTarget: { setPointerCapture() {}, releasePointerCapture() {} } }
capsule.props.onPointerDown(fakeEvent)
capsule.props.onPointerUp(fakeEvent)
await new Promise((resolve) => setTimeout(resolve, 60))
const popTree = paint(floating)
const popText = collectText(popTree)
console.log('popover text:', popText)
for (const expected of ['在 Studio 打开', '套餐额度', '5 小时']) {
  if (!popText.includes(expected)) throw new Error(`popover is missing ${expected}`)
}

if (errors.length > 0) throw new Error(`render errors: ${errors.map((error) => error.message).join('; ')}`)
console.log('fetch calls:', fetchCalls)
console.log('client smoke test passed')
// The components keep refresh intervals alive; the stub renderer never runs
// their cleanups, so end the process explicitly.
process.exit(0)
