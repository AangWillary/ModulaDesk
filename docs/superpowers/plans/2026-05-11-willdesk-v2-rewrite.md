# WillDesk V2 Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor WillDesk from a monolithic structure to a layered architecture with clear boundaries: core/ protocol → host/ services → layout/ engine → shell/ state → app/ assembly → ui/ components → modules/.

**Architecture:** Single Tauri project with internal directory boundaries enforced by path aliases and ESLint. core/ is zero-dependency types. layout/ is pure functions. host/ receives system capabilities via dependency injection. app/ is the only assembly layer. Rust backend mirrors the layering with commands/ → core/ + services/.

**Tech Stack:** Vue 3 + TypeScript + Pinia + Vite (frontend), Rust + Tauri 2.x (backend), Vitest (frontend tests), cargo test (Rust tests), ESLint + Prettier + lefthook (quality).

**Design Spec:** `docs/superpowers/specs/2026-05-11-moduladesk-v2-rewrite-design.md`

---

## Phase 0: Project Setup & Tooling

### Task 0.1: Rename project from ModulaDesk to WillDesk

**Files:**
- Modify: `package.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Update package.json**

```json
{
  "name": "willdesk",
  "version": "0.2.0"
}
```

- [ ] **Step 2: Update Cargo.toml**

Change `name = "moduladesk"` to `name = "willdesk"` and `name = "moduladesk_lib"` to `name = "willdesk_lib"`.

- [ ] **Step 3: Update tauri.conf.json**

Change `"title"` to `"WillDesk"` and `"identifier"` to `"com.judy.willdesk"`.

- [ ] **Step 4: Update lib.rs import**

If `lib.rs` references `moduladesk_lib` anywhere, update to `willdesk_lib`.

- [ ] **Step 5: Verify build compiles**

Run: `npm run tauri dev` (or `cargo tauri dev`)
Expected: App launches with "WillDesk" title

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: rename project from ModulaDesk to WillDesk"
```

---

### Task 0.2: Set up path aliases

**Files:**
- Modify: `tsconfig.json`
- Modify: `vite.config.ts`

- [ ] **Step 1: Add paths to tsconfig.json**

Add `baseUrl` and `paths` to `compilerOptions`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
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
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 2: Add alias resolution to vite.config.ts**

```typescript
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "src/core"),
      "@host": path.resolve(__dirname, "src/host"),
      "@layout": path.resolve(__dirname, "src/layout"),
      "@shell": path.resolve(__dirname, "src/shell"),
      "@ui": path.resolve(__dirname, "src/ui"),
      "@modules": path.resolve(__dirname, "src/modules"),
      "@stores": path.resolve(__dirname, "src/stores"),
      "@app": path.resolve(__dirname, "src/app"),
    },
  },
  // ... rest of existing config
});
```

- [ ] **Step 3: Verify build still works**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json vite.config.ts
git commit -m "feat: add path aliases for layered architecture"
```

---

### Task 0.3: Configure ESLint with layer constraints

**Files:**
- Modify: `eslint.config.js`

- [ ] **Step 1: Update eslint.config.js**

```javascript
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  prettier,
  {
    files: ["src/**/*.{ts,vue}"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    ignores: ["dist/", "node_modules/", "src-tauri/"],
  },
  // Layer constraint: core/ cannot import other layers
  {
    files: ["src/core/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@host/*",
                "@layout/*",
                "@ui/*",
                "@modules/*",
                "@stores/*",
                "@app/*",
              ],
              message: "core/ cannot depend on other layers",
            },
            {
              group: ["vue", "pinia", "@tauri-apps/*"],
              message: "core/ cannot import runtime dependencies",
            },
          ],
        },
      ],
    },
  },
  // Layer constraint: modules/ only depends on core/
  {
    files: ["src/modules/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@host/*",
                "@layout/*",
                "@ui/*",
                "@shell/*",
                "@stores/*",
                "@app/*",
              ],
              message: "modules/ can only depend on core/",
            },
          ],
        },
      ],
    },
  },
  // Layer constraint: layout/ only depends on core/
  {
    files: ["src/layout/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@host/*",
                "@ui/*",
                "@shell/*",
                "@modules/*",
                "@stores/*",
                "@app/*",
              ],
              message: "layout/ can only depend on core/",
            },
            {
              group: ["vue", "pinia", "@tauri-apps/*"],
              message: "layout/ cannot import Vue/Pinia/Tauri",
            },
          ],
        },
      ],
    },
  },
  // Layer constraint: host/ only depends on core/
  {
    files: ["src/host/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@layout/*",
                "@ui/*",
                "@shell/*",
                "@modules/*",
                "@stores/*",
                "@app/*",
              ],
              message: "host/ can only depend on core/",
            },
            {
              group: ["@tauri-apps/*"],
              message: "host/ cannot import Tauri directly, use injected HostRuntime",
            },
          ],
        },
      ],
    },
  },
  // Layer constraint: ui/ cannot depend on host/, modules/, or Tauri
  {
    files: ["src/ui/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@host/*", "@modules/*"],
              message: "ui/ cannot depend on host/ or modules/",
            },
            {
              group: ["@tauri-apps/*"],
              message: "ui/ cannot import Tauri directly, use app/bridge",
            },
          ],
        },
      ],
    },
  },
  // Layer constraint: only app/bridge.ts can import Tauri
  {
    files: ["src/**/*.{ts,vue}"],
    ignores: ["src/app/bridge.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@tauri-apps/*"],
              message: "Must use @app/bridge to call Tauri",
            },
          ],
        },
      ],
    },
  },
];
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: No errors (existing code may need fixes)

- [ ] **Step 3: Commit**

```bash
git add eslint.config.js
git commit -m "feat: add ESLint layer constraints for architecture boundaries"
```

---

### Task 0.4: Set up Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest happy-dom
```

- [ ] **Step 2: Add test scripts to package.json**

Add to `scripts`:
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "src/core"),
      "@host": path.resolve(__dirname, "src/host"),
      "@layout": path.resolve(__dirname, "src/layout"),
      "@shell": path.resolve(__dirname, "src/shell"),
      "@ui": path.resolve(__dirname, "src/ui"),
      "@modules": path.resolve(__dirname, "src/modules"),
      "@stores": path.resolve(__dirname, "src/stores"),
      "@app": path.resolve(__dirname, "src/app"),
    },
  },
});
```

- [ ] **Step 4: Verify test runner works**

Create a placeholder test:
```bash
mkdir -p src/core/__tests__
```

Create `src/core/__tests__/placeholder.test.ts`:
```typescript
import { describe, it, expect } from "vitest";

describe("placeholder", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
```

Run: `npm test`
Expected: 1 test passes

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.ts src/core/__tests__/placeholder.test.ts
git commit -m "chore: set up Vitest for frontend testing"
```

---

## Phase 1: core/ Protocol Layer

### Task 1.1: Create core/permissions.ts with tests

**Files:**
- Create: `src/core/permissions.ts`
- Create: `src/core/__tests__/permissions.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/core/__tests__/permissions.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { PERMISSIONS, hasPermission } from "../permissions";
import type { Permission } from "../permissions";

describe("PERMISSIONS", () => {
  it("should contain expected permissions", () => {
    expect(PERMISSIONS).toContain("file:read");
    expect(PERMISSIONS).toContain("file:write");
    expect(PERMISSIONS).toContain("network:http");
    expect(PERMISSIONS).toContain("system:clipboard");
    expect(PERMISSIONS).toContain("system:shell");
    expect(PERMISSIONS).toContain("system:process");
    expect(PERMISSIONS).toContain("system:info");
    expect(PERMISSIONS).toContain("automation:run");
  });
});

