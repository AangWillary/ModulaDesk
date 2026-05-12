# WillDesk V2 重构设计

> 单仓库内部分层架构，从原型重构为稳定桌面模块工作台骨架

## 背景

WillDesk（原 ModulaDesk）已完成 Phase 0-5（15 个 commit），但对现有架构不满意：模块系统耦合、工程基础薄弱、Rust 后端分层不清。决定全新重写，保留 Tauri + Vue 技术栈，重新设计架构。

**重构约束：**
1. 不拆 monorepo workspace
2. 不推倒重写——保留现有模块并迁移到新结构
3. commands 层不写业务逻辑，只调用 core/services
4. modules 只能通过 ModuleContext 调用宿主能力
5. layout 不依赖 Vue 组件，布局算法能单独测试
6. permissions 必须是独立层，前后端都要校验
7. 后续如果插件市场成熟，再考虑升级到 workspace 拆包

---

## 1. 架构分层与依赖规则

### 分层结构

```
app/ → all
ui/ → core/, layout/, stores/
modules/ → core/
host/ → core/
layout/ → core/
shell/ → core/, stores/
stores/ → core/
core/ → (none)
```

### 前端目录结构

```
src/
├── core/           # 模块协议、Manifest、Module、ModuleContext、权限类型
├── host/           # 模块管理器、实例管理、事件总线、宿主服务
├── layout/         # 格子布局、碰撞检测、布局持久化
├── shell/          # 命令面板、快捷启动、托盘/快捷键前端状态
├── ui/             # Vue 通用组件：GridEngine、GridCell、ModuleLoader、TopBar
├── modules/        # 内置模块，每个模块独立目录
├── stores/         # Pinia store
└── app/            # 应用入口和组合层
```

### Rust 目录结构

```
src-tauri/src/
├── lib.rs          # 组装：注册命令、插件、窗口初始化
├── main.rs         # 入口
├── commands/       # Tauri invoke 命令入口，只做参数接收和转发
├── core/           # 权限校验、存储、系统能力、窗口控制
├── services/       # 文件、HTTP、进程、剪贴板、系统信息等服务
└── types.rs        # Rust 侧类型定义（与前端 core/ 对应）
```

### 依赖硬约束

| 规则 | 说明 |
|------|------|
| `core/` 不依赖任何其他层 | 纯类型 + 协议定义，零运行时依赖 |
| `modules/` 只依赖 `core/` | 不能 import host/layout/ui/shell/stores |
| `layout/` 只依赖 `core/` | 不依赖 Vue、Pinia，布局算法是纯函数 |
| `host/` 只依赖 `core/` | 不依赖 layout/ui/shell/stores |
| `shell/` 依赖 `core/`、`stores/`（shellStore only） | 不依赖 host/layout/ui/modules |
| `stores/` 只依赖 `core/` | 只存状态，不调用 Tauri/Rust/系统能力 |
| `ui/` 依赖 `core/`、`layout/`、`stores/` | 不直接依赖 host/、modules/、Tauri |
| `app/` 是唯一允许"看见一切"的层 | 负责组装和依赖注入 |

### Path Aliases

```json
{
  "paths": {
    "@core/*": ["src/core/*"],
    "@host/*": ["src/host/*"],
    "@layout/*": ["src/layout/*"],
    "@shell/*": ["src/shell/*"],
    "@ui/*": ["src/ui/*"],
    "@modules/*": ["src/modules/*"],
    "@stores/*": ["src/stores/*"],
    "@app/*": ["src/app/*"]
  }
}
```

### ESLint 分层约束

通过 `no-restricted-imports` 强制依赖边界：
- `core/` 不能 import 其他层
- `modules/` 只能 import `core/`
- `layout/` 只能 import `core/`，不能 import Vue/Pinia
- `host/` 只能 import `core/`，不能 import `@tauri-apps/*`
- `ui/` 不能 import `host/`、`modules/`、`@tauri-apps/*`
- 除 `app/bridge.ts` 外，其他层不能直接 import `@tauri-apps/*`

