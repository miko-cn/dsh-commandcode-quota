# dsh-commandcode-quota

Command Code 用量面板，DeepSeek Harness（DSH）Web UI 插件。

- **设置页**：设置 → Command Code，查看套餐额度、5 小时 / 每周窗口、本期请求统计、套餐档位，并直接管理 API key。
- **桌面浮窗**：一个可拖动的胶囊，实时显示 5 小时 / 每周百分比；点开是紧凑浮层。位置存在浏览器本地，下次打开还在原处。
- 数据与 `cmd` CLI 的 `/usage` 同源；API key 只留在 Host 进程，浏览器只拿整理后的报表。

## 功能

| 区块 | 内容 |
| --- | --- |
| 套餐额度 | 本期剩余 / 总额度、已用百分比、续费日期、额外额度 |
| 用量窗口 | 5 小时 / 每周滚动窗口的已用、上限、重置时刻（实时值优先） |
| 本期请求 | 请求数、成功率、花费、输入 / 输出 token；打开即刷新，此后每分钟自动刷新 |
| 套餐档位 | 按订阅自动识别（Go / GOAT / Pro / Max / Ultra / Teams Pro / Provider），也可在页面上手动指定 |
| API key | 显示 key 是否已配置、来源、是否可写；可在页面里保存 / 清除（写入 DSH 凭据库，不写配置文件） |
| 浮窗开关 | 可随时隐藏 / 恢复桌面浮窗 |

## 架构

| 半 | 作用 |
| --- | --- |
| Host `index.js` | 查找 API key、调用 `/alpha/*` 接口、整理报表；注册同源路由 `GET /dsh-commandcode/api/report`（报表）、`GET/POST /dsh-commandcode/api/key`（key 状态与保存），全部过 DSH 请求门禁 |
| Client `client.js` | 注册 `settings.section`（设置页）、`settings.section.icon`（导航图标）、`shell.overlay`（可拖动浮窗 + 浮层） |

## 数据来源

| 面板内容 | 接口 |
| --- | --- |
| 账号信息 | `GET /alpha/whoami` |
| 额度与 5 小时 / 每周窗口 | `GET /alpha/billing/credits` |
| 套餐档位、计费周期 | `GET /alpha/billing/subscriptions` |
| 本期请求统计 | `GET /alpha/usage/summary?since=<本期开始>` |

## API key 解析顺序

1. 设置页里保存的 key（DSH 凭据库，key 名 `COMMAND_CODE_API_KEY`，优先于环境变量）
2. 环境变量 `COMMAND_CODE_API_KEY`（配置项 `apiKeyEnv` 可改名）
3. 环境变量 `COMMANDCODE_API_KEY`、`COMMAND_API_KEY`
4. `~/.commandcode/auth.json`（`cmd login` 登录后生成）
5. `~/.dsh/.credentials.yaml` 里的 `COMMAND_API_KEY` / `COMMAND_CODE_API_KEY`

所以装了 `cmd` CLI 并登录过、或者 DSH 本身正用 Command Code 作为模型供应商时，通常不需要额外配置；设置页会显示当前 key 的来源。

## 安装

- **npm（推荐）**：

  ```pwsh
  dsh plugin --profile <profile> add @yumiku/dsh-commandcode-quota
  ```

  或用 DSH 会话里的 `plugin_manager`：`install_bundle`，`target` 填 `@yumiku/dsh-commandcode-quota`。
- **npm 尚未发布前**：`install_bundle` 的 `target` 也可以用 GitHub Release 的预构建包
  `https://github.com/miko-cn/dsh-commandcode-quota/releases/latest/download/dsh-commandcode-quota.tgz`。
- 本地联调：把仓库 clone 到本机（如 `D:\Workspace\dsh-commandcode-quota`），`install_bundle` 的 `target` 指向该绝对路径。
- 装好后刷新页面：设置里出现「Command Code」页签，桌面上出现浮窗胶囊。

## 配置

```yaml
- id: commandcode-quota
  name: '@yumiku/dsh-commandcode-quota'
  config:
    apiKey: ''                 # 留空则按上面的顺序自动查找（推荐用设置页写入凭据库）
    apiKeyEnv: COMMAND_CODE_API_KEY
    apiBase: https://api.commandcode.ai
    planOverride: ''           # 默认档位，页面上的手动选择优先生效
    cacheMs: 45000             # Host 侧缓存时长（打开面板时会强制刷新）
    timeoutMs: 12000
```

可用档位 id：`individual-go`、`individual-go-v1`、`individual-goat`、`individual-pro`、`individual-pro-v1`、`individual-max`、`individual-ultra`、`teams-pro`、`individual-provider`。

## 本地验证

```pwsh
node test/test-host.mjs <api-key>   # 真实 key 跑 Host 半：报表 + key 状态
node test/test-client.mjs           # 桩浏览器环境加载 Client 半：槽位注册、设置页、浮窗、浮层
```

## 已知限制

- 逐条请求明细只存在于 Command Code Studio 的登录会话接口（`/internal/usage*`，需要网页 cookie），API key 拿不到，所以面板只做本期汇总。
- `/alpha/*` 是 CLI 内部接口，未在公开文档中承诺稳定性；字段缺失时面板会降级显示而不是报错。

## 发布

- **npm**：`@yumiku/dsh-commandcode-quota`，公开包（`publishConfig.access = public`）。版本号从 `1.0.0` 开始。
- **GitHub CI**：`ci` 工作流在 push / PR 时跑语法检查、manifest（`dsh.bundle` / `./client` / 图标大小）校验、客户端冒烟测试和 `npm pack --dry-run`。
- **Release**：推 `v*` 标签时 `release` 工作流会 `npm pack` 并创建 GitHub Release，资产名固定为 `dsh-commandcode-quota.tgz`（不带版本号，避免 `releases/latest/download/...` 链接随版本失效）。
- **插件市场**：`awesome-dsh-plugin` 用「一个插件一个 YAML」投稿，草稿见 [`marketplace/awesome-dsh-plugin.yml`](marketplace/awesome-dsh-plugin.yml)；仓库创建满 1 天后可提 PR。它与已有的 `fuqiancheng/dsh-commandcode-quota` 功能重叠，评审时突出差异（设置页 + 可拖动浮窗 + 档位选择 + 内置 key 编辑）。
- 截图：市场详情页支持 `screenshots.json`（1–8 张仓库内图片），目前还没有，需要人工在真实页面上截取。

## License

MIT