describe("hasPermission", () => {
  it("should return true when permission is declared", () => {
    const declared: Permission[] = ["file:read", "file:write"];
    expect(hasPermission(declared, "file:read")).toBe(true);
  });

  it("should return false when permission is not declared", () => {
    const declared: Permission[] = ["file:read"];
    expect(hasPermission(declared, "file:write")).toBe(false);
  });

  it("should return false for empty declared list", () => {
    expect(hasPermission([], "file:read")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/core/__tests__/permissions.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement core/permissions.ts**

```typescript
export const PERMISSIONS = [
  "file:read",
  "file:write",
  "network:http",
  "system:clipboard",
  "system:shell",
  "system:process",
  "system:info",
  "automation:run",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function hasPermission(
  declared: Permission[],
  required: Permission,
): boolean {
  return declared.includes(required);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/core/__tests__/permissions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/permissions.ts src/core/__tests__/permissions.test.ts
git commit -m "feat(core): add permissions types and hasPermission pure function"
```

---

### Task 1.2: Create core/errors.ts

**Files:**
- Create: `src/core/errors.ts`

- [ ] **Step 1: Implement core/errors.ts**

```typescript
export type ErrorCode =
  | "PERMISSION_DENIED"
  | "PATH_BLOCKED"
  | "COMMAND_NOT_ALLOWED"
  | "FILE_NOT_FOUND"
  | "FILE_READ_ERROR"
  | "FILE_WRITE_ERROR"
  | "NETWORK_ERROR"
  | "PROCESS_ERROR"
  | "STORAGE_ERROR"
  | "EMBED_ERROR"
  | "MODULE_NOT_FOUND"
  | "MANIFEST_INVALID"
  | "LIFECYCLE_ERROR"
  | "IPC_TIMEOUT"
  | "INTERNAL_ERROR";

export interface AppError {
  code: ErrorCode;
  message: string;
  moduleId?: string;
  instanceId?: string;
  cause?: unknown;
}

export class ModuleError extends Error {
  public readonly moduleId: string;
  public readonly code: ErrorCode;
  public readonly cause?: unknown;

  constructor(moduleId: string, code: ErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "ModuleError";
    this.moduleId = moduleId;
    this.code = code;
    this.cause = cause;
  }

  toAppError(): AppError {
    return {
      code: this.code,
      message: this.message,
      moduleId: this.moduleId,
      cause: this.cause,
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/errors.ts
git commit -m "feat(core): add AppError interface and ModuleError class"
```

---

### Task 1.3: Create core/manifest.ts with tests

**Files:**
- Create: `src/core/manifest.ts`
- Create: `src/core/__tests__/manifest.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/core/__tests__/manifest.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateManifestShape } from "../manifest";
import type { Manifest } from "../manifest";

describe("validateManifestShape", () => {
  const validManifest: Manifest = {
    id: "clock",
    name: "Clock",
    version: "1.0.0",
    icon: "🕐",
    type: "web",
    grid: {
      minWidth: 2,
      minHeight: 1,
      maxWidth: 4,
      maxHeight: 2,
      defaultWidth: 2,
      defaultHeight: 1,
      resizable: true,
    },
    permissions: [],
  };

  it("should accept valid manifest", () => {
    const result = validateManifestShape(validManifest);
    expect(result.ok).toBe(true);
  });

  it("should reject missing id", () => {
    const result = validateManifestShape({ ...validManifest, id: "" });
    expect(result.ok).toBe(false);
  });

  it("should reject invalid type", () => {
    const result = validateManifestShape({ ...validManifest, type: "invalid" as any });
    expect(result.ok).toBe(false);
  });

  it("should reject invalid permission", () => {
    const result = validateManifestShape({
      ...validManifest,
      permissions: ["invalid:perm" as any],
    });
    expect(result.ok).toBe(false);
  });

  it("should reject grid with minWidth > maxWidth", () => {
    const result = validateManifestShape({
      ...validManifest,
      grid: { ...validManifest.grid, minWidth: 5, maxWidth: 3 },
    });
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/core/__tests__/manifest.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement core/manifest.ts**

```typescript
import { PERMISSIONS, type Permission } from "./permissions";

export type ModuleType = "web" | "native" | "embedded";

export interface GridConstraints {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  defaultWidth: number;
  defaultHeight: number;
  resizable: boolean;
}

export interface SettingDefinition {
  type: "boolean" | "string" | "number";
  default: unknown;
  label: string;
}

export interface Manifest {
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

const VALID_TYPES: ModuleType[] = ["web", "native", "embedded"];

interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateManifestShape(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Manifest must be an object" };
  }

  const m = data as Record<string, unknown>;

  if (typeof m.id !== "string" || m.id.length === 0) {
    return { ok: false, error: "id must be a non-empty string" };
  }

  if (typeof m.name !== "string" || m.name.length === 0) {
    return { ok: false, error: "name must be a non-empty string" };
  }

  if (typeof m.version !== "string") {
    return { ok: false, error: "version must be a string" };
  }

  if (typeof m.icon !== "string") {
    return { ok: false, error: "icon must be a string" };
  }

  if (!VALID_TYPES.includes(m.type as ModuleType)) {
    return { ok: false, error: `type must be one of: ${VALID_TYPES.join(", ")}` };
  }

  // Validate grid
  const grid = m.grid as Record<string, unknown> | undefined;
  if (!grid || typeof grid !== "object") {
    return { ok: false, error: "grid must be an object" };
  }

  const gridFields = ["minWidth", "minHeight", "maxWidth", "maxHeight", "defaultWidth", "defaultHeight"];
  for (const field of gridFields) {
    if (typeof grid[field] !== "number" || (grid[field] as number) < 1) {
      return { ok: false, error: `grid.${field} must be a positive number` };
    }
  }

  if (typeof grid.resizable !== "boolean") {
    return { ok: false, error: "grid.resizable must be a boolean" };
  }

  if ((grid.minWidth as number) > (grid.maxWidth as number)) {
    return { ok: false, error: "grid.minWidth cannot exceed maxWidth" };
  }

  if ((grid.minHeight as number) > (grid.maxHeight as number)) {
    return { ok: false, error: "grid.minHeight cannot exceed maxHeight" };
  }

  // Validate permissions
  if (!Array.isArray(m.permissions)) {
    return { ok: false, error: "permissions must be an array" };
  }

  for (const perm of m.permissions) {
    if (!PERMISSIONS.includes(perm as Permission)) {
      return { ok: false, error: `Unknown permission: ${perm}` };
    }
  }

  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/core/__tests__/manifest.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/manifest.ts src/core/__tests__/manifest.test.ts
git commit -m "feat(core): add Manifest types and validateManifestShape pure function"
```

---

### Task 1.4: Create core/module.ts, core/context.ts, core/events.ts, core/constants.ts

**Files:**
- Create: `src/core/module.ts`
- Create: `src/core/context.ts`
- Create: `src/core/events.ts`
- Create: `src/core/constants.ts`

- [ ] **Step 1: Create core/module.ts**

```typescript
import type { ModuleContext } from "./context";

export interface Module {
  onInit?(ctx: ModuleContext): Promise<void>;
  onMount?(ctx: ModuleContext): Promise<void>;
  onUnmount?(): Promise<void>;
  onDestroy?(): Promise<void>;
  onResize?(width: number, height: number): void;
  onSettingsChange?(key: string, value: unknown): void;
  onMessage?(type: string, payload: unknown): void;
}

export type ModuleFactory = () => Promise<Module>;
```

- [ ] **Step 2: Create core/context.ts**

```typescript
import type { Permission } from "./permissions";

export interface SystemAPI {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  readDir(path: string): Promise<DirEntry[]>;
  openPath(path: string): Promise<void>;
  clipboardRead(): Promise<string>;
  clipboardWrite(text: string): Promise<void>;
  httpGet(url: string): Promise<string>;
  exec(command: string, args: string[]): Promise<ProcessResult>;
  systemInfo(): Promise<SystemInfo>;
}

export interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  modified: string;
}

export interface ProcessResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface SystemInfo {
  os: string;
  arch: string;
  family: string;
}

export interface ModuleContext {
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

- [ ] **Step 3: Create core/events.ts**

```typescript
export interface ModuleEvent {
  type: string;
  payload: unknown;
  sourceInstanceId: string;
  targetInstanceId?: string;
}

export type EventHandler = (event: ModuleEvent) => void;
```

- [ ] **Step 4: Create core/constants.ts**

```typescript
export const DEFAULT_COLUMNS = 12;
export const DEFAULT_ROW_HEIGHT = 100;
export const DEFAULT_GAP = 8;
export const LAYOUT_VERSION = 1;
export const MIN_MODULE_SIZE = 1;
```

- [ ] **Step 5: Commit**

```bash
git add src/core/module.ts src/core/context.ts src/core/events.ts src/core/constants.ts
git commit -m "feat(core): add Module, ModuleContext, events, and constants types"
```

---

### Task 1.5: Create core/index.ts barrel export and remove placeholder test

**Files:**
- Create: `src/core/index.ts`
- Delete: `src/core/__tests__/placeholder.test.ts`

- [ ] **Step 1: Create core/index.ts**

```typescript
export * from "./permissions";
export * from "./errors";
export * from "./manifest";
export * from "./module";
export * from "./context";
export * from "./events";
export * from "./constants";
```

- [ ] **Step 2: Remove placeholder test**

```bash
rm src/core/__tests__/placeholder.test.ts
```

- [ ] **Step 3: Verify all core tests pass**

Run: `npm test`
Expected: All core tests pass

- [ ] **Step 4: Commit**

```bash
git add src/core/index.ts
git rm src/core/__tests__/placeholder.test.ts
git commit -m "feat(core): add barrel export and clean up placeholder"
```

---

## Phase 2: layout/ Engine

### Task 2.1: Create layout/types.ts

**Files:**
- Create: `src/layout/types.ts`

- [ ] **Step 1: Implement layout/types.ts**

```typescript
export interface Layout {
  version: number;
  id: string;
  name?: string;
  columns: number;
  rowHeight: number;
  gap: number;
  items: LayoutItem[];
}

export interface LayoutItem {
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

export type LayoutErrorCode =
  | "ITEM_NOT_FOUND"
  | "ITEM_LOCKED"
  | "COLLISION_UNRESOLVED"
  | "OUT_OF_BOUNDS"
  | "INVALID_SIZE"
  | "INVALID_LAYOUT"
  | "DESERIALIZE_FAILED"
  | "NO_SPACE";

export type LayoutResult =
  | { ok: true; layout: Layout }
  | { ok: false; code: LayoutErrorCode; message: string; layout?: Layout };

export interface SerializedLayout {
  version: number;
  savedAt: string;
  layout: Layout;
}

export function ok(layout: Layout): LayoutResult {
  return { ok: true, layout };
}

export function err(
  code: LayoutErrorCode,
  message: string,
  layout?: Layout,
): LayoutResult {
  return { ok: false, code, message, layout };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/layout/types.ts
git commit -m "feat(layout): add layout types and result helpers"
```

---

### Task 2.2: Create layout/grid.ts with tests

**Files:**
- Create: `src/layout/grid.ts`
- Create: `src/layout/__tests__/grid.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/layout/__tests__/grid.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { columnWidth, pixelToGrid, gridToPixel, findEmptyPosition } from "../grid";
import type { Layout } from "../types";

const layout: Layout = {
  version: 1,
  id: "test",
  columns: 12,
  rowHeight: 100,
  gap: 8,
  items: [],
};

describe("columnWidth", () => {
  it("should calculate column width correctly", () => {
    // 1200px container, 12 columns, 11 gaps of 8px = 88px
    // (1200 - 88) / 12 = 92.67
    const cw = columnWidth(1200, layout);
    expect(cw).toBeCloseTo((1200 - 11 * 8) / 12);
  });
});

describe("pixelToGrid", () => {
  it("should convert pixel to grid coordinates", () => {
    const result = pixelToGrid(0, 0, layout, 1200);
    expect(result).toEqual({ col: 0, row: 0 });
  });

  it("should convert middle position", () => {
    const cw = columnWidth(1200, layout);
    const result = pixelToGrid(cw + 8, 100, layout, 1200);
    expect(result.col).toBe(1);
    expect(result.row).toBe(1);
  });
});

describe("gridToPixel", () => {
  it("should convert grid to pixel coordinates", () => {
    const result = gridToPixel(0, 0, layout, 1200);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it("should convert non-zero position", () => {
    const cw = columnWidth(1200, layout);
    const result = gridToPixel(1, 1, layout, 1200);
    expect(result.x).toBeCloseTo(cw + 8);
    expect(result.y).toBe(108);
  });
});

describe("findEmptyPosition", () => {
  it("should find position in empty layout", () => {
    const result = findEmptyPosition(layout, 2, 1);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("should skip occupied positions", () => {
    const occupied: Layout = {
      ...layout,
      items: [{ instanceId: "a", x: 0, y: 0, w: 2, h: 1 }],
    };
    const result = findEmptyPosition(occupied, 2, 1);
    expect(result).toEqual({ x: 2, y: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/layout/__tests__/grid.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement layout/grid.ts**

```typescript
import type { Layout } from "./types";

export function columnWidth(containerWidth: number, layout: Layout): number {
  const totalGaps = (layout.columns - 1) * layout.gap;
  return (containerWidth - totalGaps) / layout.columns;
}

export function pixelToGrid(
  px: number,
  py: number,
  layout: Layout,
  containerWidth: number,
): { col: number; row: number } {
  const cw = columnWidth(containerWidth, layout);
  const col = Math.round(px / (cw + layout.gap));
  const row = Math.round(py / (layout.rowHeight + layout.gap));
  return { col: Math.max(0, col), row: Math.max(0, row) };
}

export function gridToPixel(
  col: number,
  row: number,
  layout: Layout,
  containerWidth: number,
): { x: number; y: number } {
  const cw = columnWidth(containerWidth, layout);
  return {
    x: col * (cw + layout.gap),
    y: row * (layout.rowHeight + layout.gap),
  };
}

export function findEmptyPosition(
  layout: Layout,
  w: number,
  h: number,
): { x: number; y: number } | null {
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x <= layout.columns - w; x++) {
      const candidate = { instanceId: "__temp__", x, y, w, h };
      const collides = layout.items.some(
        (item) =>
          candidate.x < item.x + item.w &&
          candidate.x + candidate.w > item.x &&
          candidate.y < item.y + item.h &&
          candidate.y + candidate.h > item.y,
      );
      if (!collides) return { x, y };
    }
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/layout/__tests__/grid.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/layout/grid.ts src/layout/__tests__/grid.test.ts
git commit -m "feat(layout): add grid coordinate math functions"
```

---

### Task 2.3: Create layout/collision.ts with tests

**Files:**
- Create: `src/layout/collision.ts`
- Create: `src/layout/__tests__/collision.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/layout/__tests__/collision.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { overlaps, collides, validateLayout } from "../collision";
import type { LayoutItem } from "../types";

describe("overlaps", () => {
  it("should detect overlapping rectangles", () => {
    const a: LayoutItem = { instanceId: "a", x: 0, y: 0, w: 2, h: 2 };
    const b: LayoutItem = { instanceId: "b", x: 1, y: 1, w: 2, h: 2 };
    expect(overlaps(a, b)).toBe(true);
  });

  it("should not flag touching edges as overlap", () => {
    const a: LayoutItem = { instanceId: "a", x: 0, y: 0, w: 2, h: 2 };
    const b: LayoutItem = { instanceId: "b", x: 2, y: 0, w: 2, h: 2 };
    expect(overlaps(a, b)).toBe(false);
  });

  it("should handle zero-size items", () => {
    const a: LayoutItem = { instanceId: "a", x: 0, y: 0, w: 0, h: 0 };
    const b: LayoutItem = { instanceId: "b", x: 0, y: 0, w: 2, h: 2 };
    expect(overlaps(a, b)).toBe(false);
  });
});

describe("collides", () => {
  it("should detect collision with other items", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 2 },
    ];
    const target: LayoutItem = { instanceId: "b", x: 1, y: 1, w: 2, h: 2 };
    expect(collides(items, target)).toBe(true);
  });

  it("should exclude specified id from collision check", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 2 },
    ];
    const target: LayoutItem = { instanceId: "a", x: 0, y: 0, w: 2, h: 2 };
    expect(collides(items, target, "a")).toBe(false);
  });
});

