import { useState, useEffect, useRef, useCallback } from "react";
import './App.css';
import { invoke } from "@tauri-apps/api/core";

import type { GraphSnapshot, ConnectivityResult, AlgoResult, Pos, Flash } from "./types";
import { CX, CY, circlePos } from "./constants";
import { TEMPLATES } from "./templates";

import Toolbar     from "./components/Toolbar";
import Canvas      from "./components/Canvas";
import OrderBanner from "./components/OrderBanner";
import SccLegend   from "./components/SccLegend";

export default function App() {
  const [graph, setGraph]             = useState<GraphSnapshot>({ vertices: [], edges: [], directed: true });
  const [positions, setPositions]     = useState<Map<number, Pos>>(new Map());
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  const [sccMap, setSccMap]           = useState<Map<number, number>>(new Map());
  const [selected, setSelected]       = useState<number | null>(null);
  const [edgeSrc, setEdgeSrc]         = useState<number | null>(null);
  const [result, setResult]           = useState<AlgoResult>(null);
  const [flash, setFlash]             = useState<Flash | null>(null);

  const [vInput, setVInput] = useState("");
  const [eFrom, setEFrom]   = useState("");
  const [eTo, setETo]       = useState("");
  const [algoV, setAlgoV]   = useState("");
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  const [pan, setPan]  = useState({ x: 0, y: 0 });
  const panRef         = useRef({ x: 0, y: 0 });
  panRef.current       = pan;

  const dragging  = useRef<{ id: number } | null>(null);
  const isPanning = useRef(false);
  const panStart  = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragging.current && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const id = dragging.current.id;
        setPositions(prev =>
          new Map(prev).set(id, {
            x: e.clientX - rect.left - panRef.current.x,
            y: e.clientY - rect.top  - panRef.current.y,
          })
        );
      } else if (isPanning.current) {
        setPan({
          x: panStart.current.px + e.clientX - panStart.current.mx,
          y: panStart.current.py + e.clientY - panStart.current.my,
        });
      }
    };

    const onMouseUp = () => {
      dragging.current  = null;
      isPanning.current = false;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup",   onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup",   onMouseUp);
    };
  }, []); 

  useEffect(() => { invoke<GraphSnapshot>("get_state").then(applyGraph); }, []);

  const applyGraph = useCallback((g: GraphSnapshot) => {
    setGraph(g);
    setPositions(prev => {
      const next = new Map(prev);
      g.vertices.forEach((v, i) => {
        if (!next.has(v)) next.set(v, circlePos(i, g.vertices.length, CX, CY, 180));
      });
      for (const k of next.keys())
        if (!g.vertices.includes(k)) next.delete(k);
      return next;
    });
    clearResult();
  }, []);

  const clearResult = () => { setResult(null); setHighlighted(new Set()); setSccMap(new Map()); };

  const showFlash = (kind: "err" | "ok", msg: string) => {
    setFlash({ kind, msg }); setTimeout(() => setFlash(null), 3500);
  };

  const call = async <T,>(cmd: string, args: Record<string, unknown> = {}): Promise<T | null> => {
    try { return await invoke<T>(cmd, args); }
    catch (e) { showFlash("err", String(e)); return null; }
  };

  const withGraph = async (cmd: string, args: Record<string, unknown> = {}) => {
    const snap = await call<GraphSnapshot>(cmd, args);
    if (snap) { applyGraph(snap); showFlash("ok", cmd.replace(/_/g, " ")); }
  };

  // ── Controls
  const handleAddVertex = async () => {
    const v = parseInt(vInput);
    if (isNaN(v)) { showFlash("err", "invalid vertex id"); return; }
    await withGraph("add_vertex", { v }); setVInput("");
  };
  const handleRemoveVertex = async () => {
    const v = parseInt(vInput);
    if (isNaN(v)) { showFlash("err", "invalid vertex id"); return; }
    await withGraph("remove_vertex", { v }); setVInput("");
    if (selected === v) setSelected(null);
    if (edgeSrc === v) setEdgeSrc(null);
  };
  const handleAddEdge = async () => {
    const u = parseInt(eFrom), v = parseInt(eTo);
    if (isNaN(u) || isNaN(v)) { showFlash("err", "invalid endpoint(s)"); return; }
    await withGraph("add_edge", { u, v });
  };
  const handleRemoveEdge = async () => {
    const u = parseInt(eFrom), v = parseInt(eTo);
    if (isNaN(u) || isNaN(v)) { showFlash("err", "invalid endpoint(s)"); return; }
    await withGraph("remove_edge", { u, v });
  };
  const handleSetDirected = async (d: boolean) => {
    const snap = await call<GraphSnapshot>("set_directed", { directed: d });
    if (snap) applyGraph(snap);
  };
  const handleReset = async () => {
    const snap = await call<GraphSnapshot>("reset_graph");
    if (snap) { applyGraph(snap); setPositions(new Map()); setEdgeSrc(null); }
  };

  // ── Algorithms
  const runBfs = async () => {
    const v = parseInt(algoV);
    if (isNaN(v)) { showFlash("err", "specify root vertex"); return; }
    const order = await call<number[]>("run_bfs", { start: v });
    if (order) { setResult({ kind: "traversal", label: `BFS from vertex ${v}`, order }); setHighlighted(new Set(order)); setSccMap(new Map()); }
  };
  const runDfs = async () => {
    const v = parseInt(algoV);
    if (isNaN(v)) { showFlash("err", "specify root vertex"); return; }
    const order = await call<number[]>("run_dfs", { start: v });
    if (order) { setResult({ kind: "traversal", label: `DFS from vertex ${v}`, order }); setHighlighted(new Set(order)); setSccMap(new Map()); }
  };
  const runClosureDirect = async () => {
    const v = parseInt(algoV);
    if (isNaN(v)) { showFlash("err", "specify vertex"); return; }
    const verts = await call<number[]>("get_transitive_direct", { v });
    if (verts) { setResult({ kind: "closure", label: `TC⁺(${v}) — reachable from ${v}`, vertices: verts }); setHighlighted(new Set(verts)); setSccMap(new Map()); }
  };
  const runClosureIndirect = async () => {
    const v = parseInt(algoV);
    if (isNaN(v)) { showFlash("err", "specify vertex"); return; }
    const verts = await call<number[]>("get_transitive_indirect", { v });
    if (verts) { setResult({ kind: "closure", label: `TC⁻(${v}) — vertices reaching ${v}`, vertices: verts }); setHighlighted(new Set(verts)); setSccMap(new Map()); }
  };
  const runConnectivity = async () => {
    const data = await call<ConnectivityResult>("check_connectivity");
    if (data) {
      setResult({ kind: "connectivity", data });
      const map = new Map<number, number>();
      data.components.forEach((comp, idx) => comp.forEach(v => map.set(v, idx)));
      setSccMap(map); setHighlighted(new Set());
    }
  };

  // ── Templates
  const loadTemplate = async (key: string) => {
    setShowTemplateMenu(false);
    const t = TEMPLATES[key];
    if (!t) return;
    try {
      await invoke("set_directed", { directed: t.directed });
      await invoke("reset_graph");
      for (const v of t.vertices) await invoke("add_vertex", { v });
      for (const [u, v] of t.edges) await invoke("add_edge", { u, v });
      const snap = await invoke<GraphSnapshot>("get_state");
      setGraph(snap);
      const posMap = new Map<number, Pos>();
      t.vertices.forEach((v, i) => posMap.set(v, t.positions[i]));
      setPositions(posMap);
      clearResult(); setSelected(null); setEdgeSrc(null); setPan({ x: 0, y: 0 });
      showFlash("ok", `loaded ${t.label}`);
    } catch (e) { showFlash("err", String(e)); }
  };

  // ── Node interaction
  const handleNodeMouseDown = (e: React.MouseEvent, v: number) => {
    e.stopPropagation();

    if (e.ctrlKey || e.metaKey) {
      if (edgeSrc === null) {
        setEdgeSrc(v);
        setEFrom(String(v));
        showFlash("ok", `edge source: ${v} — Ctrl+click destination`);
      } else if (edgeSrc === v) {
        setEdgeSrc(null);
        showFlash("err", "edge source cancelled");
      } else {
        const u = edgeSrc;
        setEdgeSrc(null);
        setEFrom(String(u));
        setETo(String(v));
        invoke<GraphSnapshot>("add_edge", { u, v })
          .then(snap => { if (snap) { applyGraph(snap); showFlash("ok", `edge (${u}, ${v}) added`); } })
          .catch(err => showFlash("err", String(err)));
      }
      return;
    }

    setEdgeSrc(null);
    setSelected(v);
    setAlgoV(String(v));
    setEFrom(String(v));
    dragging.current = { id: v };
  };

  // ── SVG background
  const handleSVGMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = {
      mx: e.clientX, my: e.clientY,
      px: panRef.current.x, py: panRef.current.y,
    };
  };

  // ── Derived overlays
  const showOrderBanner = result?.kind === "traversal" || result?.kind === "closure";
  const orderLabel  = result?.kind === "traversal" ? result.label : result?.kind === "closure" ? result.label : "";
  const orderItems: { v: number; idx?: number }[] =
    result?.kind === "traversal" ? result.order.map((v, i) => ({ v, idx: i + 1 })) :
    result?.kind === "closure"   ? result.vertices.map(v => ({ v })) : [];
  const connData = result?.kind === "connectivity" ? result.data : null;

  // ── Render
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", width: "100%", overflow: "hidden", background: "#fafaf7" }}>

      <Toolbar
        graph={graph} flash={flash} hasResult={result !== null}
        vInput={vInput} setVInput={setVInput}
        eFrom={eFrom}   setEFrom={setEFrom}
        eTo={eTo}       setETo={setETo}
        algoV={algoV}   setAlgoV={setAlgoV}
        showTemplateMenu={showTemplateMenu}
        onToggleTemplateMenu={() => setShowTemplateMenu(x => !x)}
        onAddVertex={handleAddVertex}       onRemoveVertex={handleRemoveVertex}
        onAddEdge={handleAddEdge}           onRemoveEdge={handleRemoveEdge}
        onSetDirected={handleSetDirected}   onReset={handleReset}
        onBfs={runBfs}          onDfs={runDfs}
        onClosureDirect={runClosureDirect}  onClosureIndirect={runClosureIndirect}
        onConnectivity={runConnectivity}    onClearResult={clearResult}
        onLoadTemplate={loadTemplate}
      />

      <div className="canvas-area">

        {showOrderBanner && (
          <OrderBanner label={orderLabel} items={orderItems} onClose={clearResult} />
        )}

        {edgeSrc !== null && (
          <div style={{
            position: "absolute", top: showOrderBanner ? 33 : 0, left: 0, right: 0,
            zIndex: 9, background: "#fffbeb", borderBottom: "1px solid #d97706",
            padding: "2px 10px", fontSize: 10, color: "#92400e",
            fontFamily: "monospace", fontStyle: "italic",
            animation: "slideDown 0.12s ease-out",
          }}>
            Edge source: <strong>{edgeSrc}</strong> — Ctrl+click a destination node to add edge, or Ctrl+click source again to cancel
          </div>
        )}

        <Canvas
          graph={graph}
          positions={positions}
          highlighted={highlighted}
          sccMap={sccMap}
          selected={selected}
          edgeSrc={edgeSrc}
          pan={pan}
          svgRef={svgRef}
          onNodeMouseDown={handleNodeMouseDown}
          onSVGMouseDown={handleSVGMouseDown}
        />

        {graph.vertices.length === 0 && (
          <div style={{
            position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
            fontFamily: "'IM Fell English', Georgia, serif",
            fontSize: 12, fontStyle: "italic", color: "#999",
            background: "rgba(255,255,255,0.85)",
            border: "1px solid #ddd", padding: "3px 14px",
            whiteSpace: "nowrap",
          }}>
            Fig. 1 — Add vertices using the toolbar, or load a template
          </div>
        )}

        {connData && (
          <SccLegend data={connData} directed={graph.directed} onClose={clearResult} />
        )}

      </div>
    </div>
  );
}