---

## 2. 模块协议（core/）

`core/` 是整个项目的基础，只放类型、协议、常量，零运行时依赖。

### 目录结构

```
src/core/
├── manifest.ts        # Manifest 类型定义 + 轻量校验纯函数
├── module.ts          # Module 生命周期接口
├── context.ts         # ModuleContext 接口
├── permissions.ts     # 权限类型定义 + 校验逻辑（纯函数）
├── events.ts          # 事件类型定义
├── errors.ts          # 统一错误类型
└── constants.ts       # 常量
```

### 核心类型

```typescript
// manifest.ts
type ModuleType = 'web' | 'native' | 'embedded';

interface Manifest {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  icon: string;
  type: ModuleType;
  grid: GridConstraints;
  permissions: Permission[];
  settings?: Record<string, SettingDefinition>;
}

interface GridConstraints {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  defaultWidth: number;
  defaultHeight: number;
  resizable: boolean;
}
```

```typescript
// module.ts
interface Module {
  onInit?(ctx: ModuleContext): Promise<void>;
  onMount?(ctx: ModuleContext): Promise<void>;
  onUnmount?(): Promise<void>;
  onDestroy?(): Promise<void>;
  onResize?(width: number, height: number): void;
  onSettingsChange?(key: string, value: unknown): void;
  onMessage?(type: string, payload: unknown): void;
}
```

```typescript
// context.ts
interface ModuleContext {
  readonly moduleId: string;
  readonly instanceId: string;
  readonly container: HTMLElement;
  readonly settings: Record<string, unknown>;

  storage: {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
  };

  emit(type: string, payload: unknown): void;
  on(type: string, handler: (payload: unknown) => void): () => void;

  requestPermission(perm: Permission): Promise<boolean>;

  system: SystemAPI;
}
```

```typescript
// permissions.ts
export const PERMISSIONS = [
  'file:read',
  'file:write',
  'network:http',
  'system:clipboard',
  'system:shell',
  'system:process',
  'system:info',
  'automation:run',
] as const;

export type Permission = typeof PERMISSIONS[number];

// 纯函数
function hasPermission(declared: Permission[], required: Permission): boolean;
```

```typescript
// errors.ts
interface AppError {
  code: ErrorCode;
  message: string;
  moduleId?: string;
  instanceId?: string;
  cause?: unknown;
}

type ErrorCode =
  | 'PERMISSION_DENIED'
  | 'PATH_BLOCKED'
  | 'COMMAND_NOT_ALLOWED'
  | 'FILE_NOT_FOUND'
  | 'FILE_READ_ERROR'
  | 'FILE_WRITE_ERROR'
  | 'NETWORK_ERROR'
  | 'PROCESS_ERROR'
  | 'STORAGE_ERROR'
  | 'EMBED_ERROR'
  | 'MODULE_NOT_FOUND'
  | 'MANIFEST_INVALID'
  | 'LIFECYCLE_ERROR'
  | 'IPC_TIMEOUT'
  | 'INTERNAL_ERROR';

// 前端内部用，跨层传递用 AppError
class ModuleError extends Error {
  constructor(
    public moduleId: string,
    public code: ErrorCode,
    message: string,
    public cause?: unknown
  );
}
```

### 设计要点

- `core/` 零运行时依赖：不 import Vue、Tauri、Pinia
- `ModuleContext` 是模块的全部世界：模块只能通过 ctx 调用能力
- `Permission` 用 `as const` + union，不是 enum，便于 JSON 和类型安全
- `AppError` 是 plain object，可序列化，跨 IPC 传递
- `manifest.json` 校验用纯函数 `validateManifestShape`，不引入 Ajv/Zod
- `on()` 返回取消监听函数 `() => void`

---

## 3. 宿主服务（host/）

`host/` 管模块的注册、生命周期、权限校验、事件通信。只依赖 `core/`，通过依赖注入获取系统能力。

### 目录结构