describe("validateLayout", () => {
  it("should accept valid layout", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 1 },
      { instanceId: "b", x: 2, y: 0, w: 2, h: 1 },
    ];
    expect(validateLayout(items)).toBe(true);
  });

  it("should reject overlapping items", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 3, h: 2 },
      { instanceId: "b", x: 1, y: 1, w: 3, h: 2 },
    ];
    expect(validateLayout(items)).toBe(false);
  });

  it("should reject duplicate instanceId", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 1 },
      { instanceId: "a", x: 3, y: 0, w: 2, h: 1 },
    ];
    expect(validateLayout(items)).toBe(false);
  });

  it("should reject negative coordinates", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: -1, y: 0, w: 2, h: 1 },
    ];
    expect(validateLayout(items)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/layout/__tests__/collision.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement layout/collision.ts**

```typescript
import type { LayoutItem } from "./types";

export function overlaps(a: LayoutItem, b: LayoutItem): boolean {
  if (a.w <= 0 || a.h <= 0 || b.w <= 0 || b.h <= 0) return false;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function collides(
  items: LayoutItem[],
  target: LayoutItem,
  excludeId?: string,
): boolean {
  return items
    .filter((item) => item.instanceId !== excludeId)
    .some((item) => overlaps(item, target));
}

export function validateLayout(items: LayoutItem[]): boolean {
  // Check for negative coordinates and sizes
  for (const item of items) {
    if (item.x < 0 || item.y < 0 || item.w < 1 || item.h < 1) return false;
  }

  // Check for duplicate instanceIds
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.instanceId)) return false;
    ids.add(item.instanceId);
  }

  // Check for overlaps
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (overlaps(items[i], items[j])) return false;
    }
  }

  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/layout/__tests__/collision.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/layout/collision.ts src/layout/__tests__/collision.test.ts
git commit -m "feat(layout): add collision detection with tests"
```

---

### Task 2.4: Create layout/push.ts with tests

**Files:**
- Create: `src/layout/push.ts`
- Create: `src/layout/__tests__/push.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/layout/__tests__/push.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { pushItems, pushOnResize } from "../push";
import type { LayoutItem } from "../types";

describe("pushItems", () => {
  it("should move item to new position when no collision", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 1 },
      { instanceId: "b", x: 4, y: 0, w: 2, h: 1 },
    ];
    const result = pushItems(items, "a", 6, 0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const moved = result.layout.items.find((i) => i.instanceId === "a");
      expect(moved?.x).toBe(6);
    }
  });

  it("should push colliding items down", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 1 },
      { instanceId: "b", x: 0, y: 2, w: 2, h: 1 },
    ];
    const result = pushItems(items, "a", 0, 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const b = result.layout.items.find((i) => i.instanceId === "b");
      expect(b?.y).toBeGreaterThan(2);
    }
  });

  it("should fail when pushing locked item", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 1 },
      { instanceId: "b", x: 0, y: 2, w: 2, h: 1, locked: true },
    ];
    const result = pushItems(items, "a", 0, 2);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ITEM_LOCKED");
    }
  });
});

describe("pushOnResize", () => {
  it("should resize item when no collision", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 1 },
    ];
    const result = pushOnResize(items, "a", 4, 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const resized = result.layout.items.find((i) => i.instanceId === "a");
      expect(resized?.w).toBe(4);
      expect(resized?.h).toBe(2);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/layout/__tests__/push.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement layout/push.ts**

```typescript
import type { LayoutItem, LayoutResult } from "./types";
import { ok, err } from "./types";
import { overlaps } from "./collision";
import { DEFAULT_COLUMNS } from "@core/constants";

function cloneItems(items: LayoutItem[]): LayoutItem[] {
  return items.map((item) => ({ ...item }));
}

function pushCollidingDown(
  items: LayoutItem[],
  target: LayoutItem,
): LayoutItem[] {
  const result = cloneItems(items);
  let changed = true;
  let iterations = 0;
  const maxIterations = 100;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;
    for (const item of result) {
      if (item.instanceId === target.instanceId) continue;
      if (overlaps(target, item)) {
        if (item.locked) return result; // Can't push locked item
        item.y += 1;
        changed = true;
      }
    }
  }

  return result;
}

export function pushItems(
  items: LayoutItem[],
  movedId: string,
  newX: number,
  newY: number,
): LayoutResult {
  const moved = items.find((i) => i.instanceId === movedId);
  if (!moved) return err("ITEM_NOT_FOUND", `Item ${movedId} not found`);
  if (moved.locked) return err("ITEM_LOCKED", `Item ${movedId} is locked`);

  const updated = cloneItems(items);
  const target = updated.find((i) => i.instanceId === movedId)!;
  target.x = newX;
  target.y = newY;

  // Check if any colliding item is locked
  for (const item of updated) {
    if (item.instanceId === movedId) continue;
    if (overlaps(target, item) && item.locked) {
      return err("ITEM_LOCKED", `Cannot push locked item ${item.instanceId}`);
    }
  }

  const pushed = pushCollidingDown(updated, target);

  // Verify no overlaps remain
  for (let i = 0; i < pushed.length; i++) {
    for (let j = i + 1; j < pushed.length; j++) {
      if (overlaps(pushed[i], pushed[j])) {
        return err("COLLISION_UNRESOLVED", "Could not resolve all collisions");
      }
    }
  }

  return ok({ ...itemsToLayout(pushed) });
}

