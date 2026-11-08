/**
 * Client half of the Command Code quota panel.
 *
 * - `settings.section` "Command Code": the full page (credits, windows, period
 *   requests, plan tier, API key management).
 * - `shell.overlay` floating capsule: a draggable pill with live 5-hour / weekly
 *   meters; clicking it opens a compact popover near wherever it was dropped.
 *
 * Both halves read the Host's same-origin routes; the API key never reaches the
 * browser (only its status).
 */
window.__ModuleLoader__.load({
  id: '@local/commandcode-quota',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'commandcode-quota'
    const REPORT = '/dsh-commandcode/api/report'
    const KEY = '/dsh-commandcode/api/key'
    const STUDIO = 'https://commandcode.ai/usage'
    const STYLE_ID = 'dcq-style'
    const POS_KEY = 'dcq.capsule.position'
    const HIDDEN_KEY = 'dcq.capsule.hidden'
    const PLAN_KEY = 'dcq.plan.override'

    const zh = {
      button: 'Command Code',
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
      planOverride: '手动指定',
      planCaps: '窗口上限',
      planTier: '档位',
      extraCredits: '额外额度',
      studio: '在 Studio 打开',
      refresh: '刷新',
      refreshing: '刷新中…',
      updated: '更新于',
      justNow: '刚刚',
      secondsAgo: '秒前',
      minutesAgo: '分钟前',
      hoursAgo: '小时前',
      daysAgo: '天前',
      loading: '正在读取 Command Code 数据…',
      error: '读取失败',
      noKey: '没有找到 Command Code API key。请在下方填写，或运行 cmd login 登录一次。',
      retry: '重试',
      close: '关闭',
      drag: '拖动可移动，点击展开',
      apiKey: 'API key',
      apiKeyHint: '密钥只保存在 DSH 的凭据库里，不会写进配置文件，也不会发给浏览器。留空则沿用 cmd CLI / 环境变量 / DSH 凭据里的 key。',
      apiKeyPlaceholder: '粘贴 Command Code API key（user_… 或 cmd login 生成）',
      apiKeySave: '保存',
      apiKeyClear: '清除',
      apiKeySaved: '已保存',
      apiKeyCleared: '已清除',
      apiKeyConfigured: '已配置',
      apiKeyMissing: '未配置',
      apiKeySource: '来源',
      apiKeyWritable: '可在此处修改',
      apiKeyReadonly: '来自只读来源',
      widget: '浮窗',
      widgetShow: '显示桌面浮窗',
      widgetHint: '关闭后可通过此设置重新打开',
      collapsed: '收起',
      expand: '展开',
      settingsHint: '完整数据与设置见 设置 → Command Code',
      autoRefresh: '每分钟自动刷新',
    }
    const en = {
      button: 'Command Code',
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
      planOverride: 'manual',
      planCaps: 'window caps',
      planTier: 'tier',
      extraCredits: 'Extra credits',
      studio: 'Open Studio',
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      updated: 'updated',
      justNow: 'just now',
      secondsAgo: 's ago',
      minutesAgo: 'min ago',
      hoursAgo: 'h ago',
      daysAgo: 'd ago',
      loading: 'Reading Command Code data…',
      error: 'Could not load',
      noKey: 'No Command Code API key found. Enter one below, or sign in once with the cmd CLI.',
      retry: 'Retry',
      close: 'Close',
      drag: 'Drag to move, click to expand',
      apiKey: 'API key',
      apiKeyHint: 'The key is stored in the DSH credential store — never in configuration, never sent to the browser. Leave blank to keep using the cmd CLI / environment / DSH credential key.',
      apiKeyPlaceholder: 'Paste a Command Code API key (user_… or one from cmd login)',
      apiKeySave: 'Save',
      apiKeyClear: 'Clear',
      apiKeySaved: 'Saved',
      apiKeyCleared: 'Cleared',
      apiKeyConfigured: 'configured',
      apiKeyMissing: 'not configured',
      apiKeySource: 'source',
      apiKeyWritable: 'editable here',
      apiKeyReadonly: 'read-only source',
      widget: 'Floating widget',
      widgetShow: 'Show the floating widget',
      widgetHint: 'Turn it back on from this setting',
      collapsed: 'Collapse',
      expand: 'Expand',
      settingsHint: 'Full data and settings: Settings → Command Code',
      autoRefresh: 'Refreshes every minute',
    }

    function fallbackT(key) {
      return zh[key] ?? en[key] ?? key
    }

    const CSS = `
      .dcq-page{max-width:760px;margin:0 auto;padding:4px 4px 40px;display:flex;flex-direction:column;gap:12px;font-size:13px}
      .dcq-card{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:14px 16px;background:var(--dsw-alias-bg-layer-1)}
      .dcq-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
      .dcq-card-title{font-size:11px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
      .dcq-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 0;font-size:12.5px}
      .dcq-row-label{color:var(--dsw-alias-label-secondary);font-size:12px}
      .dcq-row-val{font-variant-numeric:tabular-nums;font-weight:600}
      .dcq-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
      .dcq-bigline{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}
      .dcq-big{font-size:26px;font-weight:750;letter-spacing:-.5px;font-variant-numeric:tabular-nums}
      .dcq-big-unit{font-size:12px;color:var(--dsw-alias-label-secondary)}
      .dcq-bar{height:8px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;margin:8px 0 6px}
      .dcq-bar-fill{height:100%;border-radius:999px;transition:width .5s ease}
      .dcq-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .dcq-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .dcq-stat{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px 6px;text-align:center;background:var(--dsw-alias-bg-layer-1)}
      .dcq-stat-num{font-size:16px;font-weight:750;font-variant-numeric:tabular-nums;letter-spacing:-.3px}
      .dcq-stat-lbl{font-size:10px;color:var(--dsw-alias-label-secondary);margin-top:3px;letter-spacing:.4px}
      .dcq-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.3px;
        color:var(--dsw-alias-brand-primary);border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2)}
      .dcq-note{font-size:11.5px;color:var(--dsw-alias-label-secondary);line-height:1.55}
      .dcq-link{color:var(--dsw-alias-brand-primary);text-decoration:none;font-weight:600;font-size:12px}
      .dcq-link:hover{text-decoration:underline}
      .dcq-btn{padding:5px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
      .dcq-btn:hover{background:var(--dsw-alias-bg-layer-2)}
      .dcq-btn-primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:#fff}
      .dcq-btn-primary:hover{filter:brightness(1.08);background:var(--dsw-alias-brand-primary)}
      .dcq-btn:disabled{opacity:.5;cursor:default}
      .dcq-input{flex:1;min-width:0;padding:7px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px}
      .dcq-input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px}
      .dcq-keyline{display:flex;gap:8px;align-items:center;margin-top:8px}
      .dcq-state{padding:30px 16px;text-align:center;font-size:12.5px;color:var(--dsw-alias-label-secondary);line-height:1.6}
      .dcq-err{color:var(--dsw-alias-state-error-primary)}
      .dcq-spin{width:16px;height:16px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;margin:0 auto 8px;animation:dcq-spin .8s linear infinite}
      @keyframes dcq-spin{to{transform:rotate(360deg)}}
      .dcq-switch{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12.5px}
      .dcq-switch input{accent-color:var(--dsw-alias-brand-primary)}

      /* ---- floating capsule ---- */
      .dcq-float{position:fixed;z-index:88;display:flex;align-items:center;gap:7px;height:34px;padding:0 11px 0 9px;border-radius:999px;cursor:grab;
        background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);box-shadow:0 6px 20px rgba(0,0,0,.18);
        color:var(--dsw-alias-label-primary);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:12px;font-weight:600;touch-action:none;user-select:none}
      .dcq-float:active{cursor:grabbing}
      .dcq-float[data-dragging="1"]{box-shadow:0 10px 28px rgba(0,0,0,.3);opacity:.96}
      .dcq-float-mark{width:18px;height:18px;border-radius:6px;background:linear-gradient(135deg,#0ea97a,#0d9488);display:grid;place-items:center;flex:none}
      .dcq-float-plan{font-weight:750;letter-spacing:.2px}
      .dcq-float-meter{display:flex;align-items:center;gap:4px;font-size:10.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
      .dcq-float-track{width:34px;height:4px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
      .dcq-float-fill{height:100%;border-radius:999px}
      .dcq-float-pct{min-width:24px;text-align:right}
      .dcq-float-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-brand-primary);flex:none;transition:opacity .2s}
      .dcq-float-dot[data-loading="1"]{animation:dcq-pulse 1s ease-in-out infinite}
      @keyframes dcq-pulse{0%,100%{opacity:1}50%{opacity:.25}}

      /* ---- popover ---- */
      .dcq-pop{position:fixed;z-index:89;width:320px;max-height:min(70vh,540px);overflow-y:auto;overflow-x:hidden;
        background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);
        border-radius:14px;box-shadow:0 14px 36px rgba(0,0,0,.24);padding:12px 13px;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:13px}
      .dcq-pop-head{display:flex;align-items:center;gap:8px;margin-bottom:9px}
      .dcq-pop-title{font-weight:700;font-size:13px}
      .dcq-pop-sub{font-size:10.5px;color:var(--dsw-alias-label-secondary)}
      .dcq-pop-spacer{flex:1}
      .dcq-pop .dcq-icon-btn{width:24px;height:24px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;display:grid;place-items:center;font-size:13px;line-height:1}
      .dcq-pop .dcq-icon-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
      .dcq-pop .dcq-card{padding:10px 11px;border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
      .dcq-pop .dcq-big{font-size:21px}
      .dcq-pop .dcq-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
      .dcq-pop .dcq-stat{padding:7px 4px}
      .dcq-pop .dcq-stat-num{font-size:14px}
      .dcq-pop-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:9px;font-size:10.5px;color:var(--dsw-alias-label-secondary)}
      @media (prefers-reduced-motion: reduce){.dcq-bar-fill{transition:none}.dcq-spin{animation:none}}
    `

    // ---------- shared store ----------
    const store = {
      report: null,
      keyStatus: null,
      loading: false,
      refreshing: false,
      error: null,
      lastFetch: 0,
      popoverOpen: false,
      widgetHidden: false,
      planOverride: '',
      position: null,
      capsuleRect: null,
      planSaving: false,
      keyMessage: '',
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

    function readLocal(key) {
      try {
        const raw = window.localStorage.getItem(key)
        return raw === null ? null : JSON.parse(raw)
      } catch {
        return null
      }
    }
    function writeLocal(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch {
        /* private mode */
      }
    }

    store.widgetHidden = readLocal(HIDDEN_KEY) === true
    store.position = readLocal(POS_KEY)
    store.planOverride = readLocal(PLAN_KEY) || ''

    function useStore() {
      const [, force] = React.useState(0)
      React.useEffect(() => store.subscribe(() => force((tick) => tick + 1)), [])
      return store
    }

    function useNow(intervalMs) {
      const [now, setNow] = React.useState(() => Date.now())
      React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs)
        return () => clearInterval(timer)
      }, [intervalMs])
      return now
    }

    async function loadReport(force) {
      store.set(force ? { refreshing: true, error: null } : { loading: store.report ? false : true, error: null })
      try {
        const params = new URLSearchParams()
        if (force) params.set('refresh', '1')
        if (store.planOverride) params.set('plan', store.planOverride)
        const query = params.toString()
        const response = await fetch(`${REPORT}${query ? `?${query}` : ''}`, {
          headers: { accept: 'application/json' },
          cache: 'no-store',
        })
        const body = await response.json().catch(() => null)
        if (!response.ok) throw new Error((body && body.error) || `HTTP ${response.status}`)
        if (!body || body.ok !== true) throw new Error(body && body.code === 'no-key' ? 'NO_KEY' : (body && body.error) || 'empty report')
        store.set({ report: body, error: null, lastFetch: Date.now(), loading: false, refreshing: false })
      } catch (error) {
        store.set({ error: error && error.message ? error.message : String(error), loading: false, refreshing: false })
      }
    }

    async function loadKeyStatus() {
      try {
        const response = await fetch(KEY, { headers: { accept: 'application/json' }, cache: 'no-store' })
        const body = await response.json().catch(() => null)
        if (response.ok && body && body.ok) store.set({ keyStatus: body })
      } catch {
        /* the report's no-key state already explains it */
      }
    }

    async function saveKey(value) {
      store.set({ keyMessage: '' })
      try {
        const response = await fetch(KEY, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ apiKey: value }),
        })
        const body = await response.json().catch(() => null)
        if (!response.ok || !body?.ok) throw new Error((body && body.error) || `HTTP ${response.status}`)
        store.set({ keyStatus: body, keyMessage: 'saved' })
        await loadReport(true)
      } catch (error) {
        store.set({ keyMessage: `error:${error && error.message ? error.message : String(error)}` })
      }
    }

    async function clearKey() {
      store.set({ keyMessage: '' })
      try {
        const response = await fetch(KEY, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ clear: true }),
        })
        const body = await response.json().catch(() => null)
        if (!response.ok || !body?.ok) throw new Error((body && body.error) || `HTTP ${response.status}`)
        store.set({ keyStatus: body, keyMessage: 'cleared' })
        await loadReport(true)
      } catch (error) {
        store.set({ keyMessage: `error:${error && error.message ? error.message : String(error)}` })
      }
    }

    function setPlanOverride(value) {
      store.set({ planOverride: value })
      writeLocal(PLAN_KEY, value)
      store.set({ planSaving: true })
      loadReport(true).finally(() => store.set({ planSaving: false }))
    }

    function togglePopover() {
      const open = !store.popoverOpen
      store.set({ popoverOpen: open })
      if (open) {
        loadReport(true)
        if (!store.keyStatus) loadKeyStatus()
      }
    }
    function closePopover() {
      store.set({ popoverOpen: false })
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
    function relative(ts, tr, now) {
      if (!ts) return ''
      const diff = Math.max(0, (now || Date.now()) - ts)
      if (diff < 5000) return tr('justNow')
      if (diff < 60000) return `${Math.floor(diff / 1000)} ${tr('secondsAgo')}`
      if (diff < 3600000) return `${Math.floor(diff / 60000)} ${tr('minutesAgo')}`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${tr('hoursAgo')}`
      return `${Math.floor(diff / 86400000)} ${tr('daysAgo')}`
    }
    function toneVar(percent) {
      if (percent === null || percent === undefined) return 'var(--dsw-alias-brand-primary)'
      if (percent >= 85) return 'var(--dsw-alias-state-error-primary)'
      if (percent >= 60) return 'var(--dsw-alias-state-warn-primary)'
      return 'var(--dsw-alias-brand-primary)'
    }

    const PLAN_OPTIONS = [
      ['', 'auto'],
      ['individual-go', 'Go'],
      ['individual-goat', 'GOAT'],
      ['individual-pro', 'Pro'],
      ['individual-pro-v1', 'Pro (v1)'],
      ['individual-max', 'Max'],
      ['individual-ultra', 'Ultra'],
      ['teams-pro', 'Teams Pro'],
      ['individual-provider', 'Provider'],
    ]

    function Icon({ size }) {
      const s = size || 15
      return h(
        'svg',
        { width: s, height: s, viewBox: '0 0 64 64', 'aria-hidden': 'true' },
        h('rect', { x: 2, y: 2, width: 60, height: 60, rx: 16, fill: '#0d9488' }),
        h('rect', { x: 14, y: 34, width: 8, height: 16, rx: 2.5, fill: '#fff', opacity: 0.9 }),
        h('rect', { x: 28, y: 26, width: 8, height: 24, rx: 2.5, fill: '#fff', opacity: 0.96 }),
        h('rect', { x: 42, y: 18, width: 8, height: 32, rx: 2.5, fill: '#fff' }),
      )
    }

    function Bar({ percent, height }) {
      return h(
        'div',
        { className: 'dcq-bar', style: height ? { height } : undefined },
        h('div', {
          className: 'dcq-bar-fill',
          style: { width: `${Math.max(2, Math.min(100, percent || 0))}%`, background: toneVar(percent) },
        }),
      )
    }

    function Meter({ label, data, tr, compactMode }) {
      if (!data) return null
      const percent = data.percent || 0
      return h(
        'div',
        { style: { marginTop: compactMode ? 6 : 10 } },
        h(
          'div',
          { className: 'dcq-meta' },
          h('span', { style: { fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, label),
          h('span', null, `${credits(data.used)} / ${credits(data.cap)}`),
        ),
        h(Bar, { percent, height: compactMode ? 6 : 8 }),
        h(
          'div',
          { className: 'dcq-meta', style: { fontSize: 10.5 } },
          h('span', null, data.resetAt ? `${tr('windowReset')} ${clock(data.resetAt)}` : ''),
          h('span', { style: { color: data.exceeded ? 'var(--dsw-alias-state-error-primary)' : 'inherit' } }, `${Math.round(percent)}%`),
        ),
      )
    }

    function ErrorState({ tr, error, onRetry }) {
      const noKey = error === 'NO_KEY'
      return h(
        'div',
        { className: 'dcq-state' },
        noKey ? h('div', null, tr('noKey')) : h('div', { className: 'dcq-err' }, `${tr('error')}: ${error}`),
        h('button', { className: 'dcq-btn', type: 'button', style: { marginTop: 10 }, onClick: onRetry }, tr('retry')),
      )
    }

    function KeyCard({ tr }) {
      useStore()
      const [draft, setDraft] = React.useState('')
      const status = store.keyStatus
      const message = store.keyMessage
      const configured = status ? status.configured : null
      return h(
        'div',
        { className: 'dcq-card' },
        h(
          'div',
          { className: 'dcq-card-head' },
          h('div', { className: 'dcq-card-title' }, tr('apiKey')),
          h(
            'span',
            { className: 'dcq-meta' },
            configured === null
              ? ''
              : h('span', { style: { color: configured ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-warn-primary)' } }, configured ? tr('apiKeyConfigured') : tr('apiKeyMissing')),
          ),
        ),
        h(
          'div',
          { className: 'dcq-note' },
          status && status.source ? `${tr('apiKeySource')}: ${status.source}` : '',
          status && status.writable ? ` · ${tr('apiKeyWritable')}` : status && status.configured ? ` · ${tr('apiKeyReadonly')}` : '',
        ),
        h(
          'div',
          { className: 'dcq-keyline' },
          h('input', {
            className: 'dcq-input',
            type: 'password',
            autoComplete: 'off',
            spellCheck: false,
            placeholder: tr('apiKeyPlaceholder'),
            value: draft,
            onChange: (event) => setDraft(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter' && draft.trim()) {
                saveKey(draft.trim()).then(() => setDraft(''))
              }
            },
          }),
          h(
            'button',
            {
              className: 'dcq-btn dcq-btn-primary',
              type: 'button',
              disabled: !draft.trim(),
              onClick: () => saveKey(draft.trim()).then(() => setDraft('')),
            },
            tr('apiKeySave'),
          ),
          status && status.writable
            ? h('button', { className: 'dcq-btn', type: 'button', onClick: () => clearKey() }, tr('apiKeyClear'))
            : null,
        ),
        h('div', { className: 'dcq-note', style: { marginTop: 8 } }, tr('apiKeyHint')),
        message
          ? h(
              'div',
              { className: 'dcq-note', style: { marginTop: 6 }, 'data-error': message.startsWith('error:') ? '1' : '0' },
              message === 'saved' ? tr('apiKeySaved') : message === 'cleared' ? tr('apiKeyCleared') : `${tr('error')}: ${message.slice(6)}`,
            )
          : null,
      )
    }

    function PlanCard({ tr }) {
      useStore()
      const report = store.report
      const plan = report && report.plan
      return h(
        'div',
        { className: 'dcq-card' },
        h(
          'div',
          { className: 'dcq-card-head' },
          h('div', { className: 'dcq-card-title' }, tr('plan')),
          report && plan && plan.name ? h('span', { className: 'dcq-chip' }, plan.name) : null,
        ),
        h(
          'div',
          { className: 'dcq-row' },
          h('span', { className: 'dcq-row-label' }, tr('planTier')),
          h(
            'select',
            {
              className: 'dcq-input',
              style: { flex: '0 0 190px', padding: '5px 8px' },
              value: store.planOverride,
              disabled: store.planSaving,
              onChange: (event) => setPlanOverride(event.target.value),
            },
            PLAN_OPTIONS.map(([value, label]) =>
              h('option', { key: value || 'auto', value }, value === '' ? tr('planAuto') : label),
            ),
          ),
        ),
        plan && plan.credits
          ? h(
              'div',
              { className: 'dcq-meta', style: { marginTop: 8 } },
              h('span', null, `${tr('planCaps')} ${credits(plan.fiveHourCap)} / ${credits(plan.weeklyCap)}`),
              h('span', null, plan.source === 'override' ? tr('planOverride') : tr('planAuto')),
            )
          : h('div', { className: 'dcq-meta', style: { marginTop: 8 } }, tr('planAuto')),
      )
    }

    function ReportCards({ tr, compact: small }) {
      useStore()
      const report = store.report
      if (!report) return null
      const credit = report.credits
      const windows = report.windows
      const summary = report.summary
      const cards = []
      cards.push(
        h(
          'div',
          { className: 'dcq-card', key: 'credit' },
          h('div', { className: 'dcq-card-head' }, h('div', { className: 'dcq-card-title' }, tr('credit'))),
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
      )
      cards.push(
        h(
          'div',
          { className: 'dcq-card', key: 'windows' },
          h('div', { className: 'dcq-card-head' }, h('div', { className: 'dcq-card-title' }, tr('windows'))),
          windows && windows.limited
            ? h(
                React.Fragment,
                null,
                h(Meter, { label: tr('fiveHour'), data: windows.fiveHour, tr, compactMode: small }),
                h(Meter, { label: tr('weekly'), data: windows.weekly, tr, compactMode: small }),
              )
            : h('div', { className: 'dcq-note' }, tr('noWindows')),
        ),
      )
      if (summary) {
        cards.push(
          h(
            'div',
            { className: 'dcq-card', key: 'period' },
            h(
              'div',
              { className: 'dcq-card-head' },
              h('div', { className: 'dcq-card-title' }, tr('period')),
              h('span', { className: 'dcq-meta' }, tr('autoRefresh')),
            ),
            h(
              'div',
              { className: 'dcq-grid', style: small ? undefined : { gridTemplateColumns: 'repeat(4, minmax(0,1fr))' } },
              h('div', { className: 'dcq-stat' }, h('div', { className: 'dcq-stat-num' }, compact(summary.count)), h('div', { className: 'dcq-stat-lbl' }, tr('requests'))),
              h('div', { className: 'dcq-stat' }, h('div', { className: 'dcq-stat-num' }, summary.successRate !== null ? `${summary.successRate}%` : '—'), h('div', { className: 'dcq-stat-lbl' }, tr('success'))),
              h('div', { className: 'dcq-stat' }, h('div', { className: 'dcq-stat-num' }, money(summary.cost)), h('div', { className: 'dcq-stat-lbl' }, tr('cost'))),
              small
                ? null
                : h('div', { className: 'dcq-stat' }, h('div', { className: 'dcq-stat-num' }, compact(summary.tokens)), h('div', { className: 'dcq-stat-lbl' }, 'tokens')),
            ),
            h(
              'div',
              { className: 'dcq-row', style: { marginTop: 6 } },
              h('span', { className: 'dcq-row-label' }, tr('tokens')),
              h('span', { className: 'dcq-row-val' }, `${compact(summary.tokensIn)} / ${compact(summary.tokensOut)}`),
            ),
          ),
        )
      }
      return h(React.Fragment, null, cards)
    }

    function LastUpdated({ tr, now, refreshing, onRefresh }) {
      return h(
        'span',
        { className: 'dcq-meta', style: { gap: 8 } },
        refreshing
          ? h('span', null, tr('refreshing'))
          : h('span', null, store.lastFetch ? `${tr('updated')} ${relative(store.lastFetch, tr, now)}` : ''),
        h('button', { className: 'dcq-btn', type: 'button', style: { padding: '3px 10px', fontSize: 11 }, onClick: onRefresh, disabled: refreshing }, tr('refresh')),
      )
    }

    function SettingsPage(props) {
      const tr = typeof props.t === 'function' ? props.t : fallbackT
      const now = useNow(10000)
      useStore()
      React.useEffect(() => {
        loadKeyStatus()
        loadReport(true)
        const timer = setInterval(() => {
          if (document.visibilityState === 'visible') loadReport(false)
        }, 60000)
        return () => clearInterval(timer)
      }, [])

      const report = store.report
      const hidden = store.widgetHidden

      return h(
        'div',
        { className: 'dcq-page' },
        h(
          'div',
          { className: 'dcq-card' },
          h(
            'div',
            { className: 'dcq-card-head', style: { marginBottom: 4 } },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('span', { style: { display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#0ea97a,#0d9488)' } }, h(Icon, { size: 17 })),
              h(
                'div',
                null,
                h('div', { style: { fontWeight: 700, fontSize: 14 } }, tr('title')),
                h('div', { className: 'dcq-meta', style: { justifyContent: 'flex-start', gap: 6 } },
                  report && report.account ? (report.account.userName ? `@${report.account.userName}` : '') : '',
                  report && report.plan && report.plan.name ? h('span', { className: 'dcq-chip' }, report.plan.name) : null,
                ),
              ),
            ),
            h(LastUpdated, { tr, now, refreshing: store.refreshing, onRefresh: () => loadReport(true) }),
          ),
          h('div', { className: 'dcq-note' }, tr('settingsHint')),
        ),
        !report && store.loading
          ? h('div', { className: 'dcq-state' }, h('div', { className: 'dcq-spin' }), tr('loading'))
          : !report && store.error
            ? h('div', { className: 'dcq-card' }, h(ErrorState, { tr, error: store.error, onRetry: () => loadReport(true) }))
            : null,
        report
          ? h(
              React.Fragment,
              null,
              h(ReportCards, { tr }),
              h(PlanCard, { tr }),
              h(
                'div',
                { className: 'dcq-card' },
                h('div', { className: 'dcq-card-head' }, h('div', { className: 'dcq-card-title' }, tr('widget'))),
                h(
                  'label',
                  { className: 'dcq-switch' },
                  h('input', {
                    type: 'checkbox',
                    checked: !hidden,
                    onChange: (event) => {
                      const nextHidden = !event.target.checked
                      store.set({ widgetHidden: nextHidden })
                      writeLocal(HIDDEN_KEY, nextHidden)
                    },
                  }),
                  h('span', null, tr('widgetShow')),
                ),
                hidden ? h('div', { className: 'dcq-note', style: { marginTop: 6 } }, tr('widgetHint')) : null,
              ),
              h(KeyCard, { tr }),
              store.error ? h('div', { className: 'dcq-card' }, h('div', { className: 'dcq-note dcq-err' }, `${tr('error')}: ${store.error}`)) : null,
              h(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 } },
                h('span', { className: 'dcq-meta' }, report.fetchedAt ? `${tr('updated')} ${relative(Date.parse(report.fetchedAt), tr, now)}` : ''),
                h('a', { className: 'dcq-link', href: STUDIO, target: '_blank', rel: 'noreferrer' }, tr('studio')),
              ),
            )
          : h('div', { className: 'dcq-card' }, h(KeyCard, { tr })),
      )
    }

    function FloatingWidget(props) {
      const tr = typeof props.t === 'function' ? props.t : fallbackT
      const now = useNow(30000)
      useStore()
      const [rect, setRect] = React.useState(null)
      const [dragging, setDragging] = React.useState(false)
      const capsule = React.useRef(null)
      const dragState = React.useRef(null)

      const clamp = (left, top) => {
        const width = capsule.current ? capsule.current.offsetWidth : 160
        const maxLeft = Math.max(8, window.innerWidth - width - 8)
        const maxTop = Math.max(8, window.innerHeight - 44 - 8)
        return { left: Math.min(Math.max(8, left), maxLeft), top: Math.min(Math.max(8, top), maxTop) }
      }

      // Restore the saved position, or start above the sidebar footer.
      React.useEffect(() => {
        const saved = store.position
        const pos = saved ? clamp(saved.left, saved.top) : clamp(window.innerWidth - 210, window.innerHeight - 96)
        store.set({ position: pos })
        const onResize = () => store.set({ position: clamp(store.position.left, store.position.top) })
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
      }, [])

      React.useEffect(() => {
        const timer = setInterval(() => {
          if (document.visibilityState === 'visible') loadReport(false)
        }, 300000)
        return () => clearInterval(timer)
      }, [])

      React.useEffect(() => {
        if (!store.popoverOpen) return undefined
        const onKey = (event) => {
          if (event.key === 'Escape') closePopover()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [store.popoverOpen])

      const onPointerDown = (event) => {
        if (event.button !== 0) return
        const start = { x: event.clientX, y: event.clientY, left: store.position.left, top: store.position.top }
        dragState.current = { start, moved: false }
        setDragging(true)
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }
      const onPointerMove = (event) => {
        const state = dragState.current
        if (!state) return
        const dx = event.clientX - state.start.x
        const dy = event.clientY - state.start.y
        if (!state.moved && Math.abs(dx) + Math.abs(dy) < 4) return
        state.moved = true
        const pos = clamp(state.start.left + dx, state.start.top + dy)
        store.set({ position: pos })
      }
      const onPointerUp = (event) => {
        const state = dragState.current
        dragState.current = null
        setDragging(false)
        event.currentTarget.releasePointerCapture?.(event.pointerId)
        if (state && state.moved) {
          writeLocal(POS_KEY, store.position)
        } else {
          togglePopover()
        }
      }

      if (store.widgetHidden) return null
      const position = store.position
      if (!position) return null

      const report = store.report
      const windows = report && report.windows
      const five = windows && windows.fiveHour
      const week = windows && windows.weekly
      const credit = report && report.credits
      const plan = report && report.plan

      const popPos = (() => {
        if (!store.popoverOpen || !capsule.current) return null
        const box = capsule.current.getBoundingClientRect()
        const width = 320
        let left = box.left
        if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8
        left = Math.max(8, left)
        let top = box.top - 8
        const estimated = 420
        if (top - estimated < 8) top = Math.min(window.innerHeight - 8, box.bottom + 8 + estimated)
        return { left, bottom: Math.max(8, window.innerHeight - top) }
      })()

      return h(
        React.Fragment,
        null,
        h(
          'div',
          {
            ref: capsule,
            className: 'dcq-float',
            style: { left: position.left, top: position.top },
            role: 'button',
            tabIndex: 0,
            'aria-label': tr('button'),
            title: tr('drag'),
            'data-dragging': dragging ? '1' : '0',
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                togglePopover()
              }
            },
          },
          h('span', { className: 'dcq-float-mark' }, h(Icon, { size: 11 })),
          h('span', { className: 'dcq-float-plan' }, plan && plan.name ? plan.name : 'CC'),
          five
            ? h(
                'span',
                { className: 'dcq-float-meter' },
                h('span', null, '5h'),
                h('span', { className: 'dcq-float-track' }, h('span', { className: 'dcq-float-fill', style: { width: `${Math.max(3, Math.min(100, five.percent || 0))}%`, background: toneVar(five.percent) } })),
                h('span', { className: 'dcq-float-pct' }, `${Math.round(five.percent || 0)}%`),
              )
            : null,
          week
            ? h(
                'span',
                { className: 'dcq-float-meter' },
                h('span', null, 'W'),
                h('span', { className: 'dcq-float-track' }, h('span', { className: 'dcq-float-fill', style: { width: `${Math.max(3, Math.min(100, week.percent || 0))}%`, background: toneVar(week.percent) } })),
                h('span', { className: 'dcq-float-pct' }, `${Math.round(week.percent || 0)}%`),
              )
            : null,
          !five && credit
            ? h('span', { className: 'dcq-float-meter' }, h('span', null, `${credits(credit.remaining)} ${tr('remaining')}`))
            : null,
          h('span', { className: 'dcq-float-dot', 'data-loading': store.refreshing || store.loading ? '1' : '0' }),
        ),
        store.popoverOpen && popPos
          ? h(
              React.Fragment,
              null,
              h('div', { style: { position: 'fixed', inset: 0, zIndex: 88 }, onClick: closePopover, 'aria-hidden': 'true' }),
              h(
                'div',
                { className: 'dcq-pop', style: { left: popPos.left, bottom: popPos.bottom }, role: 'dialog', 'aria-label': tr('title') },
                h(
                  'div',
                  { className: 'dcq-pop-head' },
                  h('span', { style: { display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg,#0ea97a,#0d9488)' } }, h(Icon, { size: 14 })),
                  h(
                    'div',
                    { style: { minWidth: 0 } },
                    h('div', { className: 'dcq-pop-title' }, tr('title')),
                    h('div', { className: 'dcq-pop-sub' }, report && report.account ? (report.account.userName ? `@${report.account.userName}` : '') : ''),
                  ),
                  h('span', { className: 'dcq-pop-spacer' }),
                  h('button', { className: 'dcq-icon-btn', type: 'button', title: tr('refresh'), 'aria-label': tr('refresh'), onClick: () => loadReport(true) }, '⟳'),
                  h('button', { className: 'dcq-icon-btn', type: 'button', title: tr('close'), 'aria-label': tr('close'), onClick: closePopover }, '✕'),
                ),
                !report && store.loading
                  ? h('div', { className: 'dcq-state' }, h('div', { className: 'dcq-spin' }), tr('loading'))
                  : !report && store.error
                    ? h(ErrorState, { tr, error: store.error, onRetry: () => loadReport(true) })
                    : h(ReportCards, { tr, compact: true }),
                h(
                  'div',
                  { className: 'dcq-pop-foot' },
                  h('span', null, store.refreshing ? tr('refreshing') : store.lastFetch ? `${tr('updated')} ${relative(store.lastFetch, tr, now)}` : ''),
                  h('a', { className: 'dcq-link', href: STUDIO, target: '_blank', rel: 'noreferrer' }, tr('studio')),
                ),
              ),
            )
          : null,
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const locale = (typeof ctx.get === 'function' ? ctx.get('locale') : undefined) || ctx.locale
        const hasLocale = Boolean(locale && typeof locale.register === 'function')
        let translate = fallbackT
        if (hasLocale) {
          ctx.effect(() => locale.register(NS, { zh, en }), 'commandcode-quota: dictionaries')
          if (typeof locale.bind === 'function') translate = locale.bind(NS)
        }

        ctx.effect(() => {
          if (document.getElementById(STYLE_ID)) return undefined
          const style = document.createElement('style')
          style.id = STYLE_ID
          style.textContent = CSS
          document.head.appendChild(style)
          return () => style.remove()
        }, 'commandcode-quota: styles')

        const base = { order: 30, ...(hasLocale ? { locale: NS } : {}), inject: () => ({ t: translate }) }

        ctx.slots.inject('settings.section', () =>
          ctx.slots.register({ name: 'settings.section', id: 'commandcode-quota', label: () => translate('button'), ...base }, SettingsPage),
        )
        if (ctx.slots.inject) {
          ctx.slots.inject('settings.section.icon', () =>
            ctx.slots.register({ name: 'settings.section.icon', id: 'commandcode-quota' }, (props) =>
              h(Icon, { size: (props && props.size) || 16 }),
            ),
          )
        }
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register({ name: 'shell.overlay', id: 'commandcode-quota-float', order: 30, ...(hasLocale ? { locale: NS } : {}), inject: () => ({ t: translate }) }, FloatingWidget),
        )
      },
    }
  },
})