```
src/host/
├── manager.ts         # 模块管理器
├── instance.ts        # 实例管理
├── sandbox.ts         # 权限沙箱
├── event-bus.ts       # 事件总线
├── storage.ts         # 存储服务
├── context-factory.ts # 创建 ModuleContext 实例
└── types.ts           # host 层类型定义
```

### 依赖注入接口

```typescript
// host/ 不直接调用 Tauri，通过接口注入
interface HostRuntime {
  storageRead(instanceId: string, key: string): Promise<unknown>;
  storageWrite(instanceId: string, key: string, value: unknown): Promise<void>;
  storageDelete(instanceId: string, key: string): Promise<void>;
}

interface PermissionPrompt {
  request(input: PermissionRequest): Promise<boolean>;
}

interface HostDependencies {
  runtime: HostRuntime;
  permissionPrompt: PermissionPrompt;
  logger?: HostLogger;
}
```

由 `app/` 实现这些接口并注入给 `host/`。

### 模块管理器（manager.ts）

```typescript
interface ModuleManager {
  register(manifest: Manifest, factory: ModuleFactory): void;
  unregister(moduleId: string): void;
  list(): Manifest[];
  get(moduleId: string): { manifest: Manifest; factory: ModuleFactory } | undefined;
}

type ModuleFactory = () => Promise<Module>;
```

只管"有哪些模块可用"，不管"哪个格子放了哪个模块"。

### 实例管理（instance.ts）

```typescript
interface ModuleInstanceManager {
  create(moduleId: string, options: CreateModuleInstanceOptions): Promise<ModuleInstance>;
  destroy(instanceId: string): Promise<void>;
  suspend(instanceId: string): void;
  resume(instanceId: string): void;
  list(): ModuleInstance[];
}

interface CreateModuleInstanceOptions {
  instanceId?: string;
  settings?: Record<string, unknown>;
  container: HTMLElement;
}

interface ModuleInstance {
  instanceId: string;
  moduleId: string;
  status: ModuleInstanceStatus;
  module: Module;
  ctx: ModuleContext;
}

type ModuleInstanceStatus =
  | 'created'
  | 'initializing'
  | 'initialized'
  | 'mounting'
  | 'mounted'
  | 'suspended'
  | 'unmounting'
  | 'destroyed'
  | 'error';
```

不接收 `gridCellId`，避免 host 知道 layout 概念。

### 权限沙箱（sandbox.ts）

```typescript
interface PermissionChecker {
  check(instanceId: string, required: Permission): boolean;
  request(instanceId: string, perm: Permission): Promise<boolean>;
  getGranted(instanceId: string): Permission[];
}
```

以 `instanceId` 为主体，同一模块不同实例可有不同权限。

### 事件总线（event-bus.ts）

```typescript
interface EventBus {
  emit(event: ModuleEvent): void;
  on(type: string, handler: EventHandler, options?: { target?: string }): () => void;
}

interface ModuleEvent {
  type: string;
  payload: unknown;
  sourceInstanceId: string;
  targetInstanceId?: string;
}

type EventHandler = (event: ModuleEvent) => void;
```

事件包含 `sourceInstanceId` / `targetInstanceId`，支持作用域。

### 存储服务（storage.ts）

```typescript
interface ModuleStorage {
  get<T>(instanceId: string, key: string): Promise<T | undefined>;
  set<T>(instanceId: string, key: string, value: T): Promise<void>;
  delete(instanceId: string, key: string): Promise<void>;
  list(instanceId: string): Promise<string[]>;
}
```

以 `instanceId` 命名空间，两个 Todo 模块实例可有不同数据。

---

## 4. 布局引擎（layout/）

`layout/` 只依赖 `core/`，不依赖 Vue、Pinia、host。布局算法是纯函数，可独立测试。

### 目录结构

```
src/layout/
├── types.ts           # 布局类型定义
├── grid.ts            # 格子数学：像素↔格子坐标转换
├── collision.ts       # 碰撞检测
├── push.ts            # 推挤算法
├── persistence.ts     # 布局序列化/反序列化
├── compact.ts         # 布局压缩/规范化
└── engine.ts          # 布局引擎：轻量状态封装
```

