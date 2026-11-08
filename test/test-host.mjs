// Local smoke test: runs the Host half against the real Command Code API and
// prints the shaped report plus the key-status route. Not part of the bundle.
import { apply } from '../index.js'

const routes = []
const ctx = {
  webServer: { register(route) { routes.push(route); return () => {} } },
  effect(fn) { fn() },
  get() { return undefined },
}

const key = process.argv[2]
if (!key) {
  console.error('usage: node test/test-host.mjs <api-key>')
  process.exit(2)
}

apply(ctx, { apiKey: key, cacheMs: 1 })
console.log('routes:', routes.map((r) => r.path))

const fakeResponse = () => ({
  status: 0,
  body: '',
  writeHead(status) {
    this.status = status
  },
  end(body) {
    this.body = body || ''
  },
})

const reportRoute = routes.find((route) => route.path.endsWith('/report'))
const keyRoute = routes.find((route) => route.path.endsWith('/key'))
if (!reportRoute || !keyRoute) throw new Error('missing routes')

const reportResponse = fakeResponse()
reportRoute.handler({ method: 'GET', url: '/dsh-commandcode/api/report?refresh=1', headers: {} }, reportResponse)
await new Promise((resolve) => setTimeout(resolve, 6000))

console.log('report status:', reportResponse.status)
const report = JSON.parse(reportResponse.body)
console.log(JSON.stringify(report, null, 2).slice(0, 2200))

const keyResponse = fakeResponse()
keyRoute.handler({ method: 'GET', url: '/dsh-commandcode/api/key', headers: {} }, keyResponse)
await new Promise((resolve) => setTimeout(resolve, 200))
console.log('key status:', keyResponse.status)
const keyBody = JSON.parse(keyResponse.body)
console.log(JSON.stringify({ configured: keyBody.configured, source: keyBody.source, writable: keyBody.writable, storedName: keyBody.storedName }, null, 2))

if (!report.ok) throw new Error('report failed: ' + report.error)
if (!report.summary || typeof report.summary.count !== 'number') throw new Error('report has no summary')
if (report.plan.name !== 'GOAT') throw new Error('unexpected plan: ' + report.plan.name)
if (!keyBody.configured) throw new Error('key status should report the configured key')
console.log('host smoke test passed')
