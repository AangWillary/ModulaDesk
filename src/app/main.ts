import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "../App.vue";
import { createLayoutEngine } from "@layout/engine";
import { createModuleManager } from "@host/index";
import { createAppServices, createHostDependencies } from "./providers";
import { startupPhase1 } from "./startup";

async function main() {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);

  // Create core services
  const layoutEngine = createLayoutEngine();
  const moduleManager = createModuleManager();
  const hostDeps = createHostDependencies();
  const appServices = createAppServices();

  // Phase 1: Load layout, discover modules
  await startupPhase1(layoutEngine, moduleManager);

  // Provide services to Vue components
  app.provide("layoutEngine", layoutEngine);
  app.provide("moduleManager", moduleManager);
  app.provide("appServices", appServices);

  app.mount("#app");
}

main().catch(console.error);
