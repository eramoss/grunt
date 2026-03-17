interface OrderBannerProps {
  label: string;
  items: { v: number; idx?: number }[];
  onClose: () => void;
}

export default function OrderBanner({ label, items, onClose }: OrderBannerProps) {
  return (
    <div className="order-banner">

      {/* Label — figure caption style */}
      <span style={{
        fontFamily: "'IM Fell English', Georgia, serif",
        fontSize: 11,
        fontStyle: "italic",
        color: "#444",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}>
        {label}:
      </span>

      <span style={{ color: "#bbb", flexShrink: 0, fontSize: 11 }}>│</span>

      {/* Sequence */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, overflowX: "auto", scrollbarWidth: "none" }}>
        {items.length === 0
          ? <span style={{ fontFamily: "monospace", fontSize: 11, color: "#888", fontStyle: "italic" }}>∅</span>
          : items.map(({ v, idx }, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                {idx !== undefined && (
                  <span style={{ fontFamily: "monospace", fontSize: 9, color: "#aaa" }}>{idx}.</span>
                )}
                <span style={{
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "0 5px",
                  border: "1px solid #1a3a6b",
                  color: "#1a3a6b",
                  background: "#eff6ff",
                }}>{v}</span>
                {idx !== undefined && i < items.length - 1 && (
                  <span style={{ color: "#aaa", fontSize: 10, marginLeft: 1 }}>→</span>
                )}
              </span>
            ))
        }
      </div>

      <button
        onClick={onClose}
        className="btn-raised danger"
        style={{ flexShrink: 0, marginLeft: 6, fontSize: 10 }}
      >
        ✕ dismiss
      </button>
    </div>
  );
}
