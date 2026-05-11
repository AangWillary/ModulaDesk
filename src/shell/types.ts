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
