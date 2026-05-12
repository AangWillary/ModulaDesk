import type { Module, ModuleContext } from "@core/index";

// Embedded modules don't use the standard lifecycle -
// the ModuleLoader handles window embedding directly.
// This stub is required by the module registry.

const terminal: Module = {
  async onInit(ctx: ModuleContext) {
    console.log(`[terminal] onInit called, moduleId=${ctx.moduleId}`);
  },
};

export default terminal;
