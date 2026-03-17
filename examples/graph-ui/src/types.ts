export interface GraphSnapshot {
  vertices: number[];
  edges: [number, number][];
  directed: boolean;
}

export interface ConnectivityResult {
  is_connected: boolean;
  components: number[][];
}

export type AlgoResult =
  | { kind: "traversal"; label: string; order: number[] }
  | { kind: "closure";   label: string; vertices: number[] }
  | { kind: "connectivity"; data: ConnectivityResult }
  | null;

export interface Pos { x: number; y: number; }

export interface Flash { kind: "err" | "ok"; msg: string; }

export interface EdgeSelection {
  src: number;
  dst: number;
}

export interface GraphHistory {
  vertices: number[];
  edges: [number, number][];
  directed: boolean;
}
