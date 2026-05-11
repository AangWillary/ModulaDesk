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
