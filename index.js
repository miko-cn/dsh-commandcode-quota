/**
 * Host half of the Command Code quota panel.
 *
 * Reads Command Code's own account endpoints with the API key the CLI or the
 * DSH provider already uses, reshapes them into one report, and serves that
 * report on same-origin routes the browser half reads:
 *
 *   GET  /dsh-commandcode/api/report[?refresh=1]
 *   GET  /dsh-commandcode/api/key          → key status (never the value)
 *   POST /dsh-commandcode/api/key          → { apiKey } or { clear: true }
 *
 * Endpoints (same ones the `cmd` CLI's /usage view calls):
 *   /alpha/whoami, /alpha/billing/credits, /alpha/billing/subscriptions,
 *   /alpha/usage/summary?since=<billing period start>
 *
 * The key never reaches the browser: the client only sees the shaped report and
 * the key's status (configured / source / writable).
 */

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const name = 'commandcode-quota'
export const inject = ['webServer']

/**
 * Plan tiers known to Command Code. Credits are the plan's monthly allowance in
 * the same unit `credits.monthlyCredits` is reported in; the window caps are the
 * documented defaults, used only when the live /billing/credits response omits
 * them. Live values always win.
 */
const PLANS = {
  'individual-go': { name: 'Go', credits: 10, fiveHour: 3, weekly: 6 },
  'individual-go-v1': { name: 'Go', credits: 10, fiveHour: 3, weekly: 6 },
  'individual-goat': { name: 'GOAT', credits: 70, fiveHour: 14, weekly: 35 },
  'individual-pro': { name: 'Pro', credits: 30, fiveHour: 16, weekly: 40 },
  'individual-pro-v1': { name: 'Pro', credits: 80, fiveHour: 16, weekly: 40 },
  'individual-provider': { name: 'Provider', credits: 15, fiveHour: 0, weekly: 0 },
  'individual-max': { name: 'Max', credits: 150, fiveHour: 45, weekly: 90 },
  'individual-ultra': { name: 'Ultra', credits: 300, fiveHour: 90, weekly: 180 },
  'teams-pro': { name: 'Teams Pro', credits: 40, fiveHour: 12, weekly: 24 },
}

const DEFAULTS = {
  apiBase: 'https://api.commandcode.ai',
  apiKeyEnv: 'COMMAND_CODE_API_KEY',
  planOverride: '',
  cacheMs: 45000,
  timeoutMs: 12000,
}

const REPORT_ROUTE = '/dsh-commandcode/api/report'
const KEY_ROUTE = '/dsh-commandcode/api/key'
const KEY_NAMES = ['COMMAND_CODE_API_KEY', 'COMMANDCODE_API_KEY', 'COMMAND_API_KEY']

function planFor(planId) {
  if (!planId) return null
  const id = String(planId).toLowerCase().replace(/_/g, '-')
  if (PLANS[id]) return { id, ...PLANS[id] }
  const stem = id.replace(/-v\d+$/, '')
  if (PLANS[stem]) return { id, ...PLANS[stem] }
  const hit = Object.keys(PLANS)
    .sort((a, b) => b.length - a.length)
    .find((candidate) => id.startsWith(candidate))
  return hit ? { id, ...PLANS[hit] } : null
}

function cliAuthFile() {
  for (const file of [join(homedir(), '.commandcode', 'auth.json'), join(homedir(), '.commandcode', 'credentials.json')]) {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8'))
      const key = parsed?.apiKey ?? parsed?.api_key ?? parsed?.key ?? parsed?.token
      if (typeof key === 'string' && key.length > 8) return { key, file }
    } catch {
      /* not logged in / not installed */
    }
  }
  return null
}

/** Raw YAML scan used only when the credentials service is unavailable. */
function keyFromCredentialsFile() {
  try {
    const raw = readFileSync(join(homedir(), '.dsh', '.credentials.yaml'), 'utf8')
    for (const name of KEY_NAMES) {
      const match = new RegExp(`(?:^|\\s)${name}:\\s*['"]?([^'"\\s]+)`).exec(raw)
      if (match) return { key: match[1], source: '~/.dsh/.credentials.yaml' }
    }
  } catch {
    /* no credential store */
  }
  return null
}

