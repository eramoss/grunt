import type { RefObject } from "react";
import type { GraphSnapshot, Pos } from "../types";
import { NODE_R, ARROW, SCC_PALETTE } from "../constants";

interface CanvasProps {
  graph: GraphSnapshot;
  positions: Map<number, Pos>;
  highlighted: Set<number>;
  sccMap: Map<number, number>;
  selected: number | null;
  edgeSrc: number | null;
  pan: { x: number; y: number };
  svgRef: RefObject<SVGSVGElement>;
  onNodeMouseDown: (e: React.MouseEvent, v: number) => void;
  onSVGMouseDown:  (e: React.MouseEvent<SVGSVGElement>) => void;
}

function nodeColor(v: number, sccMap: Map<number, number>, highlighted: Set<number>): string {
  if (sccMap.has(v)) return SCC_PALETTE[sccMap.get(v)! % SCC_PALETTE.length].fill;
  if (highlighted.has(v)) return "#dbeafe";
  return "#ffffff";
}

function nodeStroke(v: number, sccMap: Map<number, number>, highlighted: Set<number>, selected: number | null, edgeSrc: number | null): string {
  if (edgeSrc === v)  return "#b45309";
  if (selected === v) return "#1a3a6b";
  if (sccMap.has(v))  return SCC_PALETTE[sccMap.get(v)! % SCC_PALETTE.length].stroke;
  if (highlighted.has(v)) return "#3b82f6";
  return "#555";
}

function nodeText(v: number, sccMap: Map<number, number>, highlighted: Set<number>, selected: number | null, edgeSrc: number | null): string {
  if (edgeSrc === v)  return "#92400e";
  if (selected === v) return "#1a3a6b";
  if (sccMap.has(v))  return SCC_PALETTE[sccMap.get(v)! % SCC_PALETTE.length].text;
  if (highlighted.has(v)) return "#1e40af";
  return "#111";
}

export default function Canvas({
  graph, positions, highlighted, sccMap, selected, edgeSrc, pan,
  svgRef, onNodeMouseDown, onSVGMouseDown,
}: CanvasProps) {

  const renderEdge = (u: number, v: number, key: string) => {
    const p1 = positions.get(u), p2 = positions.get(v);
    if (!p1 || !p2) return null;
    const directed = graph.directed;
    const isLit = highlighted.has(u) && highlighted.has(v);
    const stroke = isLit ? "#1a3a6b" : "#888";
    const sw     = isLit ? 1.8 : 1.2;

    if (u === v) {
      return (
        <path key={key} pointerEvents="none"
          d={`M ${p1.x - NODE_R},${p1.y} C ${p1.x-55},${p1.y-55} ${p1.x+55},${p1.y-55} ${p1.x+NODE_R},${p1.y}`}
          fill="none" stroke={stroke} strokeWidth={sw}
          markerEnd={directed ? "url(#arrow)" : undefined} />
      );
    }

    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return null;
    const nx = dx / len, ny = dy / len;
    const hasRev = directed && graph.edges.some(([a, b]) => a === v && b === u);

    if (hasRev) {
      const ox = -ny * 8, oy = nx * 8;
      return (
        <line key={key} pointerEvents="none"
          x1={p1.x + nx * NODE_R + ox} y1={p1.y + ny * NODE_R + oy}
          x2={p2.x - nx * (NODE_R + ARROW) + ox} y2={p2.y - ny * (NODE_R + ARROW) + oy}
          stroke={stroke} strokeWidth={sw}
          markerEnd={directed ? "url(#arrow)" : undefined} />
      );
    }

    return (
      <line key={key} pointerEvents="none"
        x1={p1.x + nx * NODE_R} y1={p1.y + ny * NODE_R}
        x2={p2.x - nx * (NODE_R + (directed ? ARROW : 0))} y2={p2.y - ny * (NODE_R + (directed ? ARROW : 0))}
        stroke={stroke} strokeWidth={sw}
        markerEnd={directed ? "url(#arrow)" : undefined} />
    );
  };

  return (
    <svg
      ref={svgRef}
      style={{ width: "100%", height: "100%", display: "block", cursor: "default" }}
      onMouseDown={onSVGMouseDown}
    >
      <defs>
        <pattern id="minor-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="0" cy="0" r="0.5" fill="#ccc" />
        </pattern>
        <pattern id="major-grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <rect width="50" height="50" fill="url(#minor-dots)" />
          <circle cx="0" cy="0" r="1" fill="#bbb" />
        </pattern>
        <marker id="arrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <polygon points="0 1, 6 3.5, 0 6" fill="#888" />
        </marker>
        <marker id="arrow-blue" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <polygon points="0 1, 6 3.5, 0 6" fill="#1a3a6b" />
        </marker>
      </defs>

      <rect width="100%" height="100%" fill="#fff" />
      <rect width="100%" height="100%" fill="url(#major-grid)" />

      <g transform={`translate(${pan.x},${pan.y})`}>

        {graph.edges.map(([u, v]) => renderEdge(u, v, `e-${u}-${v}`))}

        {graph.vertices.map(v => {
          const pos = positions.get(v);
          if (!pos) return null;
          const fill      = nodeColor(v, sccMap, highlighted);
          const stroke    = nodeStroke(v, sccMap, highlighted, selected, edgeSrc);
          const color     = nodeText(v, sccMap, highlighted, selected, edgeSrc);
          const isEdgeSrc  = edgeSrc === v;
          const isSelected = selected === v;
          const sw = (isEdgeSrc || isSelected) ? 2 : 1.5;

          return (
            <g key={v}
               transform={`translate(${pos.x},${pos.y})`}
               style={{ cursor: "pointer" }}
               onMouseDown={e => onNodeMouseDown(e, v)}>

              {isEdgeSrc && (
                <circle r={NODE_R + 6} fill="none"
                  stroke="#b45309" strokeWidth={1}
                  strokeDasharray="4 3" strokeOpacity={0.7} />
              )}

              {isSelected && !isEdgeSrc && (
                <circle r={NODE_R + 4} fill="none"
                  stroke="#1a3a6b" strokeWidth={0.8} strokeOpacity={0.4} />
              )}

              <circle r={NODE_R} fill={fill} stroke={stroke} strokeWidth={sw} />

              <text
                textAnchor="middle" dominantBaseline="central"
                fontSize={11}
                fontFamily="'Courier Prime', 'Courier New', monospace"
                fontWeight={isSelected || isEdgeSrc ? 700 : 400}
                fill={color}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >{v}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
