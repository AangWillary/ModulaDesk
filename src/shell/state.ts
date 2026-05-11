import type { ShellState } from "./types";

export function createShellState(): ShellState {
  return {
    visible: true,
    layoutLocked: false,
  };
}
