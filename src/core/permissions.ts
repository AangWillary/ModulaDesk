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
