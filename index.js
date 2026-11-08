/**
 * Host half of the Command Code quota panel.
 *
 * Reads Command Code's own account endpoints with the API key the CLI or the
 * DSH provider already uses, reshapes them into one report, and serves that
 * report on a same-origin route the browser half reads:
 *
 *   GET /dsh-commandcode/api/report[?refresh=1]
 *
 * Endpoints (same ones the `cmd` CLI's /usage view calls):
 *   /alpha/whoami, /alpha/billing/credits, /alpha/billing/subscriptions,
 *   /alpha/usage/summary?since=<billing period start>
 *
 * The key never reaches the browser: the client only sees the shaped report.
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

const ROUTE = '/dsh-commandcode/api/report'

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

function keyFromCredentialsYaml(raw) {
  for (const envName of ['COMMAND_CODE_API_KEY', 'COMMANDCODE_API_KEY', 'COMMAND_API_KEY']) {
    const match = new RegExp(`(?:^|\\s)${envName}:\\s*['"]?([^'"\\s]+)`).exec(raw)
    if (match) return match[1]
  }
  return ''
}

function keyFromCliAuth() {
  for (const file of [join(homedir(), '.commandcode', 'auth.json'), join(homedir(), '.commandcode', 'credentials.json')]) {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8'))
      const key = parsed?.apiKey ?? parsed?.api_key ?? parsed?.key ?? parsed?.token
      if (typeof key === 'string' && key.length > 8) return key
    } catch {
      /* not logged in / not installed */
    }
  }
  return ''
}

/** Config first, then the conventional env vars, then the CLI's and DSH's own stores. */
function resolveApiKey(config) {
  if (typeof config.apiKey === 'string' && config.apiKey.trim()) {
    return { key: config.apiKey.trim(), source: 'plugin config' }
  }
  const envNames = [config.apiKeyEnv || DEFAULTS.apiKeyEnv, 'COMMANDCODE_API_KEY', 'COMMAND_API_KEY']
  for (const envName of envNames) {
    if (!envName) continue
    const value = process.env[envName]
    if (typeof value === 'string' && value.trim()) return { key: value.trim(), source: `env ${envName}` }
  }
  const fromCli = keyFromCliAuth()
  if (fromCli) return { key: fromCli, source: '~/.commandcode/auth.json' }
  try {
    const raw = readFileSync(join(homedir(), '.dsh', '.credentials.yaml'), 'utf8')
    const fromStore = keyFromCredentialsYaml(raw)
    if (fromStore) return { key: fromStore, source: '~/.dsh/.credentials.yaml' }
  } catch {
    /* no credential store */
  }
  return { key: '', source: '' }
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

async function buildReport(config) {
  const { key, source } = resolveApiKey(config)
  if (!key) {
    return {
      ok: false,
      code: 'no-key',
      fetchedAt: new Date().toISOString(),
      error: 'no Command Code API key',
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
    return { ok: false, code: 'auth', fetchedAt: new Date().toISOString(), error: failures.join('; ') }
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
  const overrideId = typeof config.planOverride === 'string' ? config.planOverride.trim() : ''
  const plan = planFor(overrideId || detectedId)
  const source_ = overrideId ? 'override' : 'detected'

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
          source: source_,
          detectedId,
          overrideId: overrideId || null,
          known: true,
        }
      : {
          id: detectedId || overrideId || null,
          name: detectedId || overrideId || 'Unknown',
          credits: null,
          source: source_,
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

export function apply(ctx, rawConfig) {
  const config = { ...DEFAULTS, ...(rawConfig || {}) }
  const cacheMs = Number(config.cacheMs) > 0 ? Number(config.cacheMs) : DEFAULTS.cacheMs
  let cache = { at: 0, report: null }
  let inflight = null

  const loadReport = async (force) => {
    const now = Date.now()
    if (!force && cache.report && now - cache.at < cacheMs) return cache.report
    if (inflight) return inflight
    inflight = buildReport(config)
      .then((report) => {
        cache = { at: Date.now(), report }
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

  const dispose = ctx.webServer.register({
    kind: 'exact',
    path: ROUTE,
    handler: (request, response) => {
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
          return
        }
      } else if (!isLoopbackHost(request.headers?.host) || request.headers?.['sec-fetch-site'] === 'cross-site') {
        sendJson(response, 403, { ok: false, code: 'unadmitted', error: 'request rejected: not a loopback request' })
        return
      }
      if ((request.method || 'GET').toUpperCase() !== 'GET') {
        response.writeHead(405, { allow: 'GET' })
        response.end()
        return
      }
      const url = new URL(request.url || ROUTE, 'http://localhost')
      const force = url.searchParams.get('refresh') === '1'
      loadReport(force)
        .then((report) => sendJson(response, 200, report))
        .catch((error) => sendJson(response, 502, { ok: false, code: 'fetch', error: String(error?.message || error) }))
    },
  })

  ctx.effect(() => dispose)
}