export function pushOnResize(
  items: LayoutItem[],
  resizedId: string,
  newW: number,
  newH: number,
): LayoutResult {
  const resized = items.find((i) => i.instanceId === resizedId);
  if (!resized) return err("ITEM_NOT_FOUND", `Item ${resizedId} not found`);

  const updated = cloneItems(items);
  const target = updated.find((i) => i.instanceId === resizedId)!;
  target.w = newW;
  target.h = newH;

  const pushed = pushCollidingDown(updated, target);

  for (let i = 0; i < pushed.length; i++) {
    for (let j = i + 1; j < pushed.length; j++) {
      if (overlaps(pushed[i], pushed[j])) {
        return err("COLLISION_UNRESOLVED", "Could not resolve all collisions");
      }
    }
  }

  return ok({ ...itemsToLayout(pushed) });
}

function itemsToLayout(items: LayoutItem[]) {
  return {
    version: 1,
    id: "temp",
    columns: DEFAULT_COLUMNS,
    rowHeight: 100,
    gap: 8,
    items,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/layout/__tests__/push.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/layout/push.ts src/layout/__tests__/push.test.ts
git commit -m "feat(layout): add push algorithm with locked item protection"
```

---

### Task 2.5: Create layout/persistence.ts, layout/compact.ts, layout/engine.ts

**Files:**
- Create: `src/layout/persistence.ts`
- Create: `src/layout/compact.ts`
- Create: `src/layout/engine.ts`
- Create: `src/layout/__tests__/persistence.test.ts`
- Create: `src/layout/__tests__/engine.test.ts`

- [ ] **Step 1: Implement layout/persistence.ts**

```typescript
import type { Layout, SerializedLayout, LayoutResult } from "./types";
import { ok, err } from "./types";
import { validateLayout } from "./collision";
import { LAYOUT_VERSION } from "@core/constants";

export function serializeLayout(layout: Layout): SerializedLayout {
  return {
    version: LAYOUT_VERSION,
    savedAt: new Date().toISOString(),
    layout,
  };
}

export function deserializeLayout(json: string): LayoutResult {
  try {
    const data = JSON.parse(json);

    // Handle legacy format (no version wrapper)
    const layout: Layout = data.layout ?? data;

    if (typeof layout.version !== "number") {
      layout.version = LAYOUT_VERSION;
    }

    if (!Array.isArray(layout.items)) {
      return err("DESERIALIZE_FAILED", "items must be an array");
    }

    if (!validateLayout(layout.items)) {
      return err("INVALID_LAYOUT", "Layout contains overlaps or invalid items");
    }

    return ok(layout);
  } catch {
    return err("DESERIALIZE_FAILED", "Invalid JSON");
  }
}
```

- [ ] **Step 2: Implement layout/compact.ts**

```typescript
import type { Layout, LayoutResult } from "./types";
import { ok } from "./types";
import { validateLayout } from "./collision";

export function compactLayout(layout: Layout): Layout {
  // Sort items by y then x, remove gaps
  const sorted = [...layout.items].sort((a, b) => a.y - b.y || a.x - b.x);
  return { ...layout, items: sorted };
}

export function normalizeLayout(layout: Layout): LayoutResult {
  // Clamp items to grid bounds
  const normalized = layout.items.map((item) => ({
    ...item,
    x: Math.max(0, Math.min(item.x, layout.columns - item.w)),
    y: Math.max(0, item.y),
    w: Math.max(1, item.w),
    h: Math.max(1, item.h),
  }));

  if (!validateLayout(normalized)) {
    return { ok: false, code: "INVALID_LAYOUT", message: "Layout invalid after normalization" };
  }

  return ok({ ...layout, items: normalized });
}
```

- [ ] **Step 3: Implement layout/engine.ts**

```typescript
import type { Layout, LayoutItem, LayoutResult, SerializedLayout } from "./types";
import { ok, err } from "./types";
import { findEmptyPosition } from "./grid";
import { collides } from "./collision";
import { pushItems, pushOnResize } from "./push";
import { serializeLayout, deserializeLayout } from "./persistence";
import { DEFAULT_COLUMNS, DEFAULT_ROW_HEIGHT, DEFAULT_GAP, LAYOUT_VERSION } from "@core/constants";

export interface LayoutEngine {
  getLayout(): Layout;
  getItem(instanceId: string): LayoutItem | undefined;
  addItem(item: Omit<LayoutItem, "x" | "y">): LayoutResult;
  removeItem(instanceId: string): Layout;
  moveItem(instanceId: string, x: number, y: number): LayoutResult;
  resizeItem(instanceId: string, w: number, h: number): LayoutResult;
  save(): SerializedLayout;
  load(data: SerializedLayout): LayoutResult;
  onChange(handler: (layout: Layout) => void): () => void;
}

export function createLayoutEngine(): LayoutEngine {
  let layout: Layout = {
    version: LAYOUT_VERSION,
    id: "default",
    columns: DEFAULT_COLUMNS,
    rowHeight: DEFAULT_ROW_HEIGHT,
    gap: DEFAULT_GAP,
    items: [],
  };
  const listeners: Set<(layout: Layout) => void> = new Set();

  function notify() {
    for (const handler of listeners) {
      handler(layout);
    }
  }

  return {
    getLayout() {
      return layout;
    },

    getItem(instanceId) {
      return layout.items.find((i) => i.instanceId === instanceId);
    },

    addItem(item) {
      const pos = findEmptyPosition(layout, item.w, item.h);
      if (!pos) return err("NO_SPACE", "No empty position available");

      const newItem: LayoutItem = { ...item, x: pos.x, y: pos.y };

      if (item.minW && item.w < item.minW) return err("INVALID_SIZE", "w < minW");
      if (item.maxW && item.w > item.maxW) return err("INVALID_SIZE", "w > maxW");
      if (item.minH && item.h < item.minH) return err("INVALID_SIZE", "h < minH");
      if (item.maxH && item.h > item.maxH) return err("INVALID_SIZE", "h > maxH");

      layout = { ...layout, items: [...layout.items, newItem] };
      notify();
      return ok(layout);
    },

    removeItem(instanceId) {
      layout = { ...layout, items: layout.items.filter((i) => i.instanceId !== instanceId) };
      notify();
      return layout;
    },

    moveItem(instanceId, x, y) {
      const result = pushItems(layout.items, instanceId, x, y);
      if (result.ok) {
        layout = result.layout;
        notify();
      }
      return result;
    },

    resizeItem(instanceId, w, h) {
      const result = pushOnResize(layout.items, instanceId, w, h);
      if (result.ok) {
        layout = result.layout;
        notify();
      }
      return result;
    },

    save() {
      return serializeLayout(layout);
    },

    load(data) {
      const result = deserializeLayout(JSON.stringify(data));
      if (result.ok) {
        layout = result.layout;
        notify();
      }
      return result;
    },

    onChange(handler) {
      listeners.add(handler);
      return () => listeners.delete(handler);
    },
  };
}
```

- [ ] **Step 4: Write tests for persistence and engine**

Create `src/layout/__tests__/persistence.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { serializeLayout, deserializeLayout } from "../persistence";
import type { Layout } from "../types";

const testLayout: Layout = {
  version: 1,
  id: "test",
  columns: 12,
  rowHeight: 100,
  gap: 8,
  items: [{ instanceId: "a", x: 0, y: 0, w: 2, h: 1 }],
};

describe("serializeLayout", () => {
  it("should wrap layout with version and savedAt", () => {
    const result = serializeLayout(testLayout);
    expect(result.version).toBe(1);
    expect(result.savedAt).toBeDefined();
    expect(result.layout).toBe(testLayout);
  });
});

describe("deserializeLayout", () => {
  it("should round-trip through serialize/deserialize", () => {
    const serialized = serializeLayout(testLayout);
    const result = deserializeLayout(JSON.stringify(serialized));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.layout.items).toHaveLength(1);
      expect(result.layout.items[0].instanceId).toBe("a");
    }
  });

  it("should handle legacy format without wrapper", () => {
    const result = deserializeLayout(JSON.stringify(testLayout));
    expect(result.ok).toBe(true);
  });

  it("should reject invalid JSON", () => {
    const result = deserializeLayout("not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("DESERIALIZE_FAILED");
  });
});
```

Create `src/layout/__tests__/engine.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createLayoutEngine } from "../engine";

describe("LayoutEngine", () => {
  it("should add item at empty position", () => {
    const engine = createLayoutEngine();
    const result = engine.addItem({ instanceId: "a", w: 2, h: 1 });
    expect(result.ok).toBe(true);
    expect(engine.getItem("a")).toBeDefined();
    expect(engine.getItem("a")?.x).toBe(0);
    expect(engine.getItem("a")?.y).toBe(0);
  });

  it("should remove item", () => {
    const engine = createLayoutEngine();
    engine.addItem({ instanceId: "a", w: 2, h: 1 });
    engine.removeItem("a");
    expect(engine.getItem("a")).toBeUndefined();
  });

  it("should notify listeners on change", () => {
    const engine = createLayoutEngine();
    let notified = false;
    engine.onChange(() => { notified = true; });
    engine.addItem({ instanceId: "a", w: 2, h: 1 });
    expect(notified).toBe(true);
  });

  it("should save and load layout", () => {
    const engine = createLayoutEngine();
    engine.addItem({ instanceId: "a", w: 2, h: 1 });
    const saved = engine.save();
    const engine2 = createLayoutEngine();
    const result = engine2.load(saved);
    expect(result.ok).toBe(true);
    expect(engine2.getItem("a")).toBeDefined();
  });
});
```

- [ ] **Step 5: Run all layout tests**

Run: `npm test -- src/layout/`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/layout/persistence.ts src/layout/compact.ts src/layout/engine.ts
git add src/layout/__tests__/persistence.test.ts src/layout/__tests__/engine.test.ts
git commit -m "feat(layout): add persistence, compact, and engine with tests"
```

---

## Phase 3: host/ Services