### 核心类型

```typescript
interface Layout {
  version: number;
  id: string;
  name?: string;
  columns: number;
  rowHeight: number;
  gap: number;
  items: LayoutItem[];
}

interface LayoutItem {
  instanceId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  locked?: boolean;
}

type LayoutErrorCode =
  | 'ITEM_NOT_FOUND'
  | 'ITEM_LOCKED'
  | 'COLLISION_UNRESOLVED'
  | 'OUT_OF_BOUNDS'
  | 'INVALID_SIZE'
  | 'INVALID_LAYOUT'
  | 'DESERIALIZE_FAILED'
  | 'NO_SPACE';

type LayoutResult =
  | { ok: true; layout: Layout }
  | { ok: false; code: LayoutErrorCode; message: string; layout?: Layout };

interface SerializedLayout {
  version: number;
  savedAt: string;
  layout: Layout;
}
```

### 纯函数模块

**grid.ts** — 坐标转换需要显式传 `containerWidth`：
```typescript
function pixelToGrid(px: number, py: number, layout: Layout, containerWidth: number): { col: number; row: number };
function gridToPixel(col: number, row: number, layout: Layout, containerWidth: number): { x: number; y: number };
function columnWidth(containerWidth: number, layout: Layout): number;
function findEmptyPosition(layout: Layout, w: number, h: number): { x: number; y: number } | null;
```

**collision.ts：**
```typescript
function overlaps(a: LayoutItem, b: LayoutItem): boolean;
function collides(items: LayoutItem[], target: LayoutItem, excludeId?: string): boolean;
function validateLayout(items: LayoutItem[]): boolean;  // 完整校验：非负整数、min/max、bounds、唯一性
```

**push.ts：**
```typescript
function pushItems(items: LayoutItem[], movedId: string, newX: number, newY: number): LayoutResult;
function pushOnResize(items: LayoutItem[], resizedId: string, newW: number, newH: number): LayoutResult;
```

推挤规则：
- locked item 不可被推挤
- 推挤路径遇到 locked item 则操作失败回退
- 优先向下推，推不动则回退

**persistence.ts：**
```typescript
function serializeLayout(layout: Layout): SerializedLayout;
function deserializeLayout(json: string): LayoutResult;  // 支持旧版本迁移、损坏 JSON 容错
```

**compact.ts：**
```typescript
function compactLayout(layout: Layout): Layout;
function normalizeLayout(layout: Layout): LayoutResult;
```

### 布局引擎（engine.ts）— 轻量状态封装

```typescript
interface LayoutEngine {
  getLayout(): Layout;
  getItem(instanceId: string): LayoutItem | undefined;
  addItem(item: Omit<LayoutItem, 'x' | 'y'>): LayoutResult;  // 自动找空位、校验尺寸约束
  removeItem(instanceId: string): Layout;
  moveItem(instanceId: string, x: number, y: number): LayoutResult;
  resizeItem(instanceId: string, w: number, h: number): LayoutResult;
  save(): SerializedLayout;
  load(data: SerializedLayout): LayoutResult;
  onChange(handler: (layout: Layout) => void): () => void;
}
```

`engine.ts` 是状态封装，底层 `grid/collision/push/persistence/compact` 是纯函数。两层都需测试。

---

## 5. Rust 后端分层

`commands/` 只做参数转发，不写业务逻辑。`core/` 管权限和存储引擎。`services/` 封装系统能力。

### 目录结构

```
src-tauri/src/
├── lib.rs              # 组装：注册命令、插件、窗口初始化
├── main.rs             # 入口
├── types.rs            # 类型定义（与前端 core/ 对应）
├── commands/           # Tauri invoke 命令入口
│   ├── mod.rs
│   ├── module_cmd.rs
│   ├── storage_cmd.rs
│   ├── file_cmd.rs
│   ├── system_cmd.rs
│   ├── window_cmd.rs
│   └── embed_cmd.rs
├── core/               # 核心业务逻辑
│   ├── mod.rs
│   ├── permissions.rs
│   ├── sandbox.rs
│   ├── storage.rs
│   └── window.rs
└── services/           # 系统能力封装
    ├── mod.rs
    ├── file_service.rs
    ├── http_service.rs
    ├── process_service.rs
    ├── clipboard_service.rs
    └── embed_service.rs
```