function credentialsOf(ctx) {
  const direct = ctx.get?.('credentials') ?? ctx.credentials
  return direct && typeof direct.resolve === 'function' ? direct : null
}

/**
 * Config first, then the DSH credential store (stored value outranks the
 * environment by design), then the CLI's own login file.
 */
async function resolveApiKey(ctx, config) {
  if (typeof config.apiKey === 'string' && config.apiKey.trim()) {
    return { key: config.apiKey.trim(), source: 'plugin config' }
  }
  const names = [config.apiKeyEnv || DEFAULTS.apiKeyEnv, ...KEY_NAMES].filter(Boolean)
  const credentials = credentialsOf(ctx)
  if (credentials) {
    for (const credentialName of [...new Set(names)]) {
      try {
        const hit = await credentials.resolve(credentialName)
        if (hit?.value) return { key: hit.value, source: hit.source || `credential ${credentialName}` }
      } catch {
        /* try the next name */
      }
    }
  }
  const fromCli = cliAuthFile()
  if (fromCli) return { key: fromCli.key, source: '~/.commandcode/auth.json' }
  const fromFile = keyFromCredentialsFile()
  if (fromFile) return fromFile
  return { key: '', source: '' }
}

async function keyStatus(ctx, config) {
  const credentials = credentialsOf(ctx)
  const names = [...new Set([config.apiKeyEnv || DEFAULTS.apiKeyEnv, ...KEY_NAMES].filter(Boolean))]
  const entries = []
  if (credentials && typeof credentials.describe === 'function') {
    for (const credentialName of names) {
      try {
        const info = await credentials.describe(credentialName)
        entries.push({ name: credentialName, configured: info?.configured === true, source: info?.source ?? null, writable: info?.writable === true })
      } catch {
        /* ignore */
      }
    }
  }
  const resolved = await resolveApiKey(ctx, config)
  return {
    ok: true,
    configured: Boolean(resolved.key),
    source: resolved.source || null,
    writable: entries.some((entry) => entry.writable),
    candidates: entries,
    cliAuthFile: cliAuthFile() ? '~/.commandcode/auth.json' : null,
    envAvailable: names.filter((name) => Boolean(process.env[name])),
    storedName: names[0],
    configKey: typeof config.apiKey === 'string' && config.apiKey.length > 0,
  }
}

async function saveKey(ctx, config, body) {
  const credentials = credentialsOf(ctx)
  if (!credentials || typeof credentials.set !== 'function') {
    return { ok: false, error: 'credentials service unavailable; set the key with the cmd CLI or in the environment' }
  }
  const storedName = (config.apiKeyEnv || DEFAULTS.apiKeyEnv) || 'COMMAND_CODE_API_KEY'
  if (body.clear === true) {
    await credentials.unset(storedName)
    return { ok: true, cleared: true, ...(await keyStatus(ctx, config)) }
  }
  const value = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  if (!value) return { ok: false, error: 'apiKey is empty' }
  if (value.length < 8 || /\s/.test(value)) return { ok: false, error: 'apiKey does not look like a Command Code key' }
  await credentials.set(storedName, value)
  return { ok: true, ...(await keyStatus(ctx, config)) }
}

