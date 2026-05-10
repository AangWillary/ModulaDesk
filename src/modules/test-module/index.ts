import type { Module, ModuleContext } from "../../types/module";

const testModule: Module = {
  async onInit(ctx: ModuleContext) {
    console.log(`[test] onInit called, moduleId=${ctx.moduleId}`);
  },

  async onMount(ctx: ModuleContext) {
    console.log(`[test] onMount called, container=${ctx.container.tagName}`);
    ctx.container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;
                  font-family:system-ui;color:#fff;flex-direction:column;gap:8px;">
        <div style="font-size:2rem;">🧪</div>
        <div>测试模块已加载</div>
        <div style="font-size:12px;opacity:0.6;">moduleId: ${ctx.moduleId}</div>
      </div>
    `;
  },

  async onUnmount() {
    console.log("[test] onUnmount called");
  },

  async onDestroy() {
    console.log("[test] onDestroy called");
  },
};

export default testModule;
