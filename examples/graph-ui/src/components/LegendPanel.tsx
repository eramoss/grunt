import { useState } from "react";

export interface LegendItem {
  key: string;
  label: string;
  description: string;
}

interface LegendPanelProps {
  title: string;
  items: LegendItem[];
  onClose?: () => void;
}

export default function LegendPanel({ title, items, onClose }: LegendPanelProps) {
  const [minimized, setMinimized] = useState(false);
  const s = "var(--ui-scale, 1)";

  return (
    <div className="legend-panel" style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      zIndex: 10,
      width: "100%",
      maxHeight: minimized ? `calc(32px * ${s})` : `calc(200px * ${s})`,
      minWidth: `calc(180px * ${s})`,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      background: "#fafaf7",
      border: "1px solid #999",
      boxShadow: "2px 2px 0 #bbb",
      fontSize: `calc(11px * ${s})`,
      transition: "max-height 0.15s ease-out",
    }}>
      <div style={{
        background: "#e8e8e0",
        borderBottom: "1px solid #999",
        padding: `calc(3px * ${s}) calc(8px * ${s})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: `calc(8px * ${s})`,
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'IM Fell English', Georgia, serif",
          fontSize: `calc(11px * ${s})`,
          fontStyle: "italic",
          color: "#222",
        }}>
          {title}
        </span>
        <div style={{ display: "flex", gap: `calc(4px * ${s})` }}>
          <button 
            className="btn-raised" 
            onClick={() => setMinimized(!minimized)}
            style={{ fontSize: `calc(9px * ${s})`, padding: `calc(1px * ${s}) calc(5px * ${s})` }}
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? "▲" : "▼"}
          </button>
          {onClose && (
            <button className="btn-raised danger" onClick={onClose} style={{ fontSize: `calc(9px * ${s})`, padding: `calc(1px * ${s}) calc(5px * ${s})` }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {!minimized && (
        <div style={{
          padding: `calc(6px * ${s}) calc(10px * ${s})`,
          display: "flex",
          flexDirection: "column",
          gap: `calc(5px * ${s})`,
          overflowY: "auto",
          flex: 1,
        }}>
          {items.map(item => (
            <div key={item.key} style={{ display: "flex", flexDirection: "column", gap: `calc(2px * ${s})` }}>
              <span style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: `calc(10px * ${s})`,
                fontWeight: 700,
                color: "#1a3a6b",
              }}>
                {item.label}
              </span>
              <span style={{
                fontSize: `calc(10px * ${s})`,
                color: "#666",
                fontStyle: "italic",
                paddingLeft: `calc(8px * ${s})`,
              }}>
                {item.description}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
