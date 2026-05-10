import type { Module, ModuleContext } from "../../types/module";

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

let todos: TodoItem[] = [];

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function loadTodos(ctx: ModuleContext) {
  const saved = await ctx.storage.get<TodoItem[]>("todos");
  todos = saved || [];
}

async function saveTodos(ctx: ModuleContext) {
  await ctx.storage.set("todos", todos);
}

function render(ctx: ModuleContext) {
  const { container } = ctx;

  const listHtml = todos
    .map(
      (t) => `
    <div class="todo-item" data-id="${t.id}">
      <input type="checkbox" class="todo-check" ${t.done ? "checked" : ""} />
      <span class="todo-text ${t.done ? "todo-done" : ""}">${t.text}</span>
      <button class="todo-del" data-id="${t.id}">×</button>
    </div>
  `
    )
    .join("");

  container.innerHTML = `
    <div class="todo-root">
      <div class="todo-input-row">
        <input class="todo-input" id="todo-input" type="text"
               placeholder="添加待办..." />
      </div>
      <div class="todo-list">${listHtml || '<div class="todo-empty">暂无待办</div>'}</div>
      <div class="todo-footer">${todos.filter((t) => !t.done).length} 项未完成</div>
    </div>
    <style>
      .todo-root { display:flex; flex-direction:column; height:100%;
                   font-family:'Segoe UI',system-ui,sans-serif; font-size:13px; color:#e0e0e0; }
      .todo-input-row { padding:8px; border-bottom:1px solid rgba(255,255,255,0.06); }
      .todo-input { width:100%; padding:6px 10px; border:1px solid rgba(255,255,255,0.12);
                    border-radius:6px; background:rgba(255,255,255,0.06); color:#e0e0e0;
                    font-size:13px; outline:none; box-sizing:border-box; }
      .todo-input:focus { border-color:rgba(59,130,246,0.5); }
      .todo-list { flex:1; overflow:auto; padding:4px 0; }
      .todo-item { display:flex; align-items:center; gap:8px; padding:6px 8px;
                   transition:background 0.1s; }
      .todo-item:hover { background:rgba(255,255,255,0.04); }
      .todo-check { cursor:pointer; accent-color:rgba(59,130,246,0.8); }
      .todo-text { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .todo-done { text-decoration:line-through; opacity:0.5; }
      .todo-del { background:none; border:none; color:rgba(255,255,255,0.3);
                  cursor:pointer; font-size:16px; padding:0 4px; line-height:1;
                  border-radius:3px; }
      .todo-del:hover { color:#f87171; background:rgba(248,113,113,0.1); }
      .todo-empty { padding:20px; text-align:center; color:rgba(255,255,255,0.3); }
      .todo-footer { padding:6px 8px; font-size:11px; color:rgba(255,255,255,0.3);
                     border-top:1px solid rgba(255,255,255,0.06); }
    </style>
  `;

  const input = container.querySelector("#todo-input") as HTMLInputElement;
  input?.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      todos.push({ id: genId(), text: input.value.trim(), done: false });
      await saveTodos(ctx);
      render(ctx);
    }
  });

  container.querySelectorAll(".todo-check").forEach((el) => {
    el.addEventListener("change", async (e) => {
      const id = (e.target as HTMLElement).closest(".todo-item")?.getAttribute("data-id");
      const item = todos.find((t) => t.id === id);
      if (item) {
        item.done = (e.target as HTMLInputElement).checked;
        await saveTodos(ctx);
        render(ctx);
      }
    });
  });

  container.querySelectorAll(".todo-del").forEach((el) => {
    el.addEventListener("click", async (e) => {
      const id = (e.target as HTMLElement).getAttribute("data-id");
      todos = todos.filter((t) => t.id !== id);
      await saveTodos(ctx);
      render(ctx);
    });
  });
}

const todoModule: Module = {
  async onInit(ctx: ModuleContext) {
    console.log(`[todo] onInit called, moduleId=${ctx.moduleId}`);
  },

  async onMount(ctx: ModuleContext) {
    console.log(`[todo] onMount called`);
    await loadTodos(ctx);
    render(ctx);
  },

  async onUnmount() {
    console.log("[todo] onUnmount called");
  },

  async onDestroy() {
    console.log("[todo] onDestroy called");
    todos = [];
  },
};

export default todoModule;
