import { useRef, useState, useEffect } from "react";
import type { GraphSnapshot, Flash } from "../types";
import { TEMPLATES } from "../templates";

interface ToolbarProps {
  graph: GraphSnapshot;
  flash: Flash | null;
  hasResult: boolean;
  vInput: string; setVInput: (v: string) => void;
  eFrom: string;  setEFrom:  (v: string) => void;
  eTo: string;    setETo:    (v: string) => void;
  algoV: string;  setAlgoV:  (v: string) => void;
  showTemplateMenu: boolean;
  onToggleTemplateMenu: () => void;
  onAddVertex: () => void;   onRemoveVertex: () => void;
  onAddEdge: () => void;     onRemoveEdge: () => void;
  onSetDirected: (d: boolean) => void;
  onReset: () => void;
  onBfs: () => void;  onDfs: () => void;
  onClosureDirect: () => void;  onClosureIndirect: () => void;
  onConnectivity: () => void;   onClearResult: () => void;
  onLoadTemplate: (key: string) => void;
}


function Sep() { return <div className="tb-sep" />; }
function Lbl({ c }: { c: string }) { return <span className="tb-label">{c}</span>; }

function Btn({ children, onClick, cls = "", title, disabled }: {
  children: React.ReactNode; onClick?: () => void;
  cls?: string; title?: string; disabled?: boolean;
}) {
  return (
    <button className={`btn-raised ${cls}`} onClick={onClick} title={title} disabled={disabled}>
      {children}
    </button>
  );
}

function Field({ value, onChange, onEnter, placeholder }: {
  value: string; onChange: (v: string) => void;
  onEnter?: () => void; placeholder?: string;
}) {
  return (
    <input
      type="number"
      className="field-sunken"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === "Enter" && onEnter?.()}
    />
  );
}


function TemplateDropdown({
  anchorRef,
  onClose,
  onSelect,
}: {
  anchorRef: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
  onSelect: (key: string) => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 1, left: r.left });
    }
  }, [anchorRef]);

  return (
    <>
      {/* Full-screen backdrop to catch outside clicks */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9998 }}
        onClick={onClose}
      />
      {/* Dropdown — fixed so it escapes toolbar overflow:hidden */}
      <div
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          zIndex: 9999,
          background: "#e8e8e0",
          border: "1px solid #999",
          boxShadow: "2px 2px 0 #aaa",
          minWidth: 190,
        }}
      >
        {Object.entries(TEMPLATES).map(([key, t]) => (
          <button
            key={key}
            className="dropdown-item"
            onClick={() => { onSelect(key); onClose(); }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
}


export default function Toolbar({
  graph, flash, hasResult,
  vInput, setVInput, eFrom, setEFrom, eTo, setETo, algoV, setAlgoV,
  showTemplateMenu, onToggleTemplateMenu,
  onAddVertex, onRemoveVertex, onAddEdge, onRemoveEdge,
  onSetDirected, onReset,
  onBfs, onDfs, onClosureDirect, onClosureIndirect, onConnectivity, onClearResult,
  onLoadTemplate,
}: ToolbarProps) {
  const templateBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="toolbar">

      {/* Brand */}
      <div className="tb-group" style={{ paddingRight: 6 }}>
        <span style={{
          fontFamily: "'IM Fell English', Georgia, serif",
          fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", color: "#1a1a1a",
        }}>
          Graph Explorer
        </span>
        <span style={{ fontSize: 9, color: "#888", fontStyle: "italic", marginLeft: 4 }}>
          |V|={graph.vertices.length} &nbsp;|E|={graph.edges.length}
        </span>
      </div>

      <Sep />

      {/* Type */}
      <div className="tb-group">
        <Lbl c="Type" />
        <div className="toggle-pair">
          <button className={graph.directed  ? "on" : ""} onClick={() => onSetDirected(true)}>Directed</button>
          <button className={!graph.directed ? "on" : ""} onClick={() => onSetDirected(false)}>Undirected</button>
        </div>
      </div>

      <Sep />

      {/* Vertex */}
      <div className="tb-group">
        <Lbl c="Vertex" />
        <Field value={vInput} onChange={setVInput} onEnter={onAddVertex} placeholder="id" />
        <Btn onClick={onAddVertex} cls="primary">+ Add</Btn>
        <Btn onClick={onRemoveVertex} cls="danger">− Del</Btn>
      </div>

      <Sep />

      {/* Edge */}
      <div className="tb-group">
        <Lbl c="Edge" />
        <Field value={eFrom} onChange={setEFrom} placeholder="src" />
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#555", padding: "0 2px" }}>
          {graph.directed ? "→" : "—"}
        </span>
        <Field value={eTo} onChange={setETo} placeholder="dst" />
        <Btn onClick={onAddEdge} cls="primary">+ Add</Btn>
        <Btn onClick={onRemoveEdge} cls="danger">− Del</Btn>
        <span style={{ fontSize: 9, color: "#999", marginLeft: 2, fontStyle: "italic" }}>
          or Ctrl+click nodes
        </span>
      </div>

      <Sep />

      {/* Templates — button anchors the fixed dropdown */}
      <div className="tb-group">
        <Lbl c="Template" />
        <button
          ref={templateBtnRef}
          className="btn-raised"
          onClick={onToggleTemplateMenu}
        >
          Load ▾
        </button>
        {showTemplateMenu && (
          <TemplateDropdown
            anchorRef={templateBtnRef}
            onClose={onToggleTemplateMenu}
            onSelect={onLoadTemplate}
          />
        )}
      </div>

      <Sep />

      {/* Algorithms */}
      <div className="tb-group">
        <Lbl c="Algorithm" />
        <Field value={algoV} onChange={setAlgoV} placeholder="root" />
        <Btn onClick={onBfs}  title="Breadth-First Search">BFS</Btn>
        <Btn onClick={onDfs}  title="Depth-First Search">DFS</Btn>
        <Btn onClick={onClosureDirect}   title="Direct transitive closure — vertices reachable from v">TC⁺</Btn>
        <Btn onClick={onClosureIndirect} title="Indirect transitive closure — vertices that reach v">TC⁻</Btn>
        <Btn onClick={onConnectivity} cls="primary" title="Connectivity / strongly connected components">
          Analyse
        </Btn>
        {hasResult && <Btn onClick={onClearResult} cls="danger">✕ Clear</Btn>}
      </div>

      <span style={{ flex: 1 }} />

      {flash && (
        <span className={`flash ${flash.kind}`}>
          {flash.kind === "ok" ? "✓" : "✗"} {flash.msg}
        </span>
      )}

      <Sep />

      <div className="tb-group">
        <Btn onClick={onReset} cls="danger">⌫ Clear Graph</Btn>
      </div>

    </div>
  );
}
