"use client";

import { useEffect, useRef } from "react";
import { BOUND, makeView, shadeAt, toView, type Vec3 } from "./cortexField";
import s from "./landing.module.css";

const RAMP = ".:-=+*#%@";
const CHARS = `${RAMP}·+●`;
const FIELD_CHAR = CHARS.indexOf("·");
const PULSE_CHAR = CHARS.indexOf("+");
const FONT_PX = 12;
const LINE_PX = 14;
const FRAME_MS = 1000 / 24;

const SHADES = ["#3a3a3a", "#5a5a5a", "#7a7a7a", "#9b9b9b", "#c8c8c8", "#f0f0f0"];
const FIELD = SHADES.length;
const PULSE = FIELD + 1;
const COLORS = [...SHADES, "#272727", "#4a4a4a"];

const ANCHORS: ReadonlyArray<{ p: Vec3; label: string }> = [
  { p: [0.72, 0.42, 0.42], label: "processor.ts · 2h" },
  { p: [-0.45, 0.58, -0.38], label: "tokenRefresh.ts · 5h" },
  { p: [0.15, -0.2, 0.86], label: "semanticFirewall.ts" },
  { p: [-0.95, -0.05, -0.45], label: "simulator.py · 2d" },
];

function hash(c: number, r: number) {
  const n = Math.sin(c * 127.1 + r * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export default function AsciiCortex() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const host = canvas?.parentElement;
    if (!canvas || !ctx || !host) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const family = getComputedStyle(canvas).getPropertyValue("--mono").trim() || "monospace";
    const queues: number[][] = COLORS.map(() => []);
    const pointer = { x: 0, y: 0 };
    const tilt = { x: 0, y: 0 };

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let cellW = 7;
    let originX = 0;
    let originY = 0;
    let scale = 1;
    let elapsed = 0;
    let last = 0;
    let raf = 0;
    let running = false;
    let onScreen = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${FONT_PX}px ${family}`;
      ctx.textBaseline = "top";
      cellW = ctx.measureText("M").width;
      cols = Math.floor(width / cellW);
      rows = Math.floor(height / LINE_PX);
      originX = (width - cols * cellW) / 2;
      originY = (height - rows * LINE_PX) / 2;
      scale = Math.min(width * 0.36, height * 0.38);
    };

    const draw = (time: number) => {
      const view = makeView((reduceMotion ? 0.6 : time * 0.00035) + tilt.x, -0.35 + tilt.y);
      const pulseRadius = BOUND + ((time * 0.0004) % 2.4);

      for (const queue of queues) {
        queue.length = 0;
      }

      for (let r = 0; r < rows; r += 1) {
        const v = -(originY + r * LINE_PX + LINE_PX / 2 - height / 2) / scale;
        for (let c = 0; c < cols; c += 1) {
          const u = (originX + c * cellW + cellW / 2 - width / 2) / scale;
          const shade = shadeAt(view, u, v);
          if (shade >= 0) {
            const bucket = Math.min(SHADES.length - 1, Math.floor(shade * SHADES.length));
            queues[bucket].push(c, r, Math.round(shade * (RAMP.length - 1)));
            continue;
          }

          const dist = Math.sqrt(u * u + v * v);
          if (Math.abs(dist - pulseRadius) < 0.035) {
            queues[PULSE].push(c, r, PULSE_CHAR);
            continue;
          }

          const falloff = Math.max(0, 1 - (dist - 1.1) / 2.6);
          const shimmer = 0.75 + 0.25 * Math.sin(time * 0.0015 + hash(r, c) * 6.283);
          if (hash(c, r) < 0.22 * falloff * shimmer) {
            queues[FIELD].push(c, r, FIELD_CHAR);
          }
        }
      }

      ctx.clearRect(0, 0, width, height);
      queues.forEach((queue, bucket) => {
        ctx.fillStyle = COLORS[bucket];
        for (let i = 0; i < queue.length; i += 3) {
          ctx.fillText(CHARS[queue[i + 2]], originX + queue[i] * cellW, originY + queue[i + 1] * LINE_PX);
        }
      });

      for (const { p, label } of ANCHORS) {
        const [vx, vy, vz] = toView(view, p);
        if (vz > -0.2) {
          continue;
        }
        const col = Math.round((width / 2 + vx * scale - originX) / cellW);
        const row = Math.round((height / 2 - vy * scale - originY) / LINE_PX);
        const labelCol = col + 2 + label.length <= cols ? col + 2 : col - 1 - label.length;
        const x = originX + labelCol * cellW;
        const y = originY + row * LINE_PX;
        ctx.fillStyle = "#000000";
        ctx.fillRect(x - cellW / 2, y - 1, (label.length + 1) * cellW, LINE_PX);
        ctx.fillStyle = "#9b9b9b";
        ctx.fillText(label, x, y);
        ctx.fillStyle = "#f0f0f0";
        ctx.fillText("●", originX + col * cellW, y);
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const delta = now - last;
      if (delta < FRAME_MS) {
        return;
      }
      last = now;
      elapsed += Math.min(delta, 100);
      tilt.x += (pointer.x * 0.6 - tilt.x) * 0.08;
      tilt.y += (pointer.y * 0.3 - tilt.y) * 0.08;
      draw(elapsed);
    };

    const start = () => {
      if (running || reduceMotion || !onScreen || document.hidden) {
        return;
      }
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width - 0.5;
      pointer.y = (event.clientY - rect.top) / rect.height - 0.5;
    };

    const onPointerLeave = () => {
      pointer.x = 0;
      pointer.y = 0;
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw(elapsed);
    });

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) {
        start();
      } else {
        stop();
      }
    });

    let disposed = false;
    document.fonts.load(`${FONT_PX}px ${family}`).finally(() => {
      if (disposed) {
        return;
      }
      resizeObserver.observe(canvas);
      intersectionObserver.observe(canvas);
    });

    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />;
}