### 分层规则

```
commands/  → 只调用 core/ 和 services/
core/      → 不调用 commands/，可调用 services/
services/  → 不调用 commands/ 或 core/
types.rs   → 被所有层引用
```

### CommandContext — 调用来源标识

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandContext {
    pub module_id: String,
    pub instance_id: String,
    pub request_id: Option<String>,
}
```

所有高风险命令必须携带 `CommandContext`。

### 命令示例

```rust
#[tauri::command]
pub async fn read_file(
    ctx: CommandContext,
    path: String,
    state: State<'_, AppState>,
) -> Result<String, AppError> {
    state.permissions.check(&ctx.instance_id, Permission::FileRead)?;
    let safe_path = state.sandbox.validate_existing_path(&path)?;
    state.file_service.read(&safe_path).await
}
```

权限校验顺序：CommandContext → instance 权限 → 路径/命令沙箱 → service → 返回

### services/ 接受 PathBuf

```rust
pub struct FileService;
impl FileService {
    pub async fn read(&self, path: &Path) -> Result<String, AppError>;
    pub async fn write(&self, path: &Path, content: &str) -> Result<(), AppError>;
    pub async fn read_dir(&self, path: &Path) -> Result<Vec<DirEntry>, AppError>;
    pub async fn rename(&self, from: &Path, to: &Path) -> Result<(), AppError>;
    pub async fn delete(&self, path: &Path) -> Result<(), AppError>;
}
```

### core/ — 权限与沙箱

```rust
// permissions.rs
pub struct PermissionChecker {
    granted: HashMap<String, Vec<Permission>>,  // instanceId -> permissions
}
impl PermissionChecker {
    pub fn check(&self, instance_id: &str, perm: Permission) -> Result<(), AppError>;
    pub fn grant(&mut self, instance_id: &str, perm: Permission);
    pub fn revoke(&mut self, instance_id: &str, perm: Permission);
}

// sandbox.rs
pub struct Sandbox {
    allowed_dirs: Vec<PathBuf>,
    blocked_dirs: Vec<PathBuf>,    // .ssh, .gnupg, browser data, etc.
    allowed_commands: Vec<String>,
}
impl Sandbox {
    pub fn validate_existing_path(&self, path: &str) -> Result<PathBuf, AppError>;
    pub fn validate_write_path(&self, path: &str) -> Result<PathBuf, AppError>;
    pub fn validate_command(&self, command: &str) -> Result<(), AppError>;
}

// storage.rs — key 防路径穿越
pub struct StorageEngine {
    base_dir: PathBuf,
}
impl StorageEngine {
    // instance_id 只能是 UUID 或安全 slug
    // key 只能是 [a-zA-Z0-9._-]，禁止 ../ 和路径分隔符
    pub fn get(&self, instance_id: &str, key: &str) -> Result<Option<JsonValue>, AppError>;
    pub fn set(&self, instance_id: &str, key: &str, value: &JsonValue) -> Result<(), AppError>;
    pub fn delete(&self, instance_id: &str, key: &str) -> Result<(), AppError>;
}
```

### ProcessService 安全限制

- 默认禁止 shell=true
- 默认禁止任意命令
- 命令必须走白名单（executable path + args + working dir）
- timeout、stdout/stderr 大小限制
- 环境变量白名单

### HttpService SSRF 防护

- 禁止 localhost / 127.0.0.1 / ::1
- 禁止私有网段、link-local
- 禁止 file:// / ftp:// 等非 http(s)
- 检查 redirect 后的目标地址
- timeout、max response size、allowed methods

### AppState

```rust
pub struct AppState {
    pub permissions: RwLock<PermissionChecker>,
    pub sandbox: Arc<Sandbox>,
    pub storage: Arc<StorageEngine>,
    pub file_service: Arc<FileService>,
    pub http_service: Arc<HttpService>,
    pub process_service: Arc<ProcessService>,
    pub clipboard_service: Arc<ClipboardService>,
    pub embed_service: Arc<EmbedService>,
}
```

- 用 `RwLock`（读多写少），不用 `Mutex`
- 锁只用于同步内存状态，不允许持锁期间 await
- 服务用 `Arc<T>` 支持多命令并发

### 错误类型

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: ErrorCode,
    pub message: String,
    pub module_id: Option<String>,
    pub instance_id: Option<String>,
    pub cause: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    PermissionDenied,
    PathBlocked,
    CommandNotAllowed,
    FileNotFound,
    FileReadError,
    FileWriteError,
    NetworkError,
    ProcessError,
    StorageError,
    EmbedError,
    ModuleNotFound,
    ManifestInvalid,
    LifecycleError,
    IpcTimeout,
    InternalError,
}
```

