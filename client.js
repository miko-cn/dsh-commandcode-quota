/**
 * Client half of the Command Code quota panel.
 *
 * Registers a compact button in the sidebar footer (next to Settings) and a
 * floating panel in `shell.overlay`. Both read the Host half's same-origin
 * route, so the API key never leaves the Host.
 */
window.__ModuleLoader__.load({
  id: '@local/commandcode-quota',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'commandcode-quota'
    const ENDPOINT = '/dsh-commandcode/api/report'
    const STUDIO_URL = 'https://commandcode.ai/usage'
    const STYLE_ID = 'dcq-style'

    const zh = {
      button: 'Command Code 用量',
      title: 'Command Code',
      credit: '套餐额度',
      remaining: '剩余',
      usedOf: '已用',
      renew: '续费',
      windows: '用量窗口',
      fiveHour: '5 小时',
      weekly: '每周',
      windowReset: '重置',
      noWindows: '按量计费套餐，没有 5 小时 / 每周窗口限制',
      period: '本期请求',
      requests: '请求',
      success: '成功率',
      cost: '花费',
      tokens: '输入 / 输出',
      plan: '套餐档位',
      planAuto: '按订阅自动识别',
      planOverride: '按配置指定',
      planCaps: '窗口上限',
      extraCredits: '额外额度',
      studio: '在 Studio 打开',
      refresh: '刷新',
      updated: '更新于',
      loading: '正在读取 Command Code 数据…',
      error: '读取失败',
      noKey: '没有找到 Command Code API key。请设置 COMMAND_CODE_API_KEY 环境变量、运行 cmd login 登录一次，或在插件配置中填写 apiKey。',
      retry: '重试',
      close: '关闭',
    }
    const en = {
      button: 'Command Code usage',
      title: 'Command Code',
      credit: 'Plan credits',
      remaining: 'remaining',
      usedOf: 'used',
      renew: 'renews',
      windows: 'Usage windows',
      fiveHour: '5-hour',
      weekly: 'Weekly',
      windowReset: 'resets',
      noWindows: 'Pay-as-you-go plan: no 5-hour or weekly windows',
      period: 'Requests this period',
      requests: 'requests',
      success: 'success',
      cost: 'cost',
      tokens: 'in / out',
      plan: 'Plan tier',
      planAuto: 'detected from subscription',
      planOverride: 'set in plugin config',
      planCaps: 'window caps',
      extraCredits: 'Extra credits',
      studio: 'Open Studio',
      refresh: 'Refresh',
      updated: 'updated',
      loading: 'Reading Command Code data…',
      error: 'Could not load',
      noKey: 'No Command Code API key found. Set COMMAND_CODE_API_KEY, sign in once with the cmd CLI, or set apiKey in the plugin config.',
      retry: 'Retry',
      close: 'Close',
    }

    function fallbackT(key) {
      return zh[key] ?? en[key] ?? key
    }

    const CSS = `
      .dcq-foot-btn{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:0 6px;border:0;border-radius:7px;background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;line-height:1}
      .dcq-foot-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
      .dcq-foot-btn[data-open="1"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
      .dcq-foot-btn svg{display:block;flex:none}
      .dcq-foot-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:96px}
      .dcq-backdrop{position:fixed;inset:0;z-index:90;background:transparent}
      .dcq-panel{position:fixed;left:12px;bottom:64px;z-index:91;width:344px;max-height:calc(100vh - 96px);overflow-y:auto;overflow-x:hidden;
        background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);
        border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.18);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:13px}
      .dcq-head{display:flex;align-items:center;gap:8px;padding:12px 12px 10px;border-bottom:1px solid var(--dsw-alias-border-l1)}
      .dcq-head-mark{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#0ea97a,#0d9488);display:grid;place-items:center;flex:none}
      .dcq-head-title{font-weight:650;font-size:13.5px;letter-spacing:.1px}
      .dcq-head-sub{font-size:11px;color:var(--dsw-alias-label-secondary);margin-top:1px}
      .dcq-spacer{flex:1}
      .dcq-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.3px;
        color:var(--dsw-alias-brand-primary);border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2)}
      .dcq-icon-btn{width:24px;height:24px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;display:grid;place-items:center;font-size:13px;line-height:1}
      .dcq-icon-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
      .dcq-body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:10px}
      .dcq-card{border:1px solid var(--dsw-alias-border-l1);border-radius:11px;padding:10px 11px;background:var(--dsw-alias-bg-layer-1)}
      .dcq-card-title{font-size:10.5px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:var(--dsw-alias-label-secondary);margin-bottom:7px}
      .dcq-bigline{display:flex;align-items:baseline;gap:6px;margin-bottom:6px}
      .dcq-big{font-size:20px;font-weight:750;letter-spacing:-.4px;font-variant-numeric:tabular-nums}
      .dcq-big-unit{font-size:11.5px;color:var(--dsw-alias-label-secondary)}
      .dcq-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
      .dcq-bar{height:7px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;margin:7px 0 6px}
      .dcq-bar-fill{height:100%;border-radius:999px;transition:width .5s ease}
      .dcq-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:3px 0;font-size:12px}
      .dcq-row-label{display:inline-flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:11.5px}
      .dcq-row-val{font-variant-numeric:tabular-nums;font-weight:600}
      .dcq-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
      .dcq-stat{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:7px 4px;text-align:center;background:var(--dsw-alias-bg-layer-1)}
      .dcq-stat-num{font-size:14px;font-weight:750;font-variant-numeric:tabular-nums;letter-spacing:-.2px}
      .dcq-stat-lbl{font-size:9.5px;color:var(--dsw-alias-label-secondary);margin-top:2px;letter-spacing:.4px}
      .dcq-note{font-size:10.5px;color:var(--dsw-alias-label-secondary);line-height:1.5}
      .dcq-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px 10px;border-top:1px solid var(--dsw-alias-border-l1);font-size:10.5px;color:var(--dsw-alias-label-secondary)}
      .dcq-link{color:var(--dsw-alias-brand-primary);text-decoration:none;font-weight:600}
      .dcq-link:hover{text-decoration:underline}
      .dcq-state{padding:26px 14px;text-align:center;font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.6}
      .dcq-err{color:var(--dsw-alias-state-error-primary)}
      .dcq-btn{margin-top:10px;padding:5px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
      .dcq-btn:hover{background:var(--dsw-alias-bg-layer-2)}
      .dcq-spin{width:18px;height:18px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;margin:0 auto 8px;animation:dcq-spin .8s linear infinite}
      @keyframes dcq-spin{to{transform:rotate(360deg)}}
      @media (prefers-reduced-motion: reduce){.dcq-bar-fill{transition:none}.dcq-spin{animation:none}}
    `

    // ---------- shared store ----------
    const store = {
      open: false,
      loading: false,
      report: null,
      error: null,
      lastFetch: 0,
      listeners: new Set(),
      emit() {
        for (const listener of this.listeners) listener()
      },
      subscribe(listener) {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
      },
      set(patch) {
        Object.assign(this, patch)
        this.emit()
      },
    }

    function useStore() {
      const [, force] = React.useState(0)
      React.useEffect(() => store.subscribe(() => force((tick) => tick + 1)), [])
      return store
    }

    async function loadReport(force) {
      store.set({ loading: true, error: null })
      try {
        const response = await fetch(`${ENDPOINT}${force ? '?refresh=1' : ''}`, {
          headers: { accept: 'application/json' },
          cache: 'no-store',
        })
        const body = await response.json().catch(() => null)
        if (!response.ok) throw new Error((body && body.error) || `HTTP ${response.status}`)
        if (!body || body.ok !== true) throw new Error(body && body.code === 'no-key' ? 'NO_KEY' : (body && body.error) || 'empty report')
        store.set({ report: body, error: null, lastFetch: Date.now(), loading: false })
      } catch (error) {
        store.set({ error: error && error.message ? error.message : String(error), loading: false })
      }
    }

    function openPanel() {
      store.set({ open: true })
      if (!store.report || Date.now() - store.lastFetch > 60000) loadReport(false)
    }
    function closePanel() {
      store.set({ open: false })
    }
    function togglePanel() {
      if (store.open) closePanel()
      else openPanel()
    }

    // ---------- formatting ----------
    function credits(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
      return Number.isInteger(value) ? String(value) : value.toFixed(2)
    }
    function money(value) {
      return typeof value === 'number' ? `$${value.toFixed(Math.abs(value) < 10 ? 2 : 1)}` : '—'
    }
    function compact(value) {
      if (typeof value !== 'number') return '—'
      if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
      if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
      if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
      return String(Math.round(value))
    }
    function clock(ms) {
      const date = new Date(ms)
      if (Number.isNaN(date.getTime())) return '—'
      const now = new Date()
      const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      const days = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
      if (days === 0) return time
      if (days === 1) return `+1 ${time}`
      return `${date.getMonth() + 1}/${date.getDate()} ${time}`
    }
    function shortDate(iso) {
      if (!iso) return null
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return null
      return `${date.getMonth() + 1}/${date.getDate()}`
    }
    function toneVar(percent) {
      if (percent === null || percent === undefined) return 'var(--dsw-alias-brand-primary)'
      if (percent >= 85) return 'var(--dsw-alias-state-error-primary)'
      if (percent >= 60) return 'var(--dsw-alias-state-warn-primary)'
      return 'var(--dsw-alias-brand-primary)'
    }

    function Icon() {
      return h(
        'svg',
        { width: 15, height: 15, viewBox: '0 0 64 64', 'aria-hidden': 'true' },
        h('rect', { x: 2, y: 2, width: 60, height: 60, rx: 16, fill: '#0d9488' }),
        h('rect', { x: 14, y: 34, width: 8, height: 16, rx: 2.5, fill: '#fff', opacity: 0.9 }),
        h('rect', { x: 28, y: 26, width: 8, height: 24, rx: 2.5, fill: '#fff', opacity: 0.96 }),
        h('rect', { x: 42, y: 18, width: 8, height: 32, rx: 2.5, fill: '#fff' }),
      )
    }

    function Bar({ percent }) {
      return h(
        'div',
        { className: 'dcq-bar' },
        h('div', {
          className: 'dcq-bar-fill',
          style: { width: `${Math.max(2, Math.min(100, percent || 0))}%`, background: toneVar(percent) },
        }),
      )
    }

    function Meter({ label, data, tr }) {
      if (!data) return null
      const percent = data.percent || 0
      return h(
        'div',
        { style: { marginTop: 6 } },
        h(
          'div',
          { className: 'dcq-meta' },
          h('span', { style: { fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, label),
          h('span', null, `${credits(data.used)} / ${credits(data.cap)}`),
        ),
        h(Bar, { percent }),
        h(
          'div',
          { className: 'dcq-meta', style: { fontSize: 10.5 } },
          h('span', null, data.resetAt ? `${tr('windowReset')} ${clock(data.resetAt)}` : ''),
          h(
            'span',
            { style: { color: data.exceeded ? 'var(--dsw-alias-state-error-primary)' : 'inherit' } },
            `${Math.round(percent)}%`,
          ),
        ),
      )
    }

    function Panel(props) {
      const tr = typeof props.t === 'function' ? props.t : fallbackT
      useStore()
      const open = store.open
      React.useEffect(() => {
        if (!open) return undefined
        const onKey = (event) => {
          if (event.key === 'Escape') closePanel()
        }
        window.addEventListener('keydown', onKey)
        const timer = setInterval(() => loadReport(false), 120000)
        return () => {
          window.removeEventListener('keydown', onKey)
          clearInterval(timer)
        }
      }, [open])

      if (!open) return null
      const report = store.report
      const plan = report && report.plan
      const credit = report && report.credits
      const windows = report && report.windows
      const summary = report && report.summary

      const header = h(
        'div',
        { className: 'dcq-head' },
        h('span', { className: 'dcq-head-mark' }, h(Icon)),
        h(
          'div',
          { style: { minWidth: 0 } },
          h('div', { className: 'dcq-head-title' }, tr('title')),
          h('div', { className: 'dcq-head-sub' }, report && report.account ? (report.account.userName ? `@${report.account.userName}` : report.account.email || '') : ''),
        ),
        h('span', { className: 'dcq-spacer' }),
        plan && plan.name ? h('span', { className: 'dcq-chip' }, plan.name) : null,
        h('button', { className: 'dcq-icon-btn', type: 'button', title: tr('refresh'), 'aria-label': tr('refresh'), onClick: () => loadReport(true) }, '⟳'),
        h('button', { className: 'dcq-icon-btn', type: 'button', title: tr('close'), 'aria-label': tr('close'), onClick: closePanel }, '✕'),
      )

      let body
      if (!report && store.loading) {
        body = h('div', { className: 'dcq-state' }, h('div', { className: 'dcq-spin' }), tr('loading'))
      } else if (!report && store.error) {
        const noKey = store.error === 'NO_KEY'
        body = h(
          'div',
          { className: 'dcq-state' },
          noKey ? h('div', null, tr('noKey')) : h('div', { className: 'dcq-err' }, `${tr('error')}: ${store.error}`),
          h('button', { className: 'dcq-btn', type: 'button', onClick: () => loadReport(true) }, tr('retry')),
        )
      } else if (report) {
        body = h(
          'div',
          { className: 'dcq-body' },
          h(
            'div',
            { className: 'dcq-card' },
            h('div', { className: 'dcq-card-title' }, tr('credit')),
            h(
              'div',
              { className: 'dcq-bigline' },
              h('span', { className: 'dcq-big', style: { color: toneVar(credit && credit.percent) } }, credits(credit && credit.remaining)),
              credit && credit.total ? h('span', { className: 'dcq-big-unit' }, `/ ${credits(credit.total)} ${tr('remaining')}`) : null,
            ),
            h(Bar, { percent: credit && credit.percent }),
            h(
              'div',
              { className: 'dcq-meta' },
              h('span', null, `${tr('usedOf')} ${credits(credit && credit.used)} / ${credits(credit && credit.total)}`),
              h('span', null, credit && credit.percent !== null && credit.percent !== undefined ? `${credit.percent}%` : ''),
            ),
            summary && summary.periodEnd
              ? h(
                  'div',
                  { className: 'dcq-meta', style: { marginTop: 4 } },
                  h('span', null, `${tr('renew')} ${shortDate(summary.periodEnd) || '—'}`),
                  h('span', null, summary.periodStart ? `${shortDate(summary.periodStart)} →` : ''),
                )
              : null,
            credit && (credit.purchased || credit.free)
              ? h(
                  'div',
                  { className: 'dcq-meta', style: { marginTop: 4 } },
                  h('span', null, tr('extraCredits')),
                  h('span', null, `${credits(credit.purchased || 0)} + ${credits(credit.free || 0)}`),
                )
              : null,
          ),
          h(
            'div',
            { className: 'dcq-card' },
            h('div', { className: 'dcq-card-title' }, tr('windows')),
            windows && windows.limited
              ? h(
                  React.Fragment,
                  null,
                  h(Meter, { label: tr('fiveHour'), data: windows.fiveHour, tr }),
                  h(Meter, { label: tr('weekly'), data: windows.weekly, tr }),
                )
              : h('div', { className: 'dcq-note' }, tr('noWindows')),
          ),
          summary
            ? h(
                'div',
                { className: 'dcq-card' },
                h('div', { className: 'dcq-card-title' }, tr('period')),
                h(
                  'div',
                  { className: 'dcq-grid' },
                  h('div', { className: 'dcq-stat' }, h('div', { className: 'dcq-stat-num' }, compact(summary.count)), h('div', { className: 'dcq-stat-lbl' }, tr('requests'))),
                  h('div', { className: 'dcq-stat' }, h('div', { className: 'dcq-stat-num' }, summary.successRate !== null ? `${summary.successRate}%` : '—'), h('div', { className: 'dcq-stat-lbl' }, tr('success'))),
                  h('div', { className: 'dcq-stat' }, h('div', { className: 'dcq-stat-num' }, money(summary.cost)), h('div', { className: 'dcq-stat-lbl' }, tr('cost'))),
                ),
                h(
                  'div',
                  { className: 'dcq-row', style: { marginTop: 6 } },
                  h('span', { className: 'dcq-row-label' }, tr('tokens')),
                  h('span', { className: 'dcq-row-val' }, `${compact(summary.tokensIn)} / ${compact(summary.tokensOut)}`),
                ),
              )
            : null,
          h(
            'div',
            { className: 'dcq-card' },
            h('div', { className: 'dcq-card-title' }, tr('plan')),
            h(
              'div',
              { className: 'dcq-row' },
              h('span', { className: 'dcq-row-val' }, plan && plan.name ? plan.name : '—'),
              h('span', { className: 'dcq-row-label' }, plan && plan.source === 'override' ? tr('planOverride') : tr('planAuto')),
            ),
            plan && plan.credits
              ? h(
                  'div',
                  { className: 'dcq-note', style: { marginTop: 4 } },
                  `${tr('planCaps')} ${credits(plan.fiveHourCap)} / ${credits(plan.weeklyCap)}`,
                )
              : null,
          ),
          store.error ? h('div', { className: 'dcq-note dcq-err' }, `${tr('error')}: ${store.error}`) : null,
        )
      } else {
        body = h('div', { className: 'dcq-state' }, tr('loading'))
      }

      const footer = h(
        'div',
        { className: 'dcq-foot' },
        h('span', null, report && report.fetchedAt ? `${tr('updated')} ${clock(Date.parse(report.fetchedAt))}` : ''),
        h('a', { className: 'dcq-link', href: STUDIO_URL, target: '_blank', rel: 'noreferrer' }, tr('studio')),
      )

      return h(
        React.Fragment,
        null,
        h('div', { className: 'dcq-backdrop', onClick: closePanel, 'aria-hidden': 'true' }),
        h('div', { className: 'dcq-panel', role: 'dialog', 'aria-label': tr('title'), tabIndex: -1 }, header, body, footer),
      )
    }

    function FooterButton(props) {
      const tr = typeof props.t === 'function' ? props.t : fallbackT
      useStore()
      return h(
        'button',
        {
          type: 'button',
          className: 'dcq-foot-btn',
          'data-open': store.open ? '1' : '0',
          title: tr('button'),
          'aria-label': tr('button'),
          'aria-expanded': store.open,
          onClick: togglePanel,
        },
        h(Icon),
        h('span', { className: 'dcq-foot-label' }, tr('button')),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const locale = (typeof ctx.get === 'function' ? ctx.get('locale') : undefined) || ctx.locale
        const hasLocale = Boolean(locale && typeof locale.register === 'function')
        if (hasLocale) {
          ctx.effect(() => locale.register(NS, { zh, en }), 'commandcode-quota: dictionaries')
        }

        ctx.effect(() => {
          if (document.getElementById(STYLE_ID)) return undefined
          const style = document.createElement('style')
          style.id = STYLE_ID
          style.textContent = CSS
          document.head.appendChild(style)
          return () => style.remove()
        }, 'commandcode-quota: styles')

        const options = (name) => ({ name, id: 'commandcode-quota', order: 20, ...(hasLocale ? { locale: NS } : {}) })

        ctx.slots.inject('sidebar.footer.action', () =>
          ctx.slots.register(options('sidebar.footer.action'), FooterButton),
        )
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            { name: 'shell.overlay', id: 'commandcode-quota-panel', order: 20, ...(hasLocale ? { locale: NS } : {}) },
            Panel,
          ),
        )
      },
    }
  },
})