async function fetchJson(base, path, key, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(base + path, {
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${key}`,
        'x-command-code-version': '1.88.5',
        'x-cli-environment': 'production',
      },
    })
    if (!response.ok) throw new Error(`${path} → HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

function round(value, digits = 4) {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(digits)) : null
}

async function buildReport(ctx, config, overridePlan) {
  const { key, source } = await resolveApiKey(ctx, config)
  if (!key) {
    return {
      ok: false,
      code: 'no-key',
      fetchedAt: new Date().toISOString(),
      error: 'no Command Code API key',
      keySource: null,
    }
  }

  const apiBase = (config.apiBase || DEFAULTS.apiBase).replace(/\/+$/, '')
  const timeoutMs = Number(config.timeoutMs) > 0 ? Number(config.timeoutMs) : DEFAULTS.timeoutMs
  const failures = []

  const whoami = await fetchJson(apiBase, '/alpha/whoami', key, timeoutMs).catch((error) => {
    failures.push(String(error.message || error))
    return null
  })
  if (whoami === null && failures.length > 0) {
    return { ok: false, code: 'auth', fetchedAt: new Date().toISOString(), error: failures.join('; '), keySource: source }
  }

  const orgId = whoami?.org?.id ?? null
  const orgQuery = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''

  const [subscription, credits] = await Promise.all([
    fetchJson(apiBase, `/alpha/billing/subscriptions${orgQuery}`, key, timeoutMs).catch((error) => {
      failures.push(String(error.message || error))
      return null
    }),
    fetchJson(apiBase, `/alpha/billing/credits${orgQuery}`, key, timeoutMs).catch((error) => {
      failures.push(String(error.message || error))
      return null
    }),
  ])

  const subscriptionData = subscription?.data ?? null
  const periodStart = subscriptionData?.currentPeriodStart ?? null
  const sinceQuery = periodStart ? `${orgQuery ? '&' : '?'}since=${encodeURIComponent(periodStart)}` : ''
  const summary = await fetchJson(apiBase, `/alpha/usage/summary${orgQuery}${sinceQuery}`, key, timeoutMs).catch((error) => {
    failures.push(String(error.message || error))
    return null
  })

  const detectedId = subscriptionData?.planId ?? null
  const overrideId = (overridePlan || (typeof config.planOverride === 'string' ? config.planOverride : '')).trim()
  const plan = planFor(overrideId || detectedId)
  const planSource = overrideId ? 'override' : 'detected'

  const creditBlock = credits?.credits ?? null
  const remaining = round(creditBlock?.monthlyCredits)
  const purchased = round(creditBlock?.purchasedCredits)
  const free = round(creditBlock?.freeCredits)
  const usedFromSummary = round(summary?.totalMonthlyCredits)
  const allowance = plan?.credits ?? null
  const total =
    allowance !== null && remaining !== null
      ? Math.max(allowance, (remaining ?? 0) + (usedFromSummary ?? 0))
      : remaining !== null
        ? remaining + (usedFromSummary ?? 0)
        : null
  const used = total !== null && remaining !== null ? round(Math.max(0, total - remaining), 4) : usedFromSummary
  const percent = total !== null && used !== null && total > 0 ? Math.min(100, Math.round((used / total) * 1000) / 10) : null

  const limits = credits?.windowLimits ?? null
  const windowOf = (entry, fallbackCap) => {
    if (!entry) return null
    const cap = typeof entry.cap === 'number' ? entry.cap : fallbackCap || 0
    return {
      used: round(entry.used),
      cap,
      exceeded: entry.exceeded === true,
      resetAt: typeof entry.resetAt === 'number' ? entry.resetAt : null,
      percent: cap > 0 ? Math.min(100, Math.round(((entry.used ?? 0) / cap) * 1000) / 10) : 0,
    }
  }

  return {
    ok: true,
    fetchedAt: new Date().toISOString(),
    keySource: source,
    account: whoami?.user
      ? { name: whoami.user.name ?? null, userName: whoami.user.userName ?? null, email: whoami.user.email ?? null }
      : null,
    org: whoami?.org ? { id: whoami.org.id, name: whoami.org.name ?? null } : null,
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          credits: plan.credits,
          fiveHourCap: plan.fiveHour,
          weeklyCap: plan.weekly,
          source: planSource,
          detectedId,
          overrideId: overrideId || null,
          known: true,
        }
      : {
          id: detectedId || overrideId || null,
          name: detectedId || overrideId || 'Unknown',
          credits: null,
          source: planSource,
          detectedId,
          overrideId: overrideId || null,
          known: false,
        },
    credits: {
      remaining,
      used,
      purchased,
      free,
      total,
      percent,
      belowThreshold: creditBlock?.belowThreshold === true,
    },
    windows: {
      limited: limits?.limited === true,
      fiveHour: windowOf(limits?.fiveHour, plan?.fiveHour),
      weekly: windowOf(limits?.weekly, plan?.weekly),
    },
    summary: summary
      ? {
          count: typeof summary.totalCount === 'number' ? summary.totalCount : null,
          successRate: round(summary.successRate, 1),
          cost: round(summary.totalCost),
          credits: round(summary.totalCredits),
          tokensIn: typeof summary.totalTokensIn === 'number' ? summary.totalTokensIn : null,
          tokensOut: typeof summary.totalTokensOut === 'number' ? summary.totalTokensOut : null,
          tokens: typeof summary.totalTokens === 'number' ? summary.totalTokens : null,
          avgCost: round(summary.averageCost, 6),
          periodStart,
          periodEnd: subscriptionData?.currentPeriodEnd ?? null,
          periodBasis: summary.periodBasis ?? null,
          failed: typeof summary.failedCount === 'number' ? summary.failedCount : null,
        }
      : null,
    subscription: subscriptionData
      ? { status: subscriptionData.status ?? null, cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd === true }
      : null,
    failures,
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

async function readJsonBody(request, limit = 8192) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > limit) throw new Error('request body too large')
    chunks.push(buffer)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export function apply(ctx, rawConfig) {
  const config = { ...DEFAULTS, ...(rawConfig || {}) }
  const cacheMs = Number(config.cacheMs) > 0 ? Number(config.cacheMs) : DEFAULTS.cacheMs
  let cache = { at: 0, report: null, plan: '' }
  let inflight = null

  const invalidate = () => {
    cache = { at: 0, report: null, plan: '' }
  }

  const loadReport = async (force, plan) => {
    const override = plan || ''
    const now = Date.now()
    if (!force && cache.report && cache.plan === override && now - cache.at < cacheMs) return cache.report
    if (inflight) return inflight
    inflight = buildReport(ctx, config, override)
      .then((report) => {
        if (report.ok) cache = { at: Date.now(), report, plan: override }
        return report
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }

  const gateOf = () => {
    const connection = ctx.get('connection')
    return typeof connection?.requestRejection === 'function' ? connection.requestRejection.bind(connection) : null
  }

  const isLoopbackHost = (host) => {
    if (typeof host !== 'string' || !host) return true
    const name = host.toLowerCase().startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0]
    return name === '127.0.0.1' || name === 'localhost' || name === '[::1]'
  }

  const admit = (request, response) => {
    // Resolved per request: the connection service may mount after this plugin.
    const gate = gateOf()
    if (gate) {
      let status
      try {
        status = gate(request)
      } catch {
        status = 403
      }
      if (status !== undefined && status !== null) {
        sendJson(response, status, { ok: false, code: 'unadmitted', error: 'request rejected by the host' })
        return false
      }
      return true
    }
    const host = request.headers?.host
    if (!isLoopbackHost(host) || request.headers?.['sec-fetch-site'] === 'cross-site') {
      sendJson(response, 403, { ok: false, code: 'unadmitted', error: 'request rejected: not a loopback request' })
      return false
    }
    return true
  }

  const disposers = [
    ctx.webServer.register({
      kind: 'exact',
      path: REPORT_ROUTE,
      handler: (request, response) => {
        if (!admit(request, response)) return
        if ((request.method || 'GET').toUpperCase() !== 'GET') {
          response.writeHead(405, { allow: 'GET' })
          response.end()
          return
        }
        const url = new URL(request.url || REPORT_ROUTE, 'http://localhost')
        const force = url.searchParams.get('refresh') === '1'
        const plan = url.searchParams.get('plan') || ''
        loadReport(force, plan)
          .then((report) => sendJson(response, 200, report))
          .catch((error) => sendJson(response, 502, { ok: false, code: 'fetch', error: String(error?.message || error) }))
      },
    }),
    ctx.webServer.register({
      kind: 'exact',
      path: KEY_ROUTE,
      handler: async (request, response) => {
        if (!admit(request, response)) return
        const method = (request.method || 'GET').toUpperCase()
        try {
          if (method === 'GET') {
            sendJson(response, 200, await keyStatus(ctx, config))
            return
          }
          if (method === 'POST') {
            const body = await readJsonBody(request)
            const result = await saveKey(ctx, config, body)
            invalidate()
            sendJson(response, result.ok ? 200 : 400, result)
            return
          }
          response.writeHead(405, { allow: 'GET, POST' })
          response.end()
        } catch (error) {
          sendJson(response, 400, { ok: false, error: String(error?.message || error) })
        }
      },
    }),
  ]

  ctx.effect(() => () => {
    for (const dispose of disposers) dispose()
  })
}
