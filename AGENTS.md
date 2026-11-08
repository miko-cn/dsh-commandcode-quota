# AGENTS.md

给在这个仓库里工作的 Agent（以及人）的说明。背景、用法和发布细节见 [README.md](README.md)。

## 这是什么

一个 DeepSeek Harness（DSH）Web 插件：Host 半取数、Client 半展示，纯 JavaScript、**没有构建步骤**。

- `index.js` — Host：解析 API key、调 Command Code 的 `/alpha/*`、整理报表；注册同源路由 `/dsh-commandcode/api/report` 与 `/dsh-commandcode/api/key`
- `client.js` — Client：注册 `settings.section`、`settings.section.icon`、`shell.overlay`
- `cordis.patch.yml` — bundle patch，插入插件行
- `market/` — 自建 format-1 Discover 索引（`scripts/build-index.mjs` 生成）
- `assets/` — README 用的 banner 与界面预览（`scripts/make-assets.mjs` 生成）
- `test/` — 客户端渲染冒烟测试 + Host 真实接口测试

## 硬规则（改代码前先读）

1. **包名三处必须一致**：`package.json` 的 `name`、`cordis.patch.yml` 的 `name`、`client.js` 里 `window.__ModuleLoader__.load({ id })`。改完要重新安装 bundle。
2. **零运行时依赖**：只用 Node 内置模块和浏览器全局（`react` 由宿主提供）。不要新增 `@deepseek-ai/*` 或其他 import。
3. **API key 只留在 Host**：浏览器永远拿不到 key。新增接口必须挂在 `/dsh-commandcode/api/*` 下，并走 DSH 请求门禁（`connection.requestRejection`）。
4. **不引入构建步骤**：源码即产物，`node --check` 通过就应该能跑。
5. **主题与国际化**：颜色只用 `--dsw-alias-*` token；可见文案走 locale 服务（`zh` / `en` 两套），不要硬编码在组件里。玻璃/高光这类装饰可以用半透明白，但基础容器必须用 token。
6. **不碰官方**：不改、不包、不冒用 `@deepseek-ai/*`；安装期不执行任何脚本。
7. **隐私**：不要提交真实账号截图、邮箱、本机绝对路径或任何 key。测试与素材一律用 demo 数据（`@demo` / `Example User`）。
8. **客户端 service 必须写进 `inject`**：用到 `slots`、`locale`、`connection` 等都要声明；直接读未声明的 `ctx.<service>` 会抛
   `cannot get property "..." without inject`，并让 web boot 报 `entry did not activate`（**不带原因**，极难排查）。
   `apply` 里的每个注册步骤要单独 try/catch，失败时在页面上留下可见错误，而不是让整个入口挂掉。

## 开发命令

```pwsh
node --check index.js
node --check client.js
node test/test-client.mjs           # 无需网络
node test/test-host.mjs <api-key>   # 需要真实 Command Code key，只在本地跑

npm install                          # 只装校验器 devDependency
npm run build:index                  # 从 package.json + npm 发布时间重建 market/index.json
npm run validate:index               # 官方 format-1 校验器
```

界面素材需要 sharp：

```pwsh
$env:SHARP_PATH='<node_modules>/sharp'; node scripts/make-assets.mjs
```

## 发版流程

1. 改 `package.json` 的 `version`（SemVer）。
2. `npm publish`（带 2FA；包名 `@yumiku/dsh-commandcode-quota`，`publishConfig.access=public`）。
3. `npm run build:index`，把 `market/index.json` 更新到新版本并提交。
4. commit → `git tag vX.Y.Z` → `git push --tags`：release 工作流会 `npm pack` 并创建 GitHub Release（资产名固定为 `dsh-commandcode-quota.tgz`）。
5. 目录渠道（按需）：awesome-dsh-plugin 提 PR、dshbase / DSH-Store 提 issue。

## 验证要求

- 两个入口 `node --check` 通过。
- `test/test-client.mjs` 通过（槽位注册、设置页、浮窗、浮层）。
- 动过 Host 数据逻辑：用真实 key 跑 `test/test-host.mjs` 对比字段。
- 动过 `market/index.json`：`npm run validate:index` 通过。
- 视觉改动：刷新 DSH 页面确认，并在交付说明里写清"未验证视觉"的边界。