前后端 ErrorCode、Permission、Manifest 变更时必须同步，并加测试验证序列化一致性。

---

## 6. Shell 层 + 前端集成

### shell/ — 前端状态管理

```
src/shell/
├── types.ts
├── shortcuts.ts       # 快捷键配置和 action 路由
├── tray.ts            # 托盘状态
└── state.ts           # 窗口可见性状态
```

shell/ 不直接调 Tauri，只管配置和 action handler。实际注册由 `app/bridge.ts` 同步到 Rust。Rust 触发快捷键事件后，由 `app/bridge` 转发给 shell router。

```typescript
// types.ts
interface ShortcutConfig {
  toggleVisibility: string;
  addModule: string;
  lockLayout: string;
  settings: string;
}

// state.ts — 状态和副作用分开
interface ShellState {
  visible: boolean;
}

// 由 app/ 实现
interface ShellFacade {
  show(): Promise<void>;
  hide(): Promise<void>;
  toggle(): Promise<void>;
  lockLayout(locked: boolean): Promise<void>;
}
```

### app/ — 组装层

```
src/app/
├── main.ts            # Vue 应用入口
├── providers.ts       # 创建 AppServices facade
├── startup.ts         # 启动流程
├── bridge.ts          # Tauri invoke/listen 封装
└── prompt-service.ts  # 权限弹窗 Promise 化
```

### AppServices — UI 注入的 facade

```typescript
interface AppServices {
  modules: {
    listAvailable(): Manifest[];
    createInstance(moduleId: string, container: HTMLElement): Promise<ModuleInstance>;
    destroyInstance(instanceId: string): Promise<void>;
    reloadInstance(instanceId: string): Promise<void>;
  };
  layout: {
    addModule(moduleId: string): Promise<void>;
    moveItem(instanceId: string, x: number, y: number): Promise<void>;
    resizeItem(instanceId: string, w: number, h: number): Promise<void>;
    save(): Promise<void>;
  };
  shell: ShellFacade;
}
```

`ui/` 通过 `inject<AppServices>('appServices')` 获取能力，不接触 `HostDependencies`。

### providers.ts — 依赖注入

```typescript
function createHostRuntime(): HostRuntime {
  return {
    storageRead: (instanceId, key) => invoke('storage_read', { instanceId, key }),
    storageWrite: (instanceId, key, value) => invoke('storage_write', { instanceId, key, value }),
    storageDelete: (instanceId, key) => invoke('storage_delete', { instanceId, key }),
  };
}

function createPermissionPrompt(): PermissionPrompt {
  // 通过 prompt-service + Dialog resolver 实现
  return { request: (input) => permissionPromptService.request(input) };
}

function createAppServices(): AppServices {
  // 组装 host/layout/shell，注入到 AppServices facade
}
```

### startup.ts — 两阶段启动

