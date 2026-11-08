# dsh-commandcode-quota

Command Code 用量面板，DeepSeek Harness（DSH）Web UI 插件。在侧边栏底部（设置按钮旁）加一个按钮，点开即可查看：

- **套餐额度**：本期剩余 / 总额度、已用百分比、续费日期
- **用量窗口**：5 小时窗口、每周窗口的已用 / 上限与重置时刻（Command Code 的滚动窗口）
- **本期请求**：请求数、成功率、花费、输入 / 输出 token
- **套餐档位**：按账号订阅自动识别，也可在配置里指定
- **额外额度**：按量购买的额度与赠送额度
- 一键跳转 Command Code Studio 的用量页

数据来自 Command Code 自己的接口（与 `cmd` CLI 的 `/usage` 同源）。API key 只留在 Host 进程里，浏览器只拿到整理后的报表。

## 架构

| 半 | 作用 |
| --- | --- |
| Host `index.js` | 查找 API key、调用 `/alpha/*` 接口、整理报表、注册 `GET /dsh-commandcode/api/report`（同源 + DSH 请求门禁） |
| Client `client.js` | 注册 `sidebar.footer.action` 按钮与 `shell.overlay` 浮层面板，只读上面的报表 |

## 数据来源

| 面板内容 | 接口 |
| --- | --- |
| 账号信息 | `GET /alpha/whoami` |
| 额度与 5 小时 / 每周窗口 | `GET /alpha/billing/credits` |
| 套餐档位、计费周期 | `GET /alpha/billing/subscriptions` |
| 本期请求统计 | `GET /alpha/usage/summary?since=<本期开始>` |

## API key 解析顺序

1. 插件配置 `apiKey`
2. 环境变量 `COMMAND_CODE_API_KEY`（配置项 `apiKeyEnv` 可改名）
3. 环境变量 `COMMANDCODE_API_KEY`、`COMMAND_API_KEY`
4. `~/.commandcode/auth.json`（`cmd login` 登录后生成）
5. `~/.dsh/.credentials.yaml` 里的 `COMMAND_API_KEY` / `COMMAND_CODE_API_KEY`

装了 `cmd` CLI 并登录过、或者 DSH 本身正用 Command Code 作为模型供应商时，通常不需要额外配置。

## 安装

DSH 里用 `plugin_manager` 的 `install_bundle` 安装本目录，例如：

- 本仓库 `git clone` 到 `D:\Workspace\dsh-commandcode-quota`
- 在 DSH 会话里让 agent 执行 `plugin_manager install_bundle`，`target` 指向该绝对路径
- 重新加载页面，侧栏底部出现「Command Code 用量」按钮

## 配置

```yaml
- id: commandcode-quota
  name: '@local/commandcode-quota'
  config:
    apiKey: ''                 # 留空则按上面的顺序自动查找
    apiKeyEnv: COMMAND_CODE_API_KEY
    apiBase: https://api.commandcode.ai
    planOverride: ''           # 指定套餐档位，如 individual-goat；留空按订阅自动识别
    cacheMs: 45000             # Host 侧缓存时长，避免频繁打接口
    timeoutMs: 12000
```

可用档位 id：`individual-go`、`individual-go-v1`、`individual-goat`、`individual-pro`、`individual-pro-v1`、`individual-max`、`individual-ultra`、`teams-pro`、`individual-provider`。

## 本地验证

```pwsh
node test/test-host.mjs <api-key>   # 用真实 key 跑一遍 Host 半，打印整理后的报表
node test/test-client.mjs           # 用桩浏览器环境加载 Client 半，校验槽位注册与渲染内容
```

## 已知限制

- 逐条请求明细只存在于 Command Code Studio 的登录会话接口（`/internal/usage*`，需要网页 cookie），API key 拿不到，所以面板只做本期汇总。
- `/alpha/*` 是 CLI 内部接口，未在公开文档中承诺稳定性；字段缺失时面板会降级显示而不是报错。

## License

MIT
