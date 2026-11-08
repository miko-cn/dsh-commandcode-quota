// Local smoke test: runs the Host half against the real Command Code API and
// prints the shaped report. Not part of the installed bundle.
import { apply } from '../index.js'

const routes = []
const ctx = {
  webServer: { register(route) { routes.push(route); return () => {} } },
  effect(fn) { fn() },
  get() { return undefined },
}

const key = process.argv[2]
if (!key) {
  console.error('usage: node test-host.mjs <api-key>')
  process.exit(2)
}

apply(ctx, { apiKey: key, cacheMs: 1 })
console.log('routes:', routes.map((r) => r.path))

const handler = routes[0].handler
const response = {
  status: 0,
  body: '',
  writeHead(status) { this.status = status },
  end(body) { this.body = body || '' },
}

handler({ method: 'GET', url: '/dsh-commandcode/api/report?refresh=1', headers: {} }, response)
await new Promise((resolve) => setTimeout(resolve, 6000))

console.log('status:', response.status)
const report = JSON.parse(response.body)
console.log(JSON.stringify(report, null, 2).slice(0, 2500))
