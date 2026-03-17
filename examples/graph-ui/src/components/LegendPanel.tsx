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

  return (
    <div className="legend-panel" style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      zIndex: 10,
      width: "100%",
      maxHeight: minimized ? 32 : 200,
      minWidth: 180,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      background: "#fafaf7",
      border: "1px solid #999",
      boxShadow: "2px 2px 0 #bbb",
      fontSize: 11,
      transition: "max-height 0.15s ease-out",
    }}>
      <div style={{
        background: "#e8e8e0",
        borderBottom: "1px solid #999",
        padding: "3px 8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'IM Fell English', Georgia, serif",
          fontSize: 11,
          fontStyle: "italic",
          color: "#222",
        }}>
          {title}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button 
            className="btn-raised" 
            onClick={() => setMinimized(!minimized)}
            style={{ fontSize: 9, padding: "1px 5px" }}
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? "▲" : "▼"}
          </button>
          {onClose && (
            <button className="btn-raised danger" onClick={onClose} style={{ fontSize: 9, padding: "1px 5px" }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {!minimized && (
        <div style={{
          padding: "6px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 5,
          overflowY: "auto",
          flex: 1,
        }}>
          {items.map(item => (
            <div key={item.key} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: 10,
                fontWeight: 700,
                color: "#1a3a6b",
              }}>
                {item.label}
              </span>
              <span style={{
                fontSize: 10,
                color: "#666",
                fontStyle: "italic",
                paddingLeft: 8,
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
