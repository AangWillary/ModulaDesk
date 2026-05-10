import type { Module, ModuleContext } from "../../types/module";

let timer: ReturnType<typeof setInterval> | undefined;

const clock: Module = {
  async onInit(ctx: ModuleContext) {
    console.log(`[clock] onInit called, moduleId=${ctx.moduleId}`);
  },

  async onMount(ctx: ModuleContext) {
    console.log(`[clock] onMount called, container=${ctx.container.tagName}`);

    const { container, settings } = ctx;

    container.innerHTML = `
      <div class="clock-widget">
        <div class="clock-time" id="time">--:--</div>
        <div class="clock-date" id="date">----/--/--</div>
      </div>
      <style>
        .clock-widget {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          font-family: 'Segoe UI', sans-serif;
          color: #fff;
          text-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .clock-time {
          font-size: 3rem;
          font-weight: 300;
          letter-spacing: 2px;
        }
        .clock-date {
          font-size: 0.9rem;
          opacity: 0.8;
          margin-top: 4px;
        }
      </style>
    `;

    const update = () => {
      const now = new Date();
      const timeEl = container.querySelector("#time");
      const dateEl = container.querySelector("#date");
      if (!timeEl || !dateEl) return;

      const use24h = settings.format24h !== false;
      const showSec = settings.showSeconds === true;

      let hours = now.getHours();
      const ampm = use24h ? "" : hours >= 12 ? " PM" : " AM";
      if (!use24h) hours = hours % 12 || 12;

      const h = String(hours).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");

      timeEl.textContent = showSec
        ? `${h}:${m}:${s}${ampm}`
        : `${h}:${m}${ampm}`;
      dateEl.textContent = now.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      });
    };

    update();
    timer = setInterval(update, 1000);
  },

  async onUnmount() {
    console.log("[clock] onUnmount called");
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
  },

  async onDestroy() {
    console.log("[clock] onDestroy called");
  },

  onSettingsChange(key: string, value: unknown) {
    console.log(`[clock] settings changed: ${key}=${String(value)}`);
  },

  onResize(width: number, height: number) {
    console.log(`[clock] resized: ${width}x${height}`);
  },
};

export default clock;
