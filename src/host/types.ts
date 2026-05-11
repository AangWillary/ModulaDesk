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
