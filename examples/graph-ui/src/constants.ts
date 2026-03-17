import type { Pos } from "./types";

export const NODE_R = 22;
export const ARROW  = 11;
export const CX = 400;
export const CY = 300;

// Classic print/paper SCC colors — muted, ink-on-paper annotations
export const SCC_PALETTE = [
  { fill: "#fffbeb", stroke: "#b45309", text: "#92400e", cls: "scc0" },
  { fill: "#f0fdf4", stroke: "#15803d", text: "#14532d", cls: "scc1" },
  { fill: "#fdf4ff", stroke: "#9333ea", text: "#6b21a8", cls: "scc2" },
  { fill: "#eff6ff", stroke: "#2563eb", text: "#1e3a8a", cls: "scc3" },
  { fill: "#fff1f2", stroke: "#e11d48", text: "#9f1239", cls: "scc4" },
];

export function circlePos(i: number, n: number, cx: number, cy: number, r: number): Pos {
  const a = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
