interface OrderBannerProps {
  label: string;
  items: { v: number; idx?: number }[];
  onClose: () => void;
}

export default function OrderBanner({ label, items, onClose }: OrderBannerProps) {
  const s = "var(--ui-scale, 1)";

  return (
    <div className="order-banner">

      {/* Label — figure caption style */}
      <span style={{
        fontFamily: "'IM Fell English', Georgia, serif",
        fontSize: `calc(11px * ${s})`,
        fontStyle: "italic",
        color: "#444",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}>
        {label}:
      </span>

      <span style={{ color: "#bbb", flexShrink: 0, fontSize: `calc(11px * ${s})` }}>│</span>

      {/* Sequence */}
      <div style={{ display: "flex", alignItems: "center", gap: `calc(4px * ${s})`, flex: 1, overflowX: "auto", scrollbarWidth: "none" }}>
        {items.length === 0
          ? <span style={{ fontFamily: "monospace", fontSize: `calc(11px * ${s})`, color: "#888", fontStyle: "italic" }}>∅</span>
          : items.map(({ v, idx }, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: `calc(2px * ${s})`, flexShrink: 0 }}>
                {idx !== undefined && (
                  <span style={{ fontFamily: "monospace", fontSize: `calc(9px * ${s})`, color: "#aaa" }}>{idx}.</span>
                )}
                <span style={{
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: `calc(11px * ${s})`,
                  fontWeight: 700,
                  padding: `0 calc(5px * ${s})`,
                  border: "1px solid #1a3a6b",
                  color: "#1a3a6b",
                  background: "#eff6ff",
                }}>{v}</span>
                {idx !== undefined && i < items.length - 1 && (
                  <span style={{ color: "#aaa", fontSize: `calc(10px * ${s})`, marginLeft: 1 }}>→</span>
                )}
              </span>
            ))
        }
      </div>

      <button
        onClick={onClose}
        className="btn-raised danger"
        style={{ flexShrink: 0, marginLeft: `calc(6px * ${s})`, fontSize: `calc(10px * ${s})` }}
      >
        ✕ dismiss
      </button>
    </div>
  );
}