```
阶段 1（Vue 渲染前）：
  1. 读取 layout.json → 反序列化 → LayoutEngine.load()
  2. 扫描 modules/ → 解析 manifest → ModuleManager.register()
  3. 初始化 stores

阶段 2（Vue 渲染后，GridCell mount 后）：
  4. GridCell/ModuleLoader mount → 创建 ModuleInstance（此时 container 可用）
  5. 注册全局快捷键（通过 bridge 同步到 Rust）
  6. 初始化系统托盘
```

### stores/ — 职责收窄

```
src/stores/
├── layout.ts          # 布局 UI 状态（选中的格子、拖拽状态）
├── modules.ts         # 可用模块列表（UI 展示用）
├── settings.ts        # 全局设置
└── shell.ts           # 窗口可见性、快捷键配置
```

硬约束：
- stores 不调用 Tauri invoke
- stores 不放业务逻辑
- stores 只存可序列化状态
- stores 可被 ui/shell/app 读写，layout/ 和 host/ 不读写 stores

---

## 7. 类型安全与 IPC 协议

### bridge.ts — 统一 IPC 入口

所有 Tauri invoke 调用都经过 `app/bridge.ts`，其他层不直接 import `@tauri-apps/api`。

```typescript
const IPC_COMMANDS = {
  MODULE_LIST: 'module_list',
  MODULE_LOAD: 'module_load',
  STORAGE_READ: 'storage_read',
  STORAGE_WRITE: 'storage_write',
  FILE_READ: 'file_read',
  FILE_WRITE: 'file_write',
  FILE_READ_DIR: 'file_read_dir',
  FILE_OPEN_PATH: 'file_open_path',
  SYSTEM_INFO: 'system_info',
  CLIPBOARD_READ: 'clipboard_read',
  CLIPBOARD_WRITE: 'clipboard_write',
  HTTP_GET: 'http_get',
  EXEC_COMMAND: 'exec_command',
  WINDOW_SET_BOTTOM: 'window_set_bottom',
  WINDOW_SET_CLICK_THROUGH: 'window_set_click_through',
  WINDOW_LIST: 'window_list',
  WINDOW_EMBED: 'window_embed',
  WINDOW_RESIZE_EMBEDDED: 'window_resize_embedded',
  WINDOW_DETACH: 'window_detach',
} as const;
```

### CommandContext — 前端自动生成

```typescript
function createCommandContext(moduleId: string, instanceId: string): CommandContext {
  return { moduleId, instanceId, requestId: crypto.randomUUID() };
}
```

### IPC 调用约定

- 所有模块能力命令都带 `CommandContext`（file/http/clipboard/process/embed/system-info）
- 宿主 app 能力（`appSystem`/`shell`）与模块能力分开
- `bridge.listen` 返回 `Promise<() => void>`（unlisten 函数）

### 错误解析

```typescript
function isAppError(err: unknown): err is AppError {
  return typeof err === 'object' && err !== null && 'code' in err;
}

function parseAppError(err: unknown): AppError {
  if (isAppError(err)) return err;
  if (typeof err === 'string') return { code: 'INTERNAL_ERROR', message: err };
  return { code: 'INTERNAL_ERROR', message: 'Unknown IPC error', cause: String(err) };
}
```

### 类型同步策略

- 手动维护前端 `types.ts` 和 Rust `types.rs`
- 添加单测：验证前后端 ErrorCode/Permission 序列化值一致
- `core/types.ts` 头部加注释提醒同步
- 后续考虑引入 `ts-rs` 或 `specta` 自动生成

---

## 8. 测试策略

务实 TDD：核心逻辑先写测试，UI 不要求全量覆盖。

### 测试分层

```
前端：
├── src/core/__tests__/        # 单元测试
├── src/layout/__tests__/      # 单元测试
├── src/host/__tests__/        # 单元测试
├── src/modules/__tests__/     # 单元测试
└── src/app/__tests__/         # 集成测试

Rust：
└── src-tauri/src/             # 文件内 #[cfg(test)] mod tests
└── src-tauri/tests/           # 集成测试
```

### 必须先测试的模块

