import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import type { GraphSnapshot, ConnectivityResult, AlgoResult, Pos, Flash, EdgeSelection, GraphHistory } from "./types";
import { CX, CY, circlePos } from "./constants";
import { TEMPLATES } from "./templates";
import Toolbar from "./components/Toolbar";
import Canvas from "./components/Canvas";
import OrderBanner from "./components/OrderBanner";
import SccLegend from "./components/SccLegend";
import LegendPanel from "./components/LegendPanel";

const MAX_HISTORY = 50;

const HELP_ITEMS = [
	{ key: "add-node", label: "Ctrl+Right-click", description: "Add node at cursor" },
	{ key: "add-edge", label: "Ctrl+Click nodes", description: "Click source then destination" },
	{ key: "delete", label: "Delete", description: "Delete selected node or edge" },
	{ key: "undo", label: "Ctrl+Z", description: "Undo" },
	{ key: "redo", label: "Ctrl+Y", description: "Redo" },
	{ key: "pan", label: "Left-drag canvas", description: "Pan view" },
	{ key: "move", label: "Drag node", description: "Move node" },
];

export default function App() {
	const [graph, setGraph] = useState<GraphSnapshot>({ vertices: [], edges: [], directed: true });
	const [positions, setPositions] = useState<Map<number, Pos>>(new Map());
	const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
	const [sccMap, setSccMap] = useState<Map<number, number>>(new Map());
	const [selectedNode, setSelectedNode] = useState<number | null>(null);
	const [selectedEdge, setSelectedEdge] = useState<EdgeSelection | null>(null);
	const [edgeSrc, setEdgeSrc] = useState<number | null>(null);
	const [result, setResult] = useState<AlgoResult>(null);
	const [flash, setFlash] = useState<Flash | null>(null);
	const [showHelp, setShowHelp] = useState(false);

	const [uiZoom, setUiZoom] = useState(1);
	const [vInput, setVInput] = useState("");
	const [eFrom, setEFrom] = useState("");
	const [eTo, setETo] = useState("");
	const [algoV, setAlgoV] = useState("");
	const [showTemplateMenu, setShowTemplateMenu] = useState(false);

	const [pan, setPan] = useState({ x: 0, y: 0 });
	const panRef = useRef(pan);
	panRef.current = pan;

	const [scale, setScale] = useState(1.0);
	const scaleRef = useRef(scale);
	scaleRef.current = scale;

	const history = useRef<GraphHistory[]>([]);
	const historyIndex = useRef(-1);
	const [canUndo, setCanUndo] = useState(false);
	const [canRedo, setCanRedo] = useState(false);

	const dragging = useRef<{ id: number; offsetX: number; offsetY: number } | null>(null);
	const isPanning = useRef(false);
	const panStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

	const svgRef = useRef<SVGSVGElement>(null);
	const canvasRef = useRef<HTMLDivElement>(null);

	const showFlash = (kind: "err" | "ok", msg: string) => {
		setFlash({ kind, msg });
		setTimeout(() => setFlash(null), 3500);
	};

	const call = async <T,>(cmd: string, args: Record<string, unknown> = {}): Promise<T | null> => {
		try { return await invoke<T>(cmd, args); }
		catch (e) { showFlash("err", String(e)); return null; }
	};

	const saveToHistory = useCallback((g: GraphSnapshot) => {
		const snapshot: GraphHistory = {
			vertices: [...g.vertices],
			edges: [...g.edges],
			directed: g.directed,
		};

		if (historyIndex.current < history.current.length - 1) {
			history.current = history.current.slice(0, historyIndex.current + 1);
		}

		history.current.push(snapshot);
		historyIndex.current++;

		if (history.current.length > MAX_HISTORY) {
			history.current.shift();
			historyIndex.current--;
		}

		setCanUndo(historyIndex.current > 0);
		setCanRedo(false);
	}, []);

	const syncBackend = async (g: GraphSnapshot) => {
		await invoke("reset_graph");
		await invoke("set_directed", { directed: g.directed });
		for (const v of g.vertices) await invoke("add_vertex", { v });
		for (const [u, v] of g.edges) await invoke("add_edge", { u, v });
	};

	const restoreFromHistory = useCallback(async (index: number) => {
		const snap = history.current[index];
		const newGraph: GraphSnapshot = {
			vertices: [...snap.vertices],
			edges: [...snap.edges],
			directed: snap.directed,
		};

		await syncBackend(newGraph);
		setGraph(newGraph);
		setPositions(prev => {
			const next = new Map(prev);
			newGraph.vertices.forEach((v, i) => {
				if (!next.has(v)) next.set(v, circlePos(i, newGraph.vertices.length, CX, CY, 180));
			});
			for (const k of next.keys())
				if (!newGraph.vertices.includes(k)) next.delete(k);
			return next;
		});
		setSelectedNode(null);
		setSelectedEdge(null);
		historyIndex.current = index;
		setCanUndo(historyIndex.current > 0);
		setCanRedo(historyIndex.current < history.current.length - 1);
	}, []);

	const undo = useCallback(async () => {
		if (historyIndex.current > 0) {
			await restoreFromHistory(historyIndex.current - 1);
			showFlash("ok", "undo");
		}
	}, [restoreFromHistory, showFlash]);

	const redo = useCallback(async () => {
		if (historyIndex.current < history.current.length - 1) {
			await restoreFromHistory(historyIndex.current + 1);
			showFlash("ok", "redo");
		}
	}, [restoreFromHistory, showFlash]);

	const clearResult = () => { setResult(null); setHighlighted(new Set()); setSccMap(new Map()); };

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

	const withGraph = async (cmd: string, args: Record<string, unknown> = {}, save = true) => {
		const snap = await call<GraphSnapshot>(cmd, args);
		if (snap) { 
			if (save) saveToHistory(snap);
			applyGraph(snap); 
			showFlash("ok", cmd.replace(/_/g, " ")); 
		}
	};

	const getNextId = () => graph.vertices.length === 0 ? 1 : Math.max(...graph.vertices) + 1;

	useEffect(() => {
		invoke<GraphSnapshot>("get_state").then(applyGraph);
	}, [applyGraph]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Delete" || e.key === "Backspace") {
				if (selectedNode !== null) withGraph("remove_vertex", { v: selectedNode }).then(() => setSelectedNode(null));
				else if (selectedEdge !== null) withGraph("remove_edge", { u: selectedEdge.src, v: selectedEdge.dst }).then(() => setSelectedEdge(null));
			}
			if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
			if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
			if ((e.ctrlKey || e.metaKey) && e.key === "h") { e.preventDefault(); setShowHelp(x => !x); }
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [selectedNode, selectedEdge, undo, redo]);

	useEffect(() => {
		const onMouseMove = (e: MouseEvent) => {
			if (dragging.current && canvasRef.current) {
				const rect = canvasRef.current.getBoundingClientRect();
				const { id, offsetX, offsetY } = dragging.current;
				setPositions(prev => new Map(prev).set(id, {
					x: (e.clientX - rect.left - panRef.current.x) / scaleRef.current - offsetX,
					y: (e.clientY - rect.top - panRef.current.y) / scaleRef.current - offsetY,
				}));
			} else if (isPanning.current) {
				setPan({
					x: panStart.current.px + e.clientX - panStart.current.mx,
					y: panStart.current.py + e.clientY - panStart.current.my,
				});
			}
		};
		const onMouseUp = () => { dragging.current = null; isPanning.current = false; };
		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
		return () => {
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};
	}, []);

	useEffect(() => {
		const el = canvasRef.current;
		if (!el) return;
		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			const rect = el.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;
			const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
			const newScale = Math.max(0.15, Math.min(8, scaleRef.current * factor));
			setPan(prev => ({
				x: mouseX - (mouseX - prev.x) * newScale / scaleRef.current,
				y: mouseY - (mouseY - prev.y) * newScale / scaleRef.current,
			}));
			setScale(newScale);
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, []);

	const runAlgo = async (cmd: string, label: string, parseVertex = true) => {
		const v = parseInt(algoV);
		if (parseVertex && isNaN(v)) { showFlash("err", "specify vertex"); return; }
		const data = await call<number[] | ConnectivityResult>(cmd, parseVertex ? { start: v } : {v});
		if (!data) return;
		if (Array.isArray(data)) {
			setResult({ kind: "traversal", label, order: data });
			setHighlighted(new Set(data));
		} else {
			setResult({ kind: "connectivity", data });
			const map = new Map<number, number>();
			data.components.forEach((comp, idx) => comp.forEach(v => map.set(v, idx)));
			setSccMap(map);
			setHighlighted(new Set());
		}
	};

	const handleAddVertex = async () => {
		const v = parseInt(vInput);
		if (isNaN(v)) { showFlash("err", "invalid vertex id"); return; }
		await withGraph("add_vertex", { v });
		setVInput("");
	};

	const handleRemoveVertex = async () => {
		const v = parseInt(vInput);
		if (isNaN(v)) { showFlash("err", "invalid vertex id"); return; }
		await withGraph("remove_vertex", { v });
		setVInput("");
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
		if (snap) { saveToHistory(snap); applyGraph(snap); }
	};

	const handleReset = async () => {
		const snap = await call<GraphSnapshot>("reset_graph");
		if (snap) { 
			history.current = [];
			historyIndex.current = -1;
			saveToHistory(snap);
			applyGraph(snap); 
			setPositions(new Map()); 
			setEdgeSrc(null); 
			setCanUndo(false);
			setCanRedo(false);
		}
	};

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

			history.current = [];
			historyIndex.current = -1;
			saveToHistory(snap);

			setGraph(snap);
			const posMap = new Map<number, Pos>();
			t.vertices.forEach((v, i) => posMap.set(v, t.positions[i]));
			setPositions(posMap);
			clearResult(); setSelectedNode(null); setEdgeSrc(null); setPan({ x: 0, y: 0 });
			showFlash("ok", `loaded ${t.label}`);
		} catch (e) { showFlash("err", String(e)); }
	};

	const handleNodeClick = (e: React.MouseEvent, v: number) => {
		e.stopPropagation();

		if (e.ctrlKey || e.metaKey) {
			if (edgeSrc === null) {
				setEdgeSrc(v);
				setEFrom(String(v));
				showFlash("ok", `edge source: ${v}`);
			} else if (edgeSrc === v) {
				setEdgeSrc(null);
				showFlash("err", "cancelled");
			} else {
				const u = edgeSrc;
				setEdgeSrc(null);
				setEFrom(String(u));
				setETo(String(v));
				invoke<GraphSnapshot>("add_edge", { u, v })
				.then(snap => { if (snap) { saveToHistory(snap); applyGraph(snap); showFlash("ok", `edge (${u}, ${v})`); } })
				.catch(err => showFlash("err", String(err)));
			}
			return;
		}

		setEdgeSrc(null);
		setSelectedNode(v);
		setSelectedEdge(null);
		setAlgoV(String(v));
		setEFrom(String(v));

		const nodePos = positions.get(v);
		if (nodePos && canvasRef.current) {
			const rect = canvasRef.current.getBoundingClientRect();
			const mouseX = (e.clientX - rect.left - panRef.current.x) / scaleRef.current;
			const mouseY = (e.clientY - rect.top - panRef.current.y) / scaleRef.current;
			dragging.current = { id: v, offsetX: mouseX - nodePos.x, offsetY: mouseY - nodePos.y };
		} else {
			dragging.current = { id: v, offsetX: 0, offsetY: 0 };
		}
	};

	const handleEdgeClick = (src: number, dst: number) => {
		setSelectedEdge({ src, dst });
		setSelectedNode(null);
		setEFrom(String(src));
		setETo(String(dst));
	};

	const handleCanvasRightClick = (e: React.MouseEvent) => {
		e.preventDefault();
		if ((e.ctrlKey || e.metaKey) && canvasRef.current) {
			const rect = canvasRef.current.getBoundingClientRect();
			const x = (e.clientX - rect.left - panRef.current.x) / scaleRef.current;
			const y = (e.clientY - rect.top - panRef.current.y) / scaleRef.current;
			const nextId = getNextId();
			invoke<GraphSnapshot>("add_vertex", { v: nextId })
			.then(snap => {
				if (snap) { 
					saveToHistory(snap); 
					setGraph(snap);
					setPositions(prev => {
						const next = new Map(prev);
						snap.vertices.forEach((v, i) => {
							if (!next.has(v)) next.set(v, v === nextId ? { x, y } : circlePos(i, snap.vertices.length, CX, CY, 180));
						});
						for (const k of next.keys())
							if (!snap.vertices.includes(k)) next.delete(k);
						return next;
					});
					showFlash("ok", `node ${nextId}`); 
				}
			})
			.catch(err => showFlash("err", String(err)));
		}
	};

	const handleCanvasLeftDown = (e: React.MouseEvent<SVGSVGElement>) => {
		if (e.button !== 0) return;
		isPanning.current = true;
		panStart.current = { mx: e.clientX, my: e.clientY, px: panRef.current.x, py: panRef.current.y };
		setSelectedNode(null);
		setSelectedEdge(null);
	};

	const showBanner = result?.kind === "traversal" || result?.kind === "closure";
	const orderLabel = result?.kind === "traversal" ? result.label : result?.kind === "closure" ? result.label : "";
	const orderItems = result?.kind === "traversal" ? result.order.map((v, i) => ({ v, idx: i + 1 })) : result?.kind === "closure" ? result.vertices.map(v => ({ v })) : [];
	const connData = result?.kind === "connectivity" ? result.data : null;

	return (
		<div
		className="app-root"
		style={{
			"--ui-zoom": uiZoom,
			display: "flex",
			flexDirection: "column",
			height: "100dvh",
			width: "100%",
			overflow: "hidden",
			background: "#fafaf7",
		} as React.CSSProperties}
		>
		<Toolbar
		graph={graph} flash={flash} hasResult={result !== null}
		vInput={vInput} setVInput={setVInput}
		eFrom={eFrom} setEFrom={setEFrom}
		eTo={eTo} setETo={setETo}
		algoV={algoV} setAlgoV={setAlgoV}
		showTemplateMenu={showTemplateMenu}
		onToggleTemplateMenu={() => setShowTemplateMenu(x => !x)}
		onAddVertex={handleAddVertex} onRemoveVertex={handleRemoveVertex}
		onAddEdge={handleAddEdge} onRemoveEdge={handleRemoveEdge}
		onSetDirected={handleSetDirected} onReset={handleReset}
		onBfs={() => runAlgo("run_bfs", `BFS from ${algoV}`)}
		onDfs={() => runAlgo("run_dfs", `DFS from ${algoV}`)}
		onClosureDirect={() => runAlgo("get_transitive_direct", `TC+(${algoV})`, false)}
		onClosureIndirect={() => runAlgo("get_transitive_indirect", `TC-(${algoV})`, false)}
		onConnectivity={() => runAlgo("check_connectivity", "Connectivity")}
		onClearResult={clearResult}
		onLoadTemplate={loadTemplate}
		canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
		onToggleHelp={() => setShowHelp(x => !x)}
		selected={selectedNode}
		selectedEdge={selectedEdge}
  uiZoom={uiZoom}
  setUiZoom={setUiZoom}
		/>

		<div className="canvas-area" ref={canvasRef}>
		{showBanner && <OrderBanner label={orderLabel} items={orderItems} onClose={clearResult} />}

		{edgeSrc !== null && (
			<div style={{ position: "absolute", top: showBanner ? 33 : 0, left: 0, right: 0, zIndex: 9, background: "#fffbeb", borderBottom: "1px solid #d97706", padding: "2px 10px", fontSize: 10, color: "#92400e", fontFamily: "monospace" }}>
			Edge source: <strong>{edgeSrc}</strong> — Ctrl+click destination to add edge
			</div>
		)}

		<Canvas
		graph={graph}
		positions={positions}
		highlighted={highlighted}
		sccMap={sccMap}
		selected={selectedNode}
		selectedEdge={selectedEdge}
		edgeSrc={edgeSrc}
		pan={pan}
		scale={scale}
		svgRef={svgRef}
		onNodeClick={handleNodeClick}
		onEdgeClick={handleEdgeClick}
		onCanvasRightClick={handleCanvasRightClick}
		onCanvasLeftDown={handleCanvasLeftDown}
		/>

		{graph.vertices.length === 0 && (
			<div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", fontFamily: "'IM Fell English', Georgia, serif", fontSize: 12, fontStyle: "italic", color: "#999", background: "rgba(255,255,255,0.85)", border: "1px solid #ddd", padding: "3px 14px" }}>
			Add vertices using the toolbar, or load a template
			</div>
		)}

		{connData && <SccLegend data={connData} directed={graph.directed} onClose={clearResult} />}
		{showHelp && <LegendPanel title="Shortcuts" items={HELP_ITEMS} onClose={() => setShowHelp(false)} />}
		</div>
		</div>
	);
}
