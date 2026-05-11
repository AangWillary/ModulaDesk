import type { Permission } from "@core/index";
import type { PermissionPrompt, PermissionRequest } from "./types";

export interface PermissionChecker {
  check(instanceId: string, required: Permission): boolean;
  request(instanceId: string, perm: Permission): Promise<boolean>;
  getGranted(instanceId: string): Permission[];
}

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