| 模块 | 测试重点 |
|------|---------|
| `layout/collision.ts` | 重叠检测、边界贴合 |
| `layout/push.ts` | 推挤传播、回退、不丢 item、locked item 失败回退 |
| `layout/grid.ts` | 坐标转换精度、边界值 |
| `layout/persistence.ts` | 序列化往返、旧版本迁移、损坏 JSON 容错 |
| `core/permissions.ts` | hasPermission 纯函数 |
| `core/manifest.ts` | validateManifestShape |
| `app/bridge.ts` | parseAppError、createCommandContext、listen unlisten |
| Rust sandbox | 路径穿越、blocked dirs、写入不存在文件时父目录校验 |
| Rust permissions | 权限检查 |
| Rust process | 禁止 shell=true、限制 args、timeout、输出大小 |
| Rust http | 禁止 localhost/private IP、禁止非 http(s)、检查 redirect 后地址 |

### 不要求 TDD

| 模块 | 理由 |
|------|------|
| `ui/*.vue` | 变化快，先手动验证 |
| `app/main.ts` | 组装层，依赖多 |
| `services/embed_service.rs` | Win32 API，依赖系统环境 |

### 测试工具

| 层 | 工具 |
|---|------|
| 前端单元 | Vitest + happy-dom |
| 前端集成 | Vitest + mock bridge |
| Rust 单元 | cargo test（文件内） |
| Rust 集成 | cargo test + tempdir |

### 覆盖率目标

| 层 | 目标 |
|---|------|
| `core/` | 90%+ |
| `layout/` | 90%+ |
| `host/` | 80%+ |
| `commands/` (Rust) | 80%+（安全相关） |
| `ui/` | 不要求 |

---

## 9. 代码质量自动化

### 工具链

| 工具 | 用途 | 范围 |
|------|------|------|
| ESLint | 代码规范 + 分层依赖约束 | `src/` |
| Prettier | 格式化 | `src/` |
| TypeScript strict | 类型检查 | `src/` |
| cargo fmt | Rust 格式化 | `src-tauri/` |
| cargo clippy | Rust lint | `src-tauri/` |
| Vitest | 前端测试 | `src/**/__tests__/` |
| cargo test | Rust 测试 | `src-tauri/` |

### pre-commit hooks

使用 lefthook 管理：

```yaml
# lefthook.yml
pre-commit:
  commands:
    eslint:
      glob: "*.{ts,vue}"
      run: npx eslint --fix {staged_files} && git add {staged_files}
    prettier:
      glob: "*.{ts,vue,json,css}"
      run: npx prettier --write {staged_files} && git add {staged_files}
    rust-fmt:
      run: cargo fmt --manifest-path src-tauri/Cargo.toml --check
```

Rust fmt 用 `cargo fmt` 项目级检查，不走 lint-staged 单文件。

### NPM scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write src/",
    "format:check": "prettier --check src/",
    "type-check": "vue-tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "tauri:dev:win": "scripts\\tauri-dev-win.cmd",
    "rust:fmt": "cargo fmt --manifest-path src-tauri/Cargo.toml",
    "rust:clippy": "cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings",
    "rust:test": "cargo test --manifest-path src-tauri/Cargo.toml",
    "doctor": "node scripts/doctor.mjs"
  }
}
```

### CI 流程（后续启用）

```yaml
steps:
  - npm ci
  - npm run lint
  - npm run type-check
  - npm run test
  - npm run rust:fmt -- --check
  - npm run rust:clippy
  - npm run rust:test
```

---

## 附录：模块迁移计划

现有 6 个内置模块迁移到新结构：

| 模块 | 类型 | 迁移要点 |
|------|------|---------|
| clock | web | 参考模板，迁移 manifest + index.ts |
| todo | web | 存储改用 instanceId 命名空间 |
| file-explorer | web | 文件操作改用 ModuleContext.system |
| quick-launch | web | 存储改用 instanceId 命名空间 |
| terminal | embedded | embed 操作改用 CommandContext |
| test-module | web | 生命周期测试模块 |

---

*设计完成日期：2026-05-11*
