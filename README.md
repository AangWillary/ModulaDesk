# WillDesk

一个基于 Tauri 2 + Vue 3 的模块化桌面工作台。将常用工具以可拖拽、可调整大小的卡片形式组织在桌面上。

## 功能

- 可拖拽的网格布局，支持调整大小和自动碰撞推挤
- 插件式模块系统，支持 web 模块和嵌入式窗口
- 内置模块：时钟、文件浏览器、快捷启动、待办事项、终端
- 模块权限系统，按需授权文件、网络、剪贴板等能力
- 布局自动保存和恢复

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3, TypeScript, Pinia, Vite |
| 后端 | Rust, Tauri 2 |
| 测试 | Vitest (前端), cargo test (后端) |
| 代码质量 | ESLint, Prettier, lefthook |

## 架构

```
src/
├── core/       协议层 — 类型定义，零依赖
├── layout/     布局引擎 — 纯算法，无 UI 依赖
├── host/       宿主服务 — 模块实例管理、权限、存储
├── shell/      Shell 状态 — 快捷键、窗口管理
├── stores/     Pinia stores — 仅 UI 状态
├── app/        组装层 — IPC bridge、服务注入、启动流程
├── components/ UI 组件
└── modules/    内置模块实现
```

层级依赖规则由 ESLint `no-restricted-imports` 强制执行。

## 开发

```bash
# 安装依赖
npm install

# 开发模式（需要 Windows，Tauri 依赖 WebKit）
npm run tauri dev

# 前端构建检查
npm run build

# 运行测试
npm test

# 代码检查
npm run lint
npm run format
```

## 添加模块

在 `src/modules/` 下创建目录，实现 `Module` 接口并提供 `manifest.json`：

```typescript
import type { Module, ModuleContext } from "@core/index";

const myModule: Module = {
  async onInit(ctx: ModuleContext) { /* 初始化 */ },
  async onMount(ctx: ModuleContext) { /* 渲染到 ctx.container */ },
  async onUnmount() { /* 清理 */ },
};

export default myModule;
```

模块通过 `ctx.storage` 持久化数据，通过 `ctx.system` 调用文件、网络等系统能力。

## License

MIT
