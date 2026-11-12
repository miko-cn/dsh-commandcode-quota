# AGENTS.md

给在这个仓库里工作的 Agent（以及人）的说明。**先读这份，再动代码。**
用户文档见 [README.md](README.md) / [README.en.md](README.en.md)。

## 项目概览

一个 DeepSeek Harness（DSH）Web 插件：Host 半取数、Client 半展示。
纯 JavaScript，**没有构建步骤**，**零运行时依赖**。

| 账号 | 用途 |
| --- | --- |
| GitHub `miko-cn` | 仓库、Release、市场 PR |
| npm `yumiku` | `@yumiku/dsh-commandcode-quota`（发布需 2FA 网页认证） |

## 仓库地图

| 路径 | 职责 | 什么时候动 |
| --- | --- | --- |
| `index.js` | Host：解析 key、调 Command Code `/alpha/*`、整理报表、注册同源路由、key 管理 | 改数据源/接口时 |
| `client.js` | Client：`settings.section`、`settings.section.icon`、`shell.overlay`；浮窗与浮层 | 改界面时 |
| `cordis.patch.yml` | bundle patch：插入插件行与默认 config | 改默认配置时 |
| `locale/zh.json`、`locale/en.json` | 插件列表里的标题/描述（meta） | 改文案时 |
| `market/index.json` + `market/icon.webp` | 自建 format-1 Discover 索引 | **每次发版后**用脚本重建 |
| `assets/` | README 的 banner 与界面预览 | 界面文案/布局变化后用脚本重渲染 |
| `test/` | 客户端桩测试 + Host 真实接口测试 | 改行为时同步补 |
| `scripts/build-index.mjs` | 从 `package.json` + npm 发布时间生成索引 | 不用手改 `market/index.json` |
| `scripts/validate-index.mjs` | 官方 format-1 校验器 | 改索引后 |
| `scripts/check-locales.mjs` | 中英文案 key 对齐检查 | 改文案后 |
| `scripts/make-assets.mjs` | 渲染 banner / 预览图（需要 sharp） | 改视觉后 |
| `.github/workflows/ci.yml` | push/PR：语法、manifest、客户端测试、locale、索引、pack | — |
| `.github/workflows/release.yml` | 推 `v*` 标签：pack + 创建 Release | — |
| `marketplace/awesome-dsh-plugin.yml` | awesome 投稿草稿 | 投稿/更新条目时 |

## 硬规则（代码）

1. **包名三处必须一致**：`package.json` 的 `name`、`cordis.patch.yml` 的 `name`、`client.js` 的 `__ModuleLoader__.load({ id })`。改名后必须重新安装 bundle，并同步 `market/index.json`、README 与投稿条目。
2. **零运行时依赖**：只用 Node 内置模块和浏览器全局（`react` 由宿主提供）。devDependency 只有索引校验器。
3. **API key 只留在 Host**：浏览器永远拿不到 key；新增接口必须挂在 `/dsh-commandcode/api/*` 下并走 DSH 请求门禁。
4. **不引入构建步骤**：源码即产物，`node --check` 通过就应该能跑。
5. **客户端 service 必须写进 `inject`**：`slots`、`locale` 等用到就要声明。直接读未声明的 `ctx.<service>` 会抛 `cannot get property "..." without inject`，导致 Desktop 启动时报 `web boot: entry did not activate`（**且不带原因**）。
6. **`apply` 每一步单独 try/catch**：失败时在页面留可见错误（`bootFailure` 红框），不要让整个入口挂掉。
7. **主题与国际化**：容器只用 `--dsw-alias-*` token；可见文案走 locale（`zh` / `en`），改文案后跑 `node scripts/check-locales.mjs`。
8. **不碰官方**：不改、不包、不冒用 `@deepseek-ai/*`；安装期不执行任何脚本。
9. **隐私**：不提交真实账号截图、邮箱、本机绝对路径或任何 key；测试与素材用 demo 数据（`@demo` / `Demo User`）。
10. **只做最小改动**：额度到阈值就只是进度条和浮窗变色，不要顺手加预测撞线、本地历史、预警弹窗这类机制——复杂版已被回退过一次；要加复杂度先问。
11. **时间用紧凑字母单位**：`24d 22h`、`5h 12m`、`37m`，中英文一致，不写「24天 22小时」。

## 环境与 Git 约定

- 单分支 `main`，直接提交；提交信息沿用现有风格（`feat:` / `fix:` / `docs:` / `chore:`），首行说清"改了什么"。
- Git 身份：`Miko <miko-cn@users.noreply.github.com>`；`core.autocrlf=false`。
- 标签：`vX.Y.Z`（annotated），**发布后不改写已发布历史**——DSH-Store 会固定到具体 commit，force-push 会让它的 pin 失效。
- 仓库是公开的：**secret scanning + push protection 已开启**，不要提交任何凭据。
- 本地仓库损坏时：远端是唯一事实来源，可 `.git` 改名后 `git init` → `fetch` → `reset --mixed origin/main` 恢复，工作区文件不受影响。

## 开发与验证

