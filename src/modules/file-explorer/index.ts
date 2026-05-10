import type { Module, ModuleContext, DirEntry } from "../../types/module";

let currentPath = "";
let currentEntries: DirEntry[] = [];
let searchFilter = "";
let ctxRef: ModuleContext | null = null;

function getDesktopPath(): string {
  // Default to home directory; Tauri's read_dir will resolve it
  const isWin = navigator.platform?.toLowerCase().includes("win");
  return isWin ? "C:\\Users" : "/";
}

function getFileIcon(entry: DirEntry): string {
  if (entry.isDir) return "📁";
  const ext = entry.name.split(".").pop()?.toLowerCase() || "";
  const iconMap: Record<string, string> = {
    pdf: "📕",
    doc: "📘",
    docx: "📘",
    xls: "📗",
    xlsx: "📗",
    ppt: "📙",
    pptx: "📙",
    jpg: "🖼️",
    jpeg: "🖼️",
    png: "🖼️",
    gif: "🖼️",
    svg: "🖼️",
    mp3: "🎵",
    wav: "🎵",
    flac: "🎵",
    mp4: "🎬",
    avi: "🎬",
    mkv: "🎬",
    mov: "🎬",
    zip: "📦",
    rar: "📦",
    "7z": "📦",
    tar: "📦",
    gz: "📦",
    exe: "⚙️",
    msi: "⚙️",
    bat: "⚙️",
    sh: "⚙️",
    js: "📜",
    ts: "📜",
    py: "📜",
    rs: "📜",
    html: "🌐",
    css: "🌐",
    json: "📋",
    xml: "📋",
    md: "📝",
    txt: "📝",
    log: "📝",
  };
  return iconMap[ext] || "📄";
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function renderBreadcrumb() {
  const parts = currentPath.split(/[/\\]/).filter(Boolean);
  const isWin = currentPath.includes("\\") || currentPath.match(/^[A-Z]:/);

  let html = '<div class="fe-breadcrumb">';
  html += `<span class="fe-crumb" data-path="${isWin ? parts[0] + "\\" : "/"}">🏠</span>`;

  let accumulated = isWin ? parts[0] + "\\" : "/";
  for (let i = isWin ? 1 : 0; i < parts.length; i++) {
    accumulated += (isWin && i > 0 ? "\\" : isWin ? "" : "/") + parts[i];
    if (i === 0 && isWin) accumulated = parts[0] + "\\";
    html += `<span class="fe-sep">›</span>`;
    html += `<span class="fe-crumb" data-path="${accumulated}">${parts[i]}</span>`;
  }
  html += "</div>";
  return html;
}

function renderFileList() {
  const filtered = searchFilter
    ? currentEntries.filter((e) =>
        e.name.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : currentEntries;

  let html = '<div class="fe-list">';
  if (filtered.length === 0) {
    html += '<div class="fe-empty">空文件夹</div>';
  } else {
    for (const entry of filtered) {
      html += `<div class="fe-item" data-path="${entry.path}" data-isdir="${entry.isDir}">`;
      html += `<span class="fe-icon">${getFileIcon(entry)}</span>`;
      html += `<span class="fe-name" title="${entry.name}">${entry.name}</span>`;
      html += `<span class="fe-size">${entry.isDir ? "" : formatSize(entry.size)}</span>`;
      html += `<span class="fe-time">${entry.modified || ""}</span>`;
      html += "</div>";
    }
  }
  html += "</div>";
  return html;
}

async function navigate(path: string) {
  if (!ctxRef) return;
  try {
    currentPath = path;
    currentEntries = await ctxRef.system.readDir(path);
    searchFilter = "";
    render(ctxRef);
  } catch (e) {
    console.error(`[file-explorer] Failed to navigate to ${path}:`, e);
  }
}

function render(ctx: ModuleContext) {
  const { container } = ctx;

  container.innerHTML = `
    <div class="fe-root">
      <div class="fe-toolbar">
        <button class="fe-btn" id="fe-back">← 返回</button>
        <input class="fe-search" id="fe-search" type="text"
               placeholder="搜索..." value="${searchFilter}" />
      </div>
      ${renderBreadcrumb()}
      ${renderFileList()}
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
    const parts = currentPath.split(/[/\\]/).filter(Boolean);
    if (parts.length <= 1) return;
    const isWin = currentPath.includes("\\") || currentPath.match(/^[A-Z]:/);
    parts.pop();
    const parent = isWin ? parts.join("\\") : "/" + parts.join("/");
    navigate(parent);
  });

  container.querySelector("#fe-search")?.addEventListener("input", (e) => {
    searchFilter = (e.target as HTMLInputElement).value;
    render(ctx);
  });

  container.querySelectorAll(".fe-item").forEach((el) => {
    el.addEventListener("dblclick", () => {
      const path = el.getAttribute("data-path") || "";
      const isDir = el.getAttribute("data-isdir") === "true";
      if (isDir) {
        navigate(path);
      } else {
        ctx.system.openPath(path);
      }
    });
  });

  container.querySelectorAll(".fe-crumb").forEach((el) => {
    el.addEventListener("click", () => {
      const path = el.getAttribute("data-path") || "";
      navigate(path);
    });
  });
}

const fileExplorer: Module = {
  async onInit(ctx: ModuleContext) {
    console.log(`[file-explorer] onInit called, moduleId=${ctx.moduleId}`);
  },

  async onMount(ctx: ModuleContext) {
    console.log(`[file-explorer] onMount called`);
    ctxRef = ctx;

    const startPath =
      (ctx.settings.startPath as string) || getDesktopPath();
    await navigate(startPath);
  },

  async onUnmount() {
    console.log("[file-explorer] onUnmount called");
    ctxRef = null;
  },

  async onDestroy() {
    console.log("[file-explorer] onDestroy called");
    currentPath = "";
    currentEntries = [];
    searchFilter = "";
  },
};

export default fileExplorer;
