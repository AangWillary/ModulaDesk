import type { Module, ModuleContext, DirEntry } from "../../types/module";
import { escapeHtml } from "../../utils/html";

interface ExplorerState {
  currentPath: string;
  entries: DirEntry[];
  searchFilter: string;
}

function getDesktopPath(): string {
  const isWin = navigator.platform?.toLowerCase().includes("win");
  return isWin ? "C:\\Users" : "/";
}

function getFileIcon(entry: DirEntry): string {
  if (entry.isDir) return "📁";
  const ext = entry.name.split(".").pop()?.toLowerCase() || "";
  const iconMap: Record<string, string> = {
    pdf: "📕", doc: "📘", docx: "📘", xls: "📗", xlsx: "📗",
    ppt: "📙", pptx: "📙", jpg: "🖼️", jpeg: "🖼️", png: "🖼️",
    gif: "🖼️", svg: "🖼️", mp3: "🎵", wav: "🎵", flac: "🎵",
    mp4: "🎬", avi: "🎬", mkv: "🎬", mov: "🎬", zip: "📦",
    rar: "📦", "7z": "📦", tar: "📦", gz: "📦", exe: "⚙️",
    msi: "⚙️", bat: "⚙️", sh: "⚙️", js: "📜", ts: "📜",
    py: "📜", rs: "📜", html: "🌐", css: "🌐", json: "📋",
    xml: "📋", md: "📝", txt: "📝", log: "📝",
  };
  return iconMap[ext] || "📄";
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function renderBreadcrumb(path: string) {
  const parts = path.split(/[/\\]/).filter(Boolean);
  const isWin = path.includes("\\") || path.match(/^[A-Z]:/);

  let html = '<div class="fe-breadcrumb">';
  html += `<span class="fe-crumb" data-path="${escapeHtml(isWin ? parts[0] + "\\" : "/")}">🏠</span>`;

  let accumulated = isWin ? parts[0] + "\\" : "/";
  for (let i = isWin ? 1 : 0; i < parts.length; i++) {
    accumulated += (isWin && i > 0 ? "\\" : isWin ? "" : "/") + parts[i];
    if (i === 0 && isWin) accumulated = parts[0] + "\\";
    html += `<span class="fe-sep">›</span>`;
    html += `<span class="fe-crumb" data-path="${escapeHtml(accumulated)}">${escapeHtml(parts[i])}</span>`;
  }
  html += "</div>";
  return html;
}

function renderFileList(entries: DirEntry[], searchFilter: string) {
  const filtered = searchFilter
    ? entries.filter((e) =>
        e.name.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : entries;

  let html = '<div class="fe-list">';
  if (filtered.length === 0) {
    html += '<div class="fe-empty">空文件夹</div>';
  } else {
    for (const entry of filtered) {
      html += `<div class="fe-item" data-path="${escapeHtml(entry.path)}" data-isdir="${entry.isDir}">`;
      html += `<span class="fe-icon">${getFileIcon(entry)}</span>`;
      html += `<span class="fe-name" title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</span>`;
      html += `<span class="fe-size">${entry.isDir ? "" : formatSize(entry.size)}</span>`;
      html += `<span class="fe-time">${entry.modified || ""}</span>`;
      html += "</div>";
    }
  }
  html += "</div>";
  return html;
}

async function navigate(ctx: ModuleContext, state: ExplorerState, path: string) {
  try {
    state.currentPath = path;
    state.entries = await ctx.system.readDir(path);
    state.searchFilter = "";
    render(ctx, state);
  } catch (e) {
    console.error(`[file-explorer] Failed to navigate to ${path}:`, e);
  }
}

function render(ctx: ModuleContext, state: ExplorerState) {
  const { container } = ctx;

  container.innerHTML = `
    <div class="fe-root">
      <div class="fe-toolbar">
        <button class="fe-btn" id="fe-back">← 返回</button>
        <input class="fe-search" id="fe-search" type="text"
               placeholder="搜索..." value="${escapeHtml(state.searchFilter)}" />
      </div>
      ${renderBreadcrumb(state.currentPath)}
      ${renderFileList(state.entries, state.searchFilter)}
    </div>
    <style>
      .fe-root { display:flex; flex-direction:column; height:100%;
                 font-family:'Segoe UI',system-ui,sans-serif; font-size:13px; color:#e0e0e0; }
      .fe-toolbar { display:flex; gap:8px; padding:6px 8px;
                    border-bottom:1px solid rgba(255,255,255,0.06); }
      .fe-btn { padding:4px 10px; border:1px solid rgba(255,255,255,0.12);
                border-radius:4px; background:rgba(255,255,255,0.06);
                color:#e0e0e0; cursor:pointer; font-size:12px; }
      .fe-btn:hover { background:rgba(255,255,255,0.12); }
      .fe-search { flex:1; padding:4px 8px; border:1px solid rgba(255,255,255,0.12);
                   border-radius:4px; background:rgba(255,255,255,0.06);
                   color:#e0e0e0; font-size:12px; outline:none; }
      .fe-search:focus { border-color:rgba(59,130,246,0.5); }
      .fe-breadcrumb { display:flex; align-items:center; gap:2px; padding:6px 8px;
                       border-bottom:1px solid rgba(255,255,255,0.06);
                       font-size:12px; overflow-x:auto; white-space:nowrap; }
      .fe-crumb { cursor:pointer; padding:2px 4px; border-radius:3px; }
      .fe-crumb:hover { background:rgba(255,255,255,0.1); }
      .fe-sep { color:rgba(255,255,255,0.3); }
      .fe-list { flex:1; overflow:auto; padding:4px 0; }
      .fe-item { display:flex; align-items:center; gap:8px; padding:5px 8px;
                 cursor:pointer; transition:background 0.1s; }
      .fe-item:hover { background:rgba(255,255,255,0.06); }
      .fe-icon { font-size:16px; width:20px; text-align:center; flex-shrink:0; }
      .fe-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .fe-size { width:60px; text-align:right; font-size:11px;
                 color:rgba(255,255,255,0.4); flex-shrink:0; }
      .fe-time { width:100px; text-align:right; font-size:11px;
                 color:rgba(255,255,255,0.4); flex-shrink:0; }
      .fe-empty { padding:20px; text-align:center; color:rgba(255,255,255,0.3); }
    </style>
  `;

  container.querySelector("#fe-back")?.addEventListener("click", () => {
    const parts = state.currentPath.split(/[/\\]/).filter(Boolean);
    if (parts.length <= 1) return;
    const isWin = state.currentPath.includes("\\") || state.currentPath.match(/^[A-Z]:/);
    parts.pop();
    const parent = isWin ? parts.join("\\") : "/" + parts.join("/");
    navigate(ctx, state, parent);
  });

  container.querySelector("#fe-search")?.addEventListener("input", (e) => {
    state.searchFilter = (e.target as HTMLInputElement).value;
    render(ctx, state);
  });

  container.querySelectorAll(".fe-item").forEach((el) => {
    el.addEventListener("dblclick", () => {
      const path = el.getAttribute("data-path") || "";
      const isDir = el.getAttribute("data-isdir") === "true";
      if (isDir) {
        navigate(ctx, state, path);
      } else {
        ctx.system.openPath(path);
      }
    });
  });

  container.querySelectorAll(".fe-crumb").forEach((el) => {
    el.addEventListener("click", () => {
      const path = el.getAttribute("data-path") || "";
      navigate(ctx, state, path);
    });
  });
}

const fileExplorer: Module = {
  async onInit(ctx: ModuleContext) {
    console.log(`[file-explorer] onInit called, moduleId=${ctx.moduleId}, instanceId=${ctx.instanceId}`);
  },

  async onMount(ctx: ModuleContext) {
    console.log(`[file-explorer] onMount called`);
    const state: ExplorerState = {
      currentPath: "",
      entries: [],
      searchFilter: "",
    };
    const startPath =
      (ctx.settings.startPath as string) || getDesktopPath();
    await navigate(ctx, state, startPath);
  },

  async onUnmount() {
    console.log("[file-explorer] onUnmount called");
  },

  async onDestroy() {
    console.log("[file-explorer] onDestroy called");
  },
};

export default fileExplorer;
