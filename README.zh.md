# dsh-open-with

从 DeepSeek Harness Web 界面用本机编辑器打开当前已经登记的 Workspace。Session 页头中的紧凑分段按钮可以直接启动首选编辑器，也可以打开完整的编辑器选择菜单；兼容客户端仍然保留 Workspace **…** 菜单入口。

[English](README.md) | 中文

## 演示

[![为 DeepSeek Harness Workspace 选择本机编辑器](https://github.com/ChuanTianML/dsh-open-with/blob/open-with-assets/workspace-editor-chooser.gif?raw=true)](https://github.com/ChuanTianML/dsh-open-with/blob/open-with-assets/workspace-editor-chooser.gif)

上面的录制展示了为兼容性保留的 Workspace 菜单入口。从 `0.2.0` 开始，同一个选择器也可以直接从当前 Session 页头使用。

## 功能

- Session 页头通过 Host 投影的 Workspace `sessionIds` 映射当前会话，不会根据浏览器路径猜测 Workspace。
- Host 会检测 VS Code 系列、Cursor、Windsurf、Zed、Trae、VSCodium、常见 JetBrains IDE、Android Studio、Sublime Text、系统终端和文件管理器；管理员配置可以新增启动目标，也可以覆盖内置项。
- 主操作使用 Host 默认值或当前浏览器记住的编辑器打开 Workspace。点击右侧箭头可以选择其他编辑器；选中的编辑器会启动并成为当前浏览器的首选项。
- 选择“重新检测编辑器”会重新执行 Host 检测，并原子更新所有已经挂载的页头和 Workspace 菜单入口，不需要重启 DSH。
- 配置过但找不到的编辑器会保留为禁用菜单项，并显示修复提示；未安装的自动检测候选不会占用菜单。
- 客户端在 Host 声明 `sidebar.workspaces.row-menu` 时使用原生插槽；客户端尚未提供该插槽时，使用受限兼容适配器。
- 编辑器进程启动后与 DSH Web 服务器分离，可以独立存活。Windows 启动会保留应用的首个可见窗口；子进程不会继承 Host 的 API key、token、密码及其他凭据环境变量。

## 自动检测目标

| 平台 | 自动检测的目标 |
| --- | --- |
| macOS | VS Code、VS Code Insiders、Cursor、Windsurf、Zed、Trae、VSCodium、IntelliJ IDEA、WebStorm、PyCharm、GoLand、CLion、Rider、PhpStorm、RubyMine、DataGrip、RustRover、Android Studio、Sublime Text、终端、Finder |
| Windows | 同一组编辑器应用，以及 Windows Terminal、文件资源管理器 |
| Linux | 同一组编辑器应用，以及 `x-terminal-emulator`、`xdg-open` |

所有平台都会查询 PATH；macOS 和 Windows 还会检查各内置配置中列出的标准应用目录。Windows 还会查询系统 App Paths 注册项和限定范围内的 JetBrains Toolbox apps 目录。Host 插件加载时以及用户选择“重新检测编辑器”时都会执行检测。修改插件配置仍然需要重启 DSH。

## 前置条件

- 至少存在一个可用的内置编辑器或已配置的编辑器可执行文件。
- DSH `0.1.0-rc.5` 或更高版本。较新的运行时可以提供原生 Workspace 行菜单插槽；较早的兼容客户端使用受限适配器。

## 安装

把插件加入 Web profile：

```sh
dsh plugin --profile web add https://github.com/ChuanTianML/dsh-open-with/archive/refs/tags/v0.2.1.tar.gz
```

使用 `SIGTERM` 重启 Web 服务器，等待它退出后刷新页面。切勿使用 `kill -9`，否则可能中断 Session zstd 写入。使用以下命令确认安装版本：

```sh
dsh plugin --profile web list dsh-open-with --depth 0
```

## 配置

所有部署选项都是经过校验的 Cordis 配置字段：

| 键 | 默认值 | 含义 |
| --- | --- | --- |
| `autoDetect` | `true` | 加入当前平台上可用的内置编辑器。 |
| `editors` | `[]` | 新增或覆盖内置项的白名单 `{ id, label, command, args }` 编辑器配置。 |
| `defaultEditor` | `vscode` | 当前浏览器尚未保存选择时使用的首选编辑器 id。 |

示例：

```yaml
- id: dsh-open-with
  name: dsh-open-with
  config:
    defaultEditor: cursor
    editors:
      - id: fleet
        label: Fleet
        command: fleet
        args: []
```

编辑器 id 只能包含小写字母、数字、点、下划线和连字符。重复的自定义 id、空名称和非法 id 会导致插件加载失败。自定义配置与内置项使用相同 id 时会覆盖该内置启动方案，例如可以把 `vscode` 指向 VS Code Insiders，同时命令仍不会发送到浏览器。

## 能力边界

浏览器只能获得编辑器 id、名称、可用状态和修复提示，命令和参数不会经过线协议。打开请求只携带 Workspace id 和编辑器 id；Host 通过 `ctx.workspaceRegistry` 解析 Workspace，并通过已经校验的编辑器白名单解析命令，然后才会启动进程。

编辑器进程会继承打开图形应用所需的桌面和会话变量，但 Host 会移除变量名表明其包含 API key、access token、secret、credential、password、private key、connection string 或 database URL 的环境变量。`SSH_AUTH_SOCK` 只指向用户的 agent socket，并不直接包含凭据，因此会保留。

插件只能打开仍然存在目录的已登记 Workspace。它不会读取、写入、克隆、同步或上传 Workspace 文件，也不注册模型工具、技能、提示词或模型可见事件。启动操作来自用户在 Web 界面中的明确点击，因此不需要 Agent 审批。

首选编辑器保存在当前浏览器中。不同浏览器可以选择不同的默认值，而不改变 Host 配置。

只有 Host 接受启动后才会更新首选项。启动失败不会改变原选择，并会通过浏览器临时提示明确告知用户。在兼容客户端中，键盘导航会临时显示原本只有悬浮时可见的 Workspace 操作按钮。

## 开发

仓库使用相邻的 `../dsh` DeepSeek Harness 源码作为开发期链接依赖。

```sh
pnpm install
pnpm run check
```

`pnpm run check` 会执行类型检查、lint、测试和生产构建。file profile 安装不会自动构建包，因此需要提交 `lib/`。

`src/contract.ts` 中的严格 Typert 描述符由 Host manifest 和客户端 Remote 贡献共用。Host 编辑器注册表负责可执行文件发现和命令隐私，Workspace 注册表负责从 id 解析路径。行菜单插槽声明由 Harness 持有；该声明进入公开客户端包之前，插件使用一个窄类型适配器。

交互约定、安全边界、兼容方案和验证策略详见 [DESIGN.md](DESIGN.md)。

## License

MIT
