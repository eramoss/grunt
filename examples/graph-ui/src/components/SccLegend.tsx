import type { ConnectivityResult } from "../types";
import { SCC_PALETTE } from "../constants";

interface SccLegendProps {
  data: ConnectivityResult;
  directed: boolean;
  onClose: () => void;
}

export default function SccLegend({ data, directed, onClose }: SccLegendProps) {
  const s = "var(--ui-scale, 1)";

  return (
    <div className="scc-legend">

      {/* Header — like a figure box title */}
      <div style={{
        background: "#e8e8e0",
        borderBottom: "1px solid #999",
        padding: `calc(3px * ${s}) calc(8px * ${s})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: `calc(8px * ${s})`,
      }}>
        <span style={{
          fontFamily: "'IM Fell English', Georgia, serif",
          fontSize: `calc(11px * ${s})`,
          fontStyle: "italic",
          color: "#222",
        }}>
          Connectivity Analysis
        </span>
        <button className="btn-raised danger" onClick={onClose} style={{ fontSize: `calc(9px * ${s})`, padding: `calc(1px * ${s}) calc(5px * ${s})` }}>✕</button>
      </div>

      {/* Status line */}
      <div style={{ padding: `calc(4px * ${s}) calc(8px * ${s}) calc(2px * ${s})`, borderBottom: "1px solid #ddd" }}>
        <span className={data.is_connected ? "status-ok" : "status-err"} style={{ fontSize: `calc(11px * ${s})` }}>
          {data.is_connected ? "✓ Graph is connected" : "✗ Graph is not connected"}
        </span>
      </div>

      {/* Component count */}
      <div style={{ padding: `calc(3px * ${s}) calc(8px * ${s}) calc(2px * ${s})` }}>
        <span style={{ fontSize: `calc(10px * ${s})`, color: "#666", fontStyle: "italic" }}>
          {data.components.length} {directed ? "strongly connected" : "connected"} component{data.components.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Legend rows — scrollable list capped by .scc-legend-items max-height */}
      <div className="scc-legend-items">
        {data.components.map((comp, idx) => {
          const pal = SCC_PALETTE[idx % SCC_PALETTE.length];
          return (
            <div key={idx} style={{ display: "flex", flexDirection: "column", gap: `calc(3px * ${s})` }}>
              {/* Row header */}
              <div style={{ display: "flex", alignItems: "center", gap: `calc(5px * ${s})` }}>
                {/* Color swatch */}
                <span style={{
                  display: "inline-block",
                  width: `calc(10px * ${s})`, height: `calc(10px * ${s})`,
                  background: pal.fill,
                  border: `1.5px solid ${pal.stroke}`,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: "monospace",
                  fontSize: `calc(10px * ${s})`,
                  fontWeight: 700,
                  color: pal.stroke,
                  letterSpacing: "0.05em",
                }}>
                  {directed ? "SCC" : "C"}{idx + 1}
                </span>
                <span style={{ fontSize: `calc(9px * ${s})`, color: "#aaa", marginLeft: "auto" }}>|V| = {comp.length}</span>
              </div>
              {/* Vertex tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: `calc(3px * ${s})`, paddingLeft: `calc(15px * ${s})` }}>
                {comp.map(v => (
                  <span key={v} style={{
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: `calc(10px * ${s})`,
                    fontWeight: 700,
                    padding: `0 calc(4px * ${s})`,
                    background: pal.fill,
                    border: `1px solid ${pal.stroke}`,
                    color: pal.text,
                  }}>{v}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
