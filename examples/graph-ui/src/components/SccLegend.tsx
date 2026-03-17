import type { ConnectivityResult } from "../types";
import { SCC_PALETTE } from "../constants";

interface SccLegendProps {
  data: ConnectivityResult;
  directed: boolean;
  onClose: () => void;
}

export default function SccLegend({ data, directed, onClose }: SccLegendProps) {
  return (
    <div className="scc-legend">

      {/* Header — like a figure box title */}
      <div style={{
        background: "#e8e8e0",
        borderBottom: "1px solid #999",
        padding: "3px 8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}>
        <span style={{
          fontFamily: "'IM Fell English', Georgia, serif",
          fontSize: 11,
          fontStyle: "italic",
          color: "#222",
        }}>
          Connectivity Analysis
        </span>
        <button className="btn-raised danger" onClick={onClose} style={{ fontSize: 9, padding: "1px 5px" }}>✕</button>
      </div>

      {/* Status line */}
      <div style={{ padding: "4px 8px 2px", borderBottom: "1px solid #ddd" }}>
        <span className={data.is_connected ? "status-ok" : "status-err"} style={{ fontSize: 11 }}>
          {data.is_connected ? "✓ Graph is connected" : "✗ Graph is not connected"}
        </span>
      </div>

      {/* Component count */}
      <div style={{ padding: "3px 8px 2px" }}>
        <span style={{ fontSize: 10, color: "#666", fontStyle: "italic" }}>
          {data.components.length} {directed ? "strongly connected" : "connected"} component{data.components.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Legend rows — scrollable list capped by .scc-legend-items max-height */}
      <div className="scc-legend-items">
        {data.components.map((comp, idx) => {
          const pal = SCC_PALETTE[idx % SCC_PALETTE.length];
          return (
            <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Row header */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {/* Color swatch */}
                <span style={{
                  display: "inline-block",
                  width: 10, height: 10,
                  background: pal.fill,
                  border: `1.5px solid ${pal.stroke}`,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  color: pal.stroke,
                  letterSpacing: "0.05em",
                }}>
                  {directed ? "SCC" : "C"}{idx + 1}
                </span>
                <span style={{ fontSize: 9, color: "#aaa", marginLeft: "auto" }}>|V| = {comp.length}</span>
              </div>
              {/* Vertex tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, paddingLeft: 15 }}>
                {comp.map(v => (
                  <span key={v} style={{
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "0 4px",
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
