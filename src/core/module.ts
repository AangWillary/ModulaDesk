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
