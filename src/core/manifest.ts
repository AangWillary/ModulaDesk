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
    return {
      ok: false,
      error: `type must be one of: ${VALID_TYPES.join(", ")}`,
    };
  }

  // Validate grid
  const grid = m.grid as Record<string, unknown> | undefined;
  if (!grid || typeof grid !== "object") {
    return { ok: false, error: "grid must be an object" };
  }

  const gridFields = [
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
    "defaultWidth",
    "defaultHeight",
  ];
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