```pwsh
node --check index.js
node --check client.js
node test/test-client.mjs           # 无需网络：槽位注册、设置页、浮窗、浮层
node test/test-host.mjs <api-key>   # 真实接口：报表 + key 状态（仅本地，勿把 key 写进仓库）

node scripts/check-locales.mjs      # 中英文 key 对齐
npm install                         # 仅装索引校验器
npm run build:index                 # 重建 market/index.json
npm run validate:index              # 官方校验器
```

改过界面后重渲染素材（需要 sharp）：

```pwsh
$env:SHARP_PATH='<node_modules>/sharp'; node scripts/make-assets.mjs
```

**验证底线**：两个入口 `node --check`、`test/test-client.mjs`、CI 全绿；动 Host 数据逻辑要用真实 key 对比字段；动索引要 `validate:index`；视觉改动要在 DSH 里刷新确认，并在交付说明里写清未验证的边界。

## 发版流程（发 npm 时逐条执行）

1. 改 `package.json` 的 `version`（SemVer；修 bug 用 patch，功能用 minor）。
2. 本地跑：两个 `node --check`、`test/test-client.mjs`、`check:locales`、`validate:index`。
3. `npm publish`（用户手动，2FA 网页认证）。等待 registry 生效：`npm view @yumiku/dsh-commandcode-quota version` 应返回新版本（可能显示 `202 being processed`，需要半分钟到几分钟）。
4. `npm run build:index` → 提交 `market/index.json`（提交信息如 `chore: point the Discover index at X.Y.Z`）。
5. `git tag vX.Y.Z && git push origin main --tags` → release 工作流自动打包并创建 GitHub Release（资产名固定 `dsh-commandcode-quota.tgz`）。
6. 验证：`npm view ... version`、`gh release view vX.Y.Z`、raw 索引版本、CI/Release 工作流均绿。
7. 同步目录渠道（见下），并在现有 issue 里留言新版本。
8. 如果行为/FAQ 变了，更新 README（中英两版）与 `marketplace/awesome-dsh-plugin.yml`。

## 目录渠道（发布到哪里）

| 渠道 | 方式 | 注意 |
| --- | --- | --- |
| **npm** | `npm publish`（2FA） | 包的 `repository` 必须回指本仓库 |
| **GitHub** | 公开仓库 + `dsh-plugin` topic + Release tarball | 多个目录按 topic 自动抓取 |
| **awesome-dsh-plugin**（dshmarket 的数据源） | PR 新增 `data/plugins/miko-cn__dsh-commandcode-quota.yml` | 仓库满 1 天、需 `dsh.bundle`、`dsh-plugin` topic；**不要手改生成的 README**；一次 PR 最多 3 条 |
| **dshbase** | 仓库 `ylwl1997/dshbase` 的 `plugin-submission.yml` / `verification-evidence.yml` issue | 每天 04:17 UTC 按 topic 自动同步；验证证据走 evidence issue |
| **DSH-Store**（dsh.store） | 仓库 `AI-Scarlett/DSH-Store` 的 `plugin-submission.yml` issue | 固定完整 commit；Catalog 每天 00:05/08:05/16:05 UTC 扫描；**改写历史会让 pin 失效** |
| **dsh.so** | 无需投稿，自动抓 GitHub topic + npm | 出现同名插件时注意 slug 归属 |
| **自建 Discover 索引** | `market/index.json`，用户加到 Plugins → Discover | 每次发版后重建 |

## 故障排查

**Desktop 启动报 `Failed to load plugins / entry did not activate`**
1. 看崩溃日志：`%APPDATA%\@deepseek-ai\dsh-desktop\logs\crash-*-web-boot.log`（会记录哪个入口 `failed`，但**不写原因**）。
2. boot 审计规则：`import failed: ...` = 模块加载失败；`pending (waiting for service: X)` = 缺 inject；裸 `failed` = `apply` 抛错。
3. 常见根因：读未声明的 `ctx.<service>`（例如 `ctx.locale` 没写进 `inject`）。
4. 临时诊断：`apply` 每步 try/catch + 页面红框（`bootFailure`），重启后可以直接复制错误。

**路由状态判断**：`401` = 插件已加载且门禁生效；`404` = 插件没加载（或路由没注册）。

**`plugin_manager` 安装报 `ERR_PNPM_EPERM`**
多为 profile `node_modules` 里残留的 junction。用 `cmd /c rmdir <link>` 只删链接（**不要** `Remove-Item -Recurse`，Windows PowerShell 可能跟随 junction 删到目标目录——本仓库 `.git` 就这样被误删过一次）。清理后重新安装。

**改了界面但 DSH 里没变化**：客户端 bundle 由文件 mtime 驱动，刷新页面即可；Host 改动需要重启 DSH。

## 交付前检查清单

- [ ] `node --check index.js client.js`
- [ ] `node test/test-client.mjs`
- [ ] `node scripts/check-locales.mjs`
- [ ] `npm run validate:index`（若动了索引）
- [ ] CI 绿
- [ ] 版本号已 bump、索引已重建（发版时）
- [ ] README / FAQ / 预览图与行为一致
- [ ] 没有提交 key、真实截图、本机绝对路径