### Task 3.1: Create host/types.ts and host/manager.ts

**Files:**
- Create: `src/host/types.ts`
- Create: `src/host/manager.ts`

- [ ] **Step 1: Create host/types.ts**

```typescript
import type { Permission, Manifest, Module, ModuleContext } from "@core/index";

export interface HostRuntime {
  storageRead(instanceId: string, key: string): Promise<unknown>;
  storageWrite(instanceId: string, key: string, value: unknown): Promise<void>;
  storageDelete(instanceId: string, key: string): Promise<void>;
}

export interface PermissionRequest {
  moduleId: string;
  instanceId: string;
  permission: Permission;
}

export interface PermissionPrompt {
  request(input: PermissionRequest): Promise<boolean>;
}

export interface HostLogger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface HostDependencies {
  runtime: HostRuntime;
  permissionPrompt: PermissionPrompt;
  logger?: HostLogger;
}

export type ModuleFactory = () => Promise<Module>;

export interface CreateModuleInstanceOptions {
  instanceId?: string;
  settings?: Record<string, unknown>;
  container: HTMLElement;
}

export type ModuleInstanceStatus =
  | "created"
  | "initializing"
  | "initialized"
  | "mounting"
  | "mounted"
  | "suspended"
  | "unmounting"
  | "destroyed"
  | "error";

export interface ModuleInstance {
  instanceId: string;
  moduleId: string;
  status: ModuleInstanceStatus;
  module: Module;
  ctx: ModuleContext;
}
```

- [ ] **Step 2: Create host/manager.ts**

```typescript
import type { Manifest } from "@core/index";
import type { ModuleFactory } from "./types";

interface RegisteredModule {
  manifest: Manifest;
  factory: ModuleFactory;
}

export interface ModuleManager {
  register(manifest: Manifest, factory: ModuleFactory): void;
  unregister(moduleId: string): void;
  list(): Manifest[];
  get(moduleId: string): RegisteredModule | undefined;
}

export function createModuleManager(): ModuleManager {
  const registry = new Map<string, RegisteredModule>();

  return {
    register(manifest, factory) {
      registry.set(manifest.id, { manifest, factory });
    },

    unregister(moduleId) {
      registry.delete(moduleId);
    },

    list() {
      return Array.from(registry.values()).map((m) => m.manifest);
    },

    get(moduleId) {
      return registry.get(moduleId);
    },
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/host/types.ts src/host/manager.ts
git commit -m "feat(host): add host types and module manager"
```

---

### Task 3.2: Create host/sandbox.ts, host/event-bus.ts, host/storage.ts

**Files:**
- Create: `src/host/sandbox.ts`
- Create: `src/host/event-bus.ts`
- Create: `src/host/storage.ts`

- [ ] **Step 1: Create host/sandbox.ts**

```typescript
import type { Permission } from "@core/index";
import type { PermissionChecker, PermissionPrompt, PermissionRequest } from "./types";

export function createPermissionChecker(
  prompt: PermissionPrompt,
): PermissionChecker {
  const granted = new Map<string, Set<Permission>>();

  return {
    check(instanceId, required) {
      const perms = granted.get(instanceId);
      return perms?.has(required) ?? false;
    },

    async request(instanceId, perm) {
      if (this.check(instanceId, perm)) return true;

      const request: PermissionRequest = {
        moduleId: "", // Will be filled by caller
        instanceId,
        permission: perm,
      };
      const approved = await prompt.request(request);
      if (approved) {
        if (!granted.has(instanceId)) granted.set(instanceId, new Set());
        granted.get(instanceId)!.add(perm);
      }
      return approved;
    },

    getGranted(instanceId) {
      return Array.from(granted.get(instanceId) ?? []);
    },
  };
}

export interface PermissionChecker {
  check(instanceId: string, required: Permission): boolean;
  request(instanceId: string, perm: Permission): Promise<boolean>;
  getGranted(instanceId: string): Permission[];
}
```

- [ ] **Step 2: Create host/event-bus.ts**

```typescript
import type { ModuleEvent, EventHandler } from "@core/index";

export interface EventBus {
  emit(event: ModuleEvent): void;
  on(type: string, handler: EventHandler, options?: { target?: string }): () => void;
}

export function createEventBus(): EventBus {
  const listeners = new Map<string, Set<{ handler: EventHandler; target?: string }>>();

  return {
    emit(event) {
      const handlers = listeners.get(event.type);
      if (!handlers) return;

      for (const { handler, target } of handlers) {
        if (target && event.targetInstanceId && target !== event.targetInstanceId) continue;
        handler(event);
      }
    },

    on(type, handler, options) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      const entry = { handler, target: options?.target };
      listeners.get(type)!.add(entry);
      return () => listeners.get(type)?.delete(entry);
    },
  };
}
```

- [ ] **Step 3: Create host/storage.ts**

```typescript
import type { HostRuntime } from "./types";

export interface ModuleStorage {
  get<T>(instanceId: string, key: string): Promise<T | undefined>;
  set<T>(instanceId: string, key: string, value: T): Promise<void>;
  delete(instanceId: string, key: string): Promise<void>;
  list(instanceId: string): Promise<string[]>;
}

export function createModuleStorage(runtime: HostRuntime): ModuleStorage {
  return {
    async get<T>(instanceId: string, key: string): Promise<T | undefined> {
      const value = await runtime.storageRead(instanceId, key);
      return value as T | undefined;
    },

    async set<T>(instanceId: string, key: string, value: T): Promise<void> {
      await runtime.storageWrite(instanceId, key, value);
    },

    async delete(instanceId: string, key: string): Promise<void> {
      await runtime.storageDelete(instanceId, key);
    },

    async list(_instanceId: string): Promise<string[]> {
      // TODO: implement listing keys
      return [];
    },
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/host/sandbox.ts src/host/event-bus.ts src/host/storage.ts
git commit -m "feat(host): add permission checker, event bus, and storage service"
```

---

### Task 3.3: Create host/context-factory.ts and host/instance.ts

**Files:**
- Create: `src/host/context-factory.ts`
- Create: `src/host/instance.ts`

- [ ] **Step 1: Create host/context-factory.ts**

```typescript
import type { ModuleContext, Permission, SystemAPI } from "@core/index";
import type { PermissionChecker } from "./sandbox";
import type { EventBus } from "./event-bus";
import type { ModuleStorage } from "./storage";
import type { HostRuntime, PermissionPrompt } from "./types";

interface CreateContextOptions {
  moduleId: string;
  instanceId: string;
  container: HTMLElement;
  settings: Record<string, unknown>;
  runtime: HostRuntime;
  permissions: PermissionChecker;
  eventBus: EventBus;
  storage: ModuleStorage;
  system: SystemAPI;
}

export function createModuleContext(options: CreateContextOptions): ModuleContext {
  const {
    moduleId,
    instanceId,
    container,
    settings,
    permissions,
    eventBus,
    storage,
    system,
  } = options;

  const unsubscribers: (() => void)[] = [];

  return {
    moduleId,
    instanceId,
    container,
    settings,

    storage: {
      get: <T>(key: string) => storage.get<T>(instanceId, key),
      set: <T>(key: string, value: T) => storage.set<T>(instanceId, key, value),
      delete: (key: string) => storage.delete(instanceId, key),
    },

    emit(type, payload) {
      eventBus.emit({ type, payload, sourceInstanceId: instanceId });
    },

    on(type, handler) {
      const unsub = eventBus.on(type, (event) => handler(event.payload), {
        target: instanceId,
      });
      unsubscribers.push(unsub);
      return unsub;
    },

    requestPermission(perm: Permission) {
      return permissions.request(instanceId, perm);
    },

    system,
  };
}
```

- [ ] **Step 2: Create host/instance.ts**

```typescript
import type { ModuleInstance, ModuleInstanceStatus, CreateModuleInstanceOptions, ModuleFactory } from "./types";
import type { ModuleContext } from "@core/index";
import { createModuleContext } from "./context-factory";
import type { PermissionChecker } from "./sandbox";
import type { EventBus } from "./event-bus";
import type { ModuleStorage } from "./storage";
import type { HostRuntime } from "./types";
import type { SystemAPI } from "@core/index";
import { v4 as uuid } from "uuid";

// Note: uuid is used for generating instance IDs. Install with: npm install uuid @types/uuid

export interface ModuleInstanceManager {
  create(moduleId: string, factory: ModuleFactory, options: CreateModuleInstanceOptions): Promise<ModuleInstance>;
  destroy(instanceId: string): Promise<void>;
  suspend(instanceId: string): void;
  resume(instanceId: string): void;
  list(): ModuleInstance[];
  get(instanceId: string): ModuleInstance | undefined;
}

export function createModuleInstanceManager(
  runtime: HostRuntime,
  permissions: PermissionChecker,
  eventBus: EventBus,
  storage: ModuleStorage,
  system: SystemAPI,
): ModuleInstanceManager {
  const instances = new Map<string, ModuleInstance>();

  return {
    async create(moduleId, factory, options) {
      const instanceId = options.instanceId ?? uuid();
      const module = await factory();

      const ctx = createModuleContext({
        moduleId,
        instanceId,
        container: options.container,
        settings: options.settings ?? {},
        runtime,
        permissions,
        eventBus,
        storage,
        system,
      });

      const instance: ModuleInstance = {
        instanceId,
        moduleId,
        status: "created",
        module,
        ctx,
      };

      instances.set(instanceId, instance);

      // Call onInit
      if (module.onInit) {
        instance.status = "initializing";
        await module.onInit(ctx);
        instance.status = "initialized";
      }

      // Call onMount
      if (module.onMount) {
        instance.status = "mounting";
        await module.onMount(ctx);
        instance.status = "mounted";
      }

      return instance;
    },

    async destroy(instanceId) {
      const instance = instances.get(instanceId);
      if (!instance) return;

      instance.status = "unmounting";
      if (instance.module.onUnmount) {
        await instance.module.onUnmount();
      }

      if (instance.module.onDestroy) {
        await instance.module.onDestroy();
      }

      instance.status = "destroyed";
      instances.delete(instanceId);
    },

    suspend(instanceId) {
      const instance = instances.get(instanceId);
      if (instance && instance.status === "mounted") {
        if (instance.module.onUnmount) {
          instance.module.onUnmount();
        }
        instance.status = "suspended";
      }
    },

    resume(instanceId) {
      const instance = instances.get(instanceId);
      if (instance && instance.status === "suspended") {
        if (instance.module.onMount) {
          instance.module.onMount(instance.ctx);
        }
        instance.status = "mounted";
      }
    },

    list() {
      return Array.from(instances.values());
    },

    get(instanceId) {
      return instances.get(instanceId);
    },
  };
}
```

