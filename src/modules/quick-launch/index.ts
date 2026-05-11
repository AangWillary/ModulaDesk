import type { Module, ModuleContext } from "../../types/module";
import { escapeHtml, genId } from "../../utils/html";

interface LaunchItem {
  id: string;
  name: string;
  icon: string;
  url: string;
  type: "url" | "path";
}

interface QuickLaunchState {
  items: LaunchItem[];
  showAdd: boolean;
}

async function loadItems(ctx: ModuleContext): Promise<LaunchItem[]> {
  return (
    (await ctx.storage.get<LaunchItem[]>("items")) || [
      { id: "gh", name: "GitHub", icon: "🐙", url: "https://github.com", type: "url" },
      { id: "yt", name: "YouTube", icon: "▶️", url: "https://youtube.com", type: "url" },
    ]
  );
}

async function saveItems(ctx: ModuleContext, items: LaunchItem[]) {
  await ctx.storage.set("items", items);
}

function render(ctx: ModuleContext, state: QuickLaunchState) {
  const { container } = ctx;
  const { items, showAdd } = state;

  const gridHtml = items
    .map(
      (item) => `
    <div class="ql-item" data-id="${escapeHtml(item.id)}" data-url="${escapeHtml(item.url)}" data-type="${escapeHtml(item.type)}">
      <span class="ql-icon">${item.icon}</span>
      <span class="ql-name">${escapeHtml(item.name)}</span>
      <button class="ql-del" data-id="${escapeHtml(item.id)}">×</button>
    </div>
  `
    )
    .join("");

  const addFormHtml = showAdd
    ? `
    <div class="ql-add-form">
      <input class="ql-input" id="ql-name" placeholder="名称" />
      <input class="ql-input" id="ql-url" placeholder="URL 或路径" />
      <button class="ql-btn ql-btn-add" id="ql-confirm">添加</button>
      <button class="ql-btn" id="ql-cancel">取消</button>
    </div>`
    : "";

  container.innerHTML = `
    <div class="ql-root">
      <div class="ql-grid">${gridHtml}</div>
      ${addFormHtml}
      <div class="ql-footer">
        <button class="ql-btn ql-btn-add" id="ql-add">+ 添加</button>
      </div>
    </div>
    <style>
      .ql-root { display:flex; flex-direction:column; height:100%;
                 font-family:'Segoe UI',system-ui,sans-serif; font-size:13px; color:#e0e0e0; }
      .ql-grid { flex:1; display:flex; flex-wrap:wrap; gap:8px; padding:8px;
                 align-content:flex-start; overflow:auto; }
      .ql-item { display:flex; flex-direction:column; align-items:center; justify-content:center;
                 width:72px; height:72px; border-radius:8px; cursor:pointer; position:relative;
                 background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06);
                 transition:background 0.15s; gap:4px; }
      .ql-item:hover { background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.12); }
      .ql-icon { font-size:24px; }
      .ql-name { font-size:10px; overflow:hidden; text-overflow:ellipsis;
                 white-space:nowrap; max-width:64px; text-align:center; }
      .ql-del { position:absolute; top:2px; right:2px; background:none; border:none;
                color:rgba(255,255,255,0.2); cursor:pointer; font-size:14px;
                padding:0 2px; line-height:1; border-radius:3px; display:none; }
      .ql-item:hover .ql-del { display:block; }
      .ql-del:hover { color:#f87171; background:rgba(248,113,113,0.15); }
      .ql-footer { padding:6px 8px; border-top:1px solid rgba(255,255,255,0.06); }
      .ql-btn { padding:4px 10px; border:1px solid rgba(255,255,255,0.12);
                border-radius:4px; background:rgba(255,255,255,0.06);
                color:#e0e0e0; cursor:pointer; font-size:12px; }
      .ql-btn:hover { background:rgba(255,255,255,0.12); }
      .ql-btn-add { background:rgba(59,130,246,0.5); border-color:rgba(59,130,246,0.3); }
      .ql-btn-add:hover { background:rgba(59,130,246,0.7); }
      .ql-add-form { padding:8px; display:flex; gap:6px; align-items:center;
                     border-top:1px solid rgba(255,255,255,0.06); flex-wrap:wrap; }
      .ql-input { flex:1; min-width:80px; padding:4px 8px;
                  border:1px solid rgba(255,255,255,0.12); border-radius:4px;
                  background:rgba(255,255,255,0.06); color:#e0e0e0;
                  font-size:12px; outline:none; }
      .ql-input:focus { border-color:rgba(59,130,246,0.5); }
    </style>
  `;

  container.querySelectorAll(".ql-item").forEach((el) => {
    el.addEventListener("dblclick", () => {
      const url = el.getAttribute("data-url") || "";
      const type = el.getAttribute("data-type");
      if (type === "url") {
        window.open(url, "_blank");
      } else {
        ctx.system.openPath(url);
      }
    });
  });

  container.querySelectorAll(".ql-del").forEach((el) => {
    el.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = (e.target as HTMLElement).getAttribute("data-id");
      state.items = state.items.filter((i) => i.id !== id);
      await saveItems(ctx, state.items);
      render(ctx, state);
    });
  });

  container.querySelector("#ql-add")?.addEventListener("click", () => {
    state.showAdd = true;
    render(ctx, state);
  });

  container.querySelector("#ql-cancel")?.addEventListener("click", () => {
    state.showAdd = false;
    render(ctx, state);
  });

  container.querySelector("#ql-confirm")?.addEventListener("click", async () => {
    const nameInput = container.querySelector("#ql-name") as HTMLInputElement;
    const urlInput = container.querySelector("#ql-url") as HTMLInputElement;
    const name = nameInput?.value.trim();
    const url = urlInput?.value.trim();
    if (!name || !url) return;

    const isUrl = url.startsWith("http://") || url.startsWith("https://");
    state.items.push({
      id: genId(),
      name,
      icon: isUrl ? "🌐" : "📄",
      url,
      type: isUrl ? "url" : "path",
    });
    await saveItems(ctx, state.items);
    state.showAdd = false;
    render(ctx, state);
  });
}

const quickLaunch: Module = {
  async onInit(ctx: ModuleContext) {
    console.log(`[quick-launch] onInit called, moduleId=${ctx.moduleId}, instanceId=${ctx.instanceId}`);
  },

  async onMount(ctx: ModuleContext) {
    console.log(`[quick-launch] onMount called`);
    const items = await loadItems(ctx);
    const state: QuickLaunchState = { items, showAdd: false };
    render(ctx, state);
  },

  async onUnmount() {
    console.log("[quick-launch] onUnmount called");
  },

  async onDestroy() {
    console.log("[quick-launch] onDestroy called");
  },
};

export default quickLaunch;