- [ ] **Step 3: Install uuid dependency**

```bash
npm install uuid
npm install -D @types/uuid
```

- [ ] **Step 4: Commit**

```bash
git add src/host/context-factory.ts src/host/instance.ts package.json
git commit -m "feat(host): add context factory and instance manager"
```

---

### Task 3.4: Create host/index.ts barrel export

**Files:**
- Create: `src/host/index.ts`

- [ ] **Step 1: Create host/index.ts**

```typescript
export * from "./types";
export * from "./manager";
export * from "./sandbox";
export * from "./event-bus";
export * from "./storage";
export * from "./context-factory";
export * from "./instance";
```

- [ ] **Step 2: Commit**

```bash
git add src/host/index.ts
git commit -m "feat(host): add barrel export"
```

---

## Phase 4: Rust Backend Refactoring

### Task 4.1: Create types.rs with AppError, ErrorCode, Permission, CommandContext

**Files:**
- Create: `src-tauri/src/types.rs`

- [ ] **Step 1: Implement types.rs**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: ErrorCode,
    pub message: String,
    pub module_id: Option<String>,
    pub instance_id: Option<String>,
    pub cause: Option<String>,
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{:?}] {}", self.code, self.message)
    }
}

impl std::error::Error for AppError {}

impl AppError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            module_id: None,
            instance_id: None,
            cause: None,
        }
    }

    pub fn with_context(mut self, module_id: &str, instance_id: &str) -> Self {
        self.module_id = Some(module_id.to_string());
        self.instance_id = Some(instance_id.to_string());
        self
    }
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandContext {
    pub module_id: String,
    pub instance_id: String,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Permission {
    FileRead,
    FileWrite,
    NetworkHttp,
    SystemClipboard,
    SystemShell,
    SystemProcess,
    SystemInfo,
    AutomationRun,
}

impl Permission {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "file:read" => Some(Self::FileRead),
            "file:write" => Some(Self::FileWrite),
            "network:http" => Some(Self::NetworkHttp),
            "system:clipboard" => Some(Self::SystemClipboard),
            "system:shell" => Some(Self::SystemShell),
            "system:process" => Some(Self::SystemProcess),
            "system:info" => Some(Self::SystemInfo),
            "automation:run" => Some(Self::AutomationRun),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub is_file: bool,
    pub size: u64,
    pub modified: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessResult {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub family: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_code_serialization() {
        let err = AppError::new(ErrorCode::PermissionDenied, "denied");
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("PERMISSION_DENIED"));
        assert!(json.contains("denied"));
    }

    #[test]
    fn test_permission_from_str() {
        assert!(Permission::from_str("file:read").is_some());
        assert!(Permission::from_str("invalid:perm").is_none());
    }
}
```

- [ ] **Step 2: Run Rust tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/types.rs
git commit -m "feat(rust): add types.rs with AppError, ErrorCode, Permission, CommandContext"
```

---

### Task 4.2: Refactor Rust core/ (permissions, sandbox, storage)

**Files:**
- Create: `src-tauri/src/core/permissions.rs`
- Create: `src-tauri/src/core/sandbox.rs`
- Create: `src-tauri/src/core/storage.rs`
- Modify: `src-tauri/src/core/mod.rs`

- [ ] **Step 1: Implement core/permissions.rs**

```rust
use std::collections::HashMap;
use crate::types::{AppError, ErrorCode, Permission};

pub struct PermissionChecker {
    granted: HashMap<String, Vec<Permission>>,
}

impl PermissionChecker {
    pub fn new() -> Self {
        Self {
            granted: HashMap::new(),
        }
    }

    pub fn check(&self, instance_id: &str, perm: Permission) -> Result<(), AppError> {
        let perms = self.granted.get(instance_id);
        match perms {
            Some(p) if p.contains(&perm) => Ok(()),
            _ => Err(AppError::new(
                ErrorCode::PermissionDenied,
                format!("Permission {:?} not granted for instance {}", perm, instance_id),
            )),
        }
    }

    pub fn grant(&mut self, instance_id: &str, perm: Permission) {
        self.granted
            .entry(instance_id.to_string())
            .or_default()
            .push(perm);
    }

    pub fn revoke(&mut self, instance_id: &str, perm: Permission) {
        if let Some(perms) = self.granted.get_mut(instance_id) {
            perms.retain(|p| !matches!((p, &perm), (Permission::FileRead, Permission::FileRead)));
        }
    }
}
```

- [ ] **Step 2: Implement core/sandbox.rs**

```rust
use std::path::{Path, PathBuf};
use crate::types::{AppError, ErrorCode};

pub struct Sandbox {
    allowed_dirs: Vec<PathBuf>,
    blocked_dirs: Vec<PathBuf>,
    allowed_commands: Vec<String>,
}

impl Sandbox {
    pub fn new(home_dir: PathBuf) -> Self {
        Self {
            allowed_dirs: vec![home_dir.clone()],
            blocked_dirs: vec![
                home_dir.join(".ssh"),
                home_dir.join(".gnupg"),
                home_dir.join(".kube"),
                home_dir.join(".docker"),
            ],
            allowed_commands: vec![
                "dir".to_string(),
                "ls".to_string(),
                "echo".to_string(),
            ],
        }
    }

    pub fn validate_existing_path(&self, path: &str) -> Result<PathBuf, AppError> {
        let p = Path::new(path);
        let canonical = p.canonicalize().map_err(|_| {
            AppError::new(ErrorCode::PathBlocked, format!("Path not found: {}", path))
        })?;
        self.check_blocked(&canonical)?;
        Ok(canonical)
    }

    pub fn validate_write_path(&self, path: &str) -> Result<PathBuf, AppError> {
        let p = Path::new(path);
        if let Some(parent) = p.parent() {
            if parent.exists() {
                let canonical = parent.canonicalize().map_err(|_| {
                    AppError::new(ErrorCode::PathBlocked, format!("Parent path not found: {}", path))
                })?;
                self.check_blocked(&canonical)?;
            }
        }
        Ok(p.to_path_buf())
    }

    pub fn validate_command(&self, command: &str) -> Result<(), AppError> {
        if self.allowed_commands.contains(&command.to_string()) {
            Ok(())
        } else {
            Err(AppError::new(
                ErrorCode::CommandNotAllowed,
                format!("Command not allowed: {}", command),
            ))
        }
    }

    fn check_blocked(&self, path: &Path) -> Result<(), AppError> {
        for blocked in &self.blocked_dirs {
            if path.starts_with(blocked) {
                return Err(AppError::new(
                    ErrorCode::PathBlocked,
                    format!("Access to blocked directory: {}", path.display()),
                ));
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_validate_existing_path_blocks_ssh() {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let sandbox = Sandbox::new(home.clone());
        let ssh_dir = home.join(".ssh");
        if ssh_dir.exists() {
            assert!(sandbox.validate_existing_path(ssh_dir.to_str().unwrap()).is_err());
        }
    }

    #[test]
    fn test_validate_command_blocks_unknown() {
        let sandbox = Sandbox::new(PathBuf::from("."));
        assert!(sandbox.validate_command("rm").is_err());
        assert!(sandbox.validate_command("dir").is_ok());
    }
}
```

- [ ] **Step 3: Implement core/storage.rs**

```rust
use std::path::{Path, PathBuf};
use crate::types::{AppError, ErrorCode};

pub struct StorageEngine {
    base_dir: PathBuf,
}

impl StorageEngine {
    pub fn new(base_dir: PathBuf) -> Self {
        Self { base_dir }
    }

    fn validate_key(key: &str) -> Result<(), AppError> {
        if key.contains("..") || key.contains('/') || key.contains('\\') {
            return Err(AppError::new(
                ErrorCode::StorageError,
                format!("Invalid storage key: {}", key),
            ));
        }
        Ok(())
    }

    fn validate_instance_id(instance_id: &str) -> Result<(), AppError> {
        if instance_id.contains("..") || instance_id.contains('/') || instance_id.contains('\\') {
            return Err(AppError::new(
                ErrorCode::StorageError,
                format!("Invalid instance ID: {}", instance_id),
            ));
        }
        Ok(())
    }

    fn path_for(&self, instance_id: &str, key: &str) -> PathBuf {
        self.base_dir.join(instance_id).join(format!("{}.json", key))
    }

    pub fn get(&self, instance_id: &str, key: &str) -> Result<Option<serde_json::Value>, AppError> {
        Self::validate_instance_id(instance_id)?;
        Self::validate_key(key)?;

        let path = self.path_for(instance_id, key);
        if !path.exists() {
            return Ok(None);
        }

        let content = std::fs::read_to_string(&path).map_err(|e| {
            AppError::new(ErrorCode::StorageError, format!("Failed to read storage: {}", e))
        })?;

        let value: serde_json::Value = serde_json::from_str(&content).map_err(|e| {
            AppError::new(ErrorCode::StorageError, format!("Failed to parse storage: {}", e))
        })?;

        Ok(Some(value))
    }

    pub fn set(&self, instance_id: &str, key: &str, value: &serde_json::Value) -> Result<(), AppError> {
        Self::validate_instance_id(instance_id)?;
        Self::validate_key(key)?;

        let dir = self.base_dir.join(instance_id);
        std::fs::create_dir_all(&dir).map_err(|e| {
            AppError::new(ErrorCode::StorageError, format!("Failed to create storage dir: {}", e))
        })?;

        let path = self.path_for(instance_id, key);
        let content = serde_json::to_string_pretty(value).map_err(|e| {
            AppError::new(ErrorCode::StorageError, format!("Failed to serialize: {}", e))
        })?;

        std::fs::write(&path, content).map_err(|e| {
            AppError::new(ErrorCode::StorageError, format!("Failed to write storage: {}", e))
        })?;

        Ok(())
    }

    pub fn delete(&self, instance_id: &str, key: &str) -> Result<(), AppError> {
        Self::validate_instance_id(instance_id)?;
        Self::validate_key(key)?;

        let path = self.path_for(instance_id, key);
        if path.exists() {
            std::fs::remove_file(&path).map_err(|e| {
                AppError::new(ErrorCode::StorageError, format!("Failed to delete: {}", e))
            })?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_set_and_get() {
        let dir = tempdir().unwrap();
        let engine = StorageEngine::new(dir.path().to_path_buf());
        let value = serde_json::json!({"key": "value"});
        engine.set("test-instance", "data", &value).unwrap();
        let result = engine.get("test-instance", "data").unwrap();
        assert_eq!(result, Some(value));
    }

    #[test]
    fn test_validate_key_blocks_traversal() {
        assert!(StorageEngine::validate_key("../etc/passwd").is_err());
        assert!(StorageEngine::validate_key("valid-key").is_ok());
    }
}
```

- [ ] **Step 4: Update core/mod.rs**

```rust
pub mod permissions;
pub mod sandbox;
pub mod storage;
pub mod window;
```

- [ ] **Step 5: Run Rust tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/core/
git commit -m "feat(rust): refactor core/ with permissions, sandbox, and storage"
```

---

### Task 4.3: Add tempfile dev-dependency for Rust tests

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add tempfile to Cargo.toml**

Add to `[dev-dependencies]`:
```toml
[dev-dependencies]
tempfile = "3"
```

- [ ] **Step 2: Run tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m "chore(rust): add tempfile dev-dependency for tests"
```

---

## Phase 5: shell/ & stores/

### Task 5.1: Create shell/ layer

**Files:**
- Create: `src/shell/types.ts`
- Create: `src/shell/state.ts`
- Create: `src/shell/shortcuts.ts`

- [ ] **Step 1: Create shell/types.ts**

```typescript
export interface ShortcutConfig {
  toggleVisibility: string;
  addModule: string;
  lockLayout: string;
  settings: string;
}

export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  toggleVisibility: "Ctrl+Shift+D",
  addModule: "Ctrl+Shift+A",
  lockLayout: "Ctrl+Shift+L",
  settings: "Ctrl+,",
};

export interface ShellState {
  visible: boolean;
  layoutLocked: boolean;
}

export interface ShellFacade {
  show(): Promise<void>;
  hide(): Promise<void>;
  toggle(): Promise<void>;
  lockLayout(locked: boolean): Promise<void>;
}
```

- [ ] **Step 2: Create shell/state.ts**

```typescript
import type { ShellState } from "./types";

export function createShellState(): ShellState {
  return {
    visible: true,
    layoutLocked: false,
  };
}
```

- [ ] **Step 3: Create shell/shortcuts.ts**

```typescript
import type { ShortcutConfig } from "./types";

type ActionHandler = () => void;

export interface ShortcutManager {
  register(config: ShortcutConfig): void;
  unregister(): void;
  onAction(action: string, handler: ActionHandler): () => void;
}

export function createShortcutManager(): ShortcutManager {
  const handlers = new Map<string, Set<ActionHandler>>();

  return {
    register(_config) {
      // Actual registration happens via app/bridge.ts
    },

    unregister() {
      handlers.clear();
    },

    onAction(action, handler) {
      if (!handlers.has(action)) handlers.set(action, new Set());
      handlers.get(action)!.add(handler);
      return () => handlers.get(action)?.delete(handler);
    },
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/shell/
git commit -m "feat(shell): add shell types, state, and shortcut manager"
```

---

### Task 5.2: Refactor stores/

**Files:**
- Create: `src/stores/layout.ts`
- Create: `src/stores/modules.ts`
- Create: `src/stores/settings.ts`
- Create: `src/stores/shell.ts`

- [ ] **Step 1: Create stores/layout.ts**

```typescript
import { defineStore } from "pinia";
import { ref } from "vue";

export const useLayoutStore = defineStore("layout", () => {
  const selectedItemId = ref<string | null>(null);
  const isDragging = ref(false);
  const isResizing = ref(false);

  function selectItem(id: string | null) {
    selectedItemId.value = id;
  }

  function setDragging(value: boolean) {
    isDragging.value = value;
  }

  function setResizing(value: boolean) {
    isResizing.value = value;
  }

  return {
    selectedItemId,
    isDragging,
    isResizing,
    selectItem,
    setDragging,
    setResizing,
  };
});
```

- [ ] **Step 2: Create stores/modules.ts**

```typescript
import { defineStore } from "pinia";
import { ref } from "vue";
import type { Manifest } from "@core/index";

export const useModulesStore = defineStore("modules", () => {
  const available = ref<Manifest[]>([]);

  function setAvailable(modules: Manifest[]) {
    available.value = modules;
  }

  return { available, setAvailable };
});
```

- [ ] **Step 3: Create stores/settings.ts**

```typescript
import { defineStore } from "pinia";
import { ref } from "vue";

export const useSettingsStore = defineStore("settings", () => {
  const theme = ref<"dark" | "light" | "system">("dark");
  const language = ref("zh-CN");

  function setTheme(t: "dark" | "light" | "system") {
    theme.value = t;
  }

  return { theme, language, setTheme };
});
```

- [ ] **Step 4: Create stores/shell.ts**

```typescript
import { defineStore } from "pinia";
import { ref } from "vue";

export const useShellStore = defineStore("shell", () => {
  const visible = ref(true);
  const layoutLocked = ref(false);

  function setVisible(v: boolean) {
    visible.value = v;
  }

  function setLayoutLocked(v: boolean) {
    layoutLocked.value = v;
  }

  return { visible, layoutLocked, setVisible, setLayoutLocked };
});
```

- [ ] **Step 5: Remove old stores if they exist**

```bash
rm -f src/stores/layout.ts src/stores/modules.ts src/stores/settings.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/stores/
git commit -m "feat(stores): refactor stores to UI-only state"
```

---

## Phase 6: app/ Assembly Layer

### Task 6.1: Create app/bridge.ts

**Files:**
- Create: `src/app/bridge.ts`

- [ ] **Step 1: Implement bridge.ts**

```typescript
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AppError, ErrorCode } from "@core/errors";
import type { Manifest } from "@core/manifest";
import type { DirEntry, ProcessResult, SystemInfo } from "@core/context";

const IPC_COMMANDS = {
  MODULE_LIST: "module_list",
  MODULE_LOAD: "module_load",
  STORAGE_READ: "storage_read",
  STORAGE_WRITE: "storage_write",
  FILE_READ: "file_read",
  FILE_WRITE: "file_write",
  FILE_READ_DIR: "file_read_dir",
  FILE_OPEN_PATH: "file_open_path",
  SYSTEM_INFO: "system_info",
  CLIPBOARD_READ: "clipboard_read",
  CLIPBOARD_WRITE: "clipboard_write",
  HTTP_GET: "http_get",
  EXEC_COMMAND: "exec_command",
  WINDOW_SET_BOTTOM: "window_set_bottom",
  WINDOW_SET_CLICK_THROUGH: "window_set_click_through",
  WINDOW_LIST: "window_list",
  WINDOW_EMBED: "window_embed",
  WINDOW_RESIZE_EMBEDDED: "window_resize_embedded",
  WINDOW_DETACH: "window_detach",
} as const;

interface CommandContext {
  moduleId: string;
  instanceId: string;
  requestId?: string;
}

function createCommandContext(moduleId: string, instanceId: string): CommandContext {
  return { moduleId, instanceId, requestId: crypto.randomUUID() };
}

function isAppError(err: unknown): err is AppError {
  return typeof err === "object" && err !== null && "code" in err;
}

function parseAppError(err: unknown): AppError {
  if (isAppError(err)) return err;
  if (typeof err === "string") return { code: "INTERNAL_ERROR", message: err };
  return { code: "INTERNAL_ERROR", message: "Unknown IPC error", cause: String(err) };
}

async function safeInvoke<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    throw parseAppError(err);
  }
}

export const bridge = {
  commands: IPC_COMMANDS,
  createCommandContext,
  parseAppError,

  module: {
    list: () => safeInvoke<Manifest[]>(IPC_COMMANDS.MODULE_LIST, {}),
    load: (path: string) => safeInvoke<Manifest>(IPC_COMMANDS.MODULE_LOAD, { path }),
  },

  storage: {
    read: (instanceId: string, key: string) =>
      safeInvoke<unknown>(IPC_COMMANDS.STORAGE_READ, { instanceId, key }),
    write: (instanceId: string, key: string, value: unknown) =>
      safeInvoke<void>(IPC_COMMANDS.STORAGE_WRITE, { instanceId, key, value }),
    delete: (instanceId: string, key: string) =>
      safeInvoke<void>(IPC_COMMANDS.STORAGE_DELETE, { instanceId, key }),
  },

  file: {
    read: (ctx: CommandContext, path: string) =>
      safeInvoke<string>(IPC_COMMANDS.FILE_READ, { ctx, path }),
    write: (ctx: CommandContext, path: string, content: string) =>
      safeInvoke<void>(IPC_COMMANDS.FILE_WRITE, { ctx, path, content }),
    readDir: (ctx: CommandContext, path: string) =>
      safeInvoke<DirEntry[]>(IPC_COMMANDS.FILE_READ_DIR, { ctx, path }),
    openPath: (ctx: CommandContext, path: string) =>
      safeInvoke<void>(IPC_COMMANDS.FILE_OPEN_PATH, { ctx, path }),
  },

  system: {
    info: (ctx: CommandContext) =>
      safeInvoke<SystemInfo>(IPC_COMMANDS.SYSTEM_INFO, { ctx }),
    clipboardRead: (ctx: CommandContext) =>
      safeInvoke<string>(IPC_COMMANDS.CLIPBOARD_READ, { ctx }),
    clipboardWrite: (ctx: CommandContext, text: string) =>
      safeInvoke<void>(IPC_COMMANDS.CLIPBOARD_WRITE, { ctx, text }),
    httpGet: (ctx: CommandContext, url: string) =>
      safeInvoke<string>(IPC_COMMANDS.HTTP_GET, { ctx, url }),
    exec: (ctx: CommandContext, command: string, args: string[]) =>
      safeInvoke<ProcessResult>(IPC_COMMANDS.EXEC_COMMAND, { ctx, command, args }),
  },

  window: {
    setBottom: () => safeInvoke<void>(IPC_COMMANDS.WINDOW_SET_BOTTOM, {}),
    setClickThrough: (enabled: boolean) =>
      safeInvoke<void>(IPC_COMMANDS.WINDOW_SET_CLICK_THROUGH, { enabled }),
    listWindows: () => safeInvoke<unknown[]>(IPC_COMMANDS.WINDOW_LIST, {}),
    embedWindow: (ctx: CommandContext, hwnd: string) =>
      safeInvoke<void>(IPC_COMMANDS.WINDOW_EMBED, { ctx, hwnd }),
    resizeEmbedded: (ctx: CommandContext, hwnd: string, w: number, h: number) =>
      safeInvoke<void>(IPC_COMMANDS.WINDOW_RESIZE_EMBEDDED, { ctx, hwnd, w, h }),
    detachWindow: (ctx: CommandContext, hwnd: string) =>
      safeInvoke<void>(IPC_COMMANDS.WINDOW_DETACH, { ctx, hwnd }),
  },

  listen: {
    moduleMessage: async (handler: (msg: unknown) => void): Promise<() => void> => {
      return listen("module-message", (event) => handler(event.payload));
    },
    fileChanged: async (handler: (path: string) => void): Promise<() => void> => {
      return listen("file-changed", (event) => handler(event.payload as string));
    },
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/bridge.ts
git commit -m "feat(app): add bridge.ts with typed IPC wrapper"
```

---

### Task 6.2: Create app/providers.ts and app/startup.ts

**Files:**
- Create: `src/app/providers.ts`
- Create: `src/app/startup.ts`

- [ ] **Step 1: Create app/providers.ts**

```typescript
import type { HostRuntime, PermissionPrompt, HostDependencies } from "@host/index";
import type { ShellFacade } from "@shell/types";
import type { Manifest } from "@core/index";
import { bridge } from "./bridge";

export interface AppServices {
  modules: {
    listAvailable(): Manifest[];
    createInstance(moduleId: string, container: HTMLElement): Promise<unknown>;
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

function createHostRuntime(): HostRuntime {
  return {
    storageRead: (instanceId, key) => bridge.storage.read(instanceId, key),
    storageWrite: (instanceId, key, value) => bridge.storage.write(instanceId, key, value),
    storageDelete: (instanceId, key) => bridge.storage.delete(instanceId, key),
  };
}

function createPermissionPrompt(): PermissionPrompt {
  return {
    request: async (_input) => {
      // TODO: show permission dialog
      return true;
    },
  };
}

export function createHostDependencies(): HostDependencies {
  return {
    runtime: createHostRuntime(),
    permissionPrompt: createPermissionPrompt(),
    logger: console,
  };
}

export function createAppServices(): AppServices {
  // This will be wired up in main.ts with actual instances
  return {
    modules: {
      listAvailable: () => [],
      createInstance: async () => ({}),
      destroyInstance: async () => {},
      reloadInstance: async () => {},
    },
    layout: {
      addModule: async () => {},
      moveItem: async () => {},
      resizeItem: async () => {},
      save: async () => {},
    },
    shell: {
      show: async () => {},
      hide: async () => {},
      toggle: async () => {},
      lockLayout: async () => {},
    },
  };
}
```

- [ ] **Step 2: Create app/startup.ts**

```typescript
import type { LayoutEngine } from "@layout/engine";
import type { ModuleManager } from "@host/index";
import { bridge } from "./bridge";

export async function startupPhase1(
  layoutEngine: LayoutEngine,
  moduleManager: ModuleManager,
): Promise<void> {
  // 1. Load layout from storage
  try {
    const saved = localStorage.getItem("willdesk-layout");
    if (saved) {
      const result = layoutEngine.load(JSON.parse(saved));
      if (!result.ok) {
        console.warn("Failed to load layout:", result.message);
      }
    }
  } catch (e) {
    console.warn("Failed to load layout:", e);
  }

  // 2. Discover and register modules
  try {
    const manifests = await bridge.module.list();
    for (const manifest of manifests) {
      // Module factory will be loaded dynamically
      moduleManager.register(manifest, async () => {
        // Placeholder: actual module loading happens here
        return {};
      });
    }
  } catch (e) {
    console.warn("Failed to discover modules:", e);
  }
}

export async function startupPhase2(): Promise<void> {
  // After Vue renders GridCells, create module instances
  // This is called from ModuleLoader.vue when container is ready

  // 3. Register global shortcuts (via bridge)
  // 4. Initialize system tray
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/providers.ts src/app/startup.ts
git commit -m "feat(app): add providers and startup flow"
```

---

### Task 6.3: Refactor app/main.ts

**Files:**
- Modify: `src/app/main.ts` (or create if moving from src/main.ts)

- [ ] **Step 1: Create app/main.ts**

```typescript
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "../App.vue";
import { createLayoutEngine } from "@layout/engine";
import { createModuleManager } from "@host/index";
import { createAppServices, createHostDependencies } from "./providers";
import { startupPhase1 } from "./startup";

async function main() {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);

  // Create core services
  const layoutEngine = createLayoutEngine();
  const moduleManager = createModuleManager();
  const hostDeps = createHostDependencies();
  const appServices = createAppServices();

  // Phase 1: Load layout, discover modules
  await startupPhase1(layoutEngine, moduleManager);

  // Provide services to Vue components
  app.provide("layoutEngine", layoutEngine);
  app.provide("moduleManager", moduleManager);
  app.provide("appServices", appServices);

  app.mount("#app");
}

main().catch(console.error);
```

- [ ] **Step 2: Update src/main.ts to re-export**

```typescript
// Re-export from app/main.ts for backward compatibility
import "./app/main";
```

Or update `index.html` to point to `src/app/main.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/main.ts src/main.ts
git commit -m "feat(app): refactor main.ts with dependency injection"
```

---

## Phase 7: Code Quality Automation

### Task 7.1: Set up lefthook and update npm scripts

**Files:**
- Create: `lefthook.yml`
- Modify: `package.json`

- [ ] **Step 1: Install lefthook**

```bash
npm install -D lefthook
```

- [ ] **Step 2: Create lefthook.yml**

```yaml
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

- [ ] **Step 3: Update package.json scripts**

Add these scripts:
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "type-check": "vue-tsc --noEmit",
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build",
  "rust:fmt": "cargo fmt --manifest-path src-tauri/Cargo.toml",
  "rust:clippy": "cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings",
  "rust:test": "cargo test --manifest-path src-tauri/Cargo.toml"
}
```

- [ ] **Step 4: Commit**

```bash
git add lefthook.yml package.json
git commit -m "chore: set up lefthook and update npm scripts"
```

---

## Phase 8: UI Component Migration (Stub)

### Task 8.1: Migrate GridEngine.vue to use new architecture

**Files:**
- Modify: `src/components/GridEngine.vue` (or move to `src/ui/GridEngine.vue`)

- [ ] **Step 1: Update GridEngine.vue imports**

Replace old imports with new layered imports:
- `@layout/engine` for LayoutEngine
- `@stores/layout` for UI state
- `@app/providers` for AppServices (injected)

- [ ] **Step 2: Use inject for AppServices**

```typescript
const appServices = inject<AppServices>("appServices");
const layoutEngine = inject<LayoutEngine>("layoutEngine");
```

- [ ] **Step 3: Commit**

```bash
git add src/components/GridEngine.vue
git commit -m "refactor(ui): migrate GridEngine to use new layered architecture"
```

---

### Task 8.2: Migrate remaining UI components

**Files:**
- Modify: `src/components/GridCell.vue`
- Modify: `src/components/ModuleLoader.vue`
- Modify: `src/components/TopBar.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: Update each component to use inject for AppServices**

Each component should:
- `inject<AppServices>("appServices")` instead of direct Tauri calls
- Use `@core/*` for types
- Use `@stores/*` for UI state

- [ ] **Step 2: Commit**

```bash
git add src/components/ src/App.vue
git commit -m "refactor(ui): migrate all components to layered architecture"
```

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 0 | 4 | Project setup, aliases, ESLint, Vitest |
| 1 | 5 | core/ protocol layer |
| 2 | 5 | layout/ engine with TDD |
| 3 | 4 | host/ services |
| 4 | 3 | Rust backend refactoring |
| 5 | 2 | shell/ and stores/ |
| 6 | 3 | app/ assembly layer |
| 7 | 1 | Code quality automation |
| 8 | 2 | UI component migration |

**Total: 29 tasks**

Each task produces working, testable software. The plan follows TDD for core logic (layout, permissions, manifest) and pragmatic implementation for UI/assembly layers.

---

*Plan created: 2026-05-11*
