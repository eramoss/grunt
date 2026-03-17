use grunt::graph::Graph;
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub graph: Mutex<Graph>,
}

#[derive(Serialize, Clone)]
pub struct GraphSnapshot {
    pub vertices: Vec<u32>,
    /// Edges to display: for undirected graphs we deduplicate by only keeping
    /// the first occurrence of each unordered pair.
    pub edges: Vec<[u32; 2]>,
    pub directed: bool,
}

#[derive(Serialize)]
pub struct ConnectivityResult {
    pub is_connected: bool,
    pub components: Vec<Vec<u32>>,
}

fn snapshot(g: &Graph) -> GraphSnapshot {
    let edges = if g.directed {
        g.edges.iter().map(|&(u, v)| [u, v]).collect()
    } else {
        // edges contains both (u,v) and (v,u); keep only the first seen pair
        let mut seen = std::collections::HashSet::new();
        g.edges
            .iter()
            .filter(|&&(u, v)| seen.insert((u.min(v), u.max(v))))
            .map(|&(u, v)| [u, v])
            .collect()
    };
    GraphSnapshot {
        vertices: g.vertices.clone(),
        edges,
        directed: g.directed,
    }
}

fn err(msg: impl Into<String>) -> String {
    msg.into()
}

#[tauri::command]
fn get_state(state: State<AppState>) -> GraphSnapshot {
    snapshot(&state.graph.lock().unwrap())
}

#[tauri::command]
fn set_directed(state: State<AppState>, directed: bool) -> GraphSnapshot {
    let mut g = state.graph.lock().unwrap();
    let vertices = g.vertices.clone();
    *g = if directed {
        Graph::new()
    } else {
        Graph::new_undirected()
    };
    for v in vertices {
        g.add_vertex(v);
    }
    snapshot(&g)
}

#[tauri::command]
fn reset_graph(state: State<AppState>) -> GraphSnapshot {
    let mut g = state.graph.lock().unwrap();
    let directed = g.directed;
    *g = if directed {
        Graph::new()
    } else {
        Graph::new_undirected()
    };
    snapshot(&g)
}

#[tauri::command]
fn add_vertex(state: State<AppState>, v: u32) -> Result<GraphSnapshot, String> {
    let mut g = state.graph.lock().unwrap();
    if !g.add_vertex(v) {
        return Err(err(format!("Vertex {v} already exists")));
    }
    Ok(snapshot(&g))
}

#[tauri::command]
fn remove_vertex(state: State<AppState>, v: u32) -> Result<GraphSnapshot, String> {
    let mut g = state.graph.lock().unwrap();
    if !g.remove_vertex(v) {
        return Err(err(format!("Vertex {v} not found")));
    }
    Ok(snapshot(&g))
}

#[tauri::command]
fn add_edge(state: State<AppState>, u: u32, v: u32) -> Result<GraphSnapshot, String> {
    let mut g = state.graph.lock().unwrap();
    if !g.add_edge(u, v) {
        return Err(err(format!(
            "Could not add edge ({u}, {v}) — vertices must exist and edge must not be a duplicate"
        )));
    }
    Ok(snapshot(&g))
}

#[tauri::command]
fn remove_edge(state: State<AppState>, u: u32, v: u32) -> Result<GraphSnapshot, String> {
    let mut g = state.graph.lock().unwrap();
    if !g.remove_edge(u, v) {
        return Err(err(format!("Edge ({u}, {v}) not found")));
    }
    Ok(snapshot(&g))
}

#[tauri::command]
fn run_bfs(state: State<AppState>, start: u32) -> Result<Vec<u32>, String> {
    let g = state.graph.lock().unwrap();
    if !g.vertices.contains(&start) {
        return Err(err(format!("Vertex {start} not found")));
    }
    Ok(g.bfs(start))
}

#[tauri::command]
fn run_dfs(state: State<AppState>, start: u32) -> Result<Vec<u32>, String> {
    let g = state.graph.lock().unwrap();
    if !g.vertices.contains(&start) {
        return Err(err(format!("Vertex {start} not found")));
    }
    Ok(g.dfs(start))
}

#[tauri::command]
fn get_transitive_direct(state: State<AppState>, v: u32) -> Result<Vec<u32>, String> {
    let g = state.graph.lock().unwrap();
    if !g.vertices.contains(&v) {
        return Err(err(format!("Vertex {v} not found")));
    }
    Ok(g.transitive_closure_direct(v))
}

#[tauri::command]
fn get_transitive_indirect(state: State<AppState>, v: u32) -> Result<Vec<u32>, String> {
    let g = state.graph.lock().unwrap();
    if !g.vertices.contains(&v) {
        return Err(err(format!("Vertex {v} not found")));
    }
    Ok(g.transitive_closure_indirect(v))
}

#[tauri::command]
fn check_connectivity(state: State<AppState>) -> ConnectivityResult {
    let g = state.graph.lock().unwrap();
    ConnectivityResult {
        is_connected: g.is_connected(),
        components: g.strongly_connected_components(),
    }
}

#[tauri::command]
fn load_template(state: State<AppState>, template: String) -> GraphSnapshot {
    let mut g = state.graph.lock().unwrap();
    *g = Graph::new_undirected();

    let n = match template.as_str() {
        "triangle" => 3,
        "square" => 4,
        "star" => 6,
        "complete" => 5,
        _ => 5,
    };

    for i in 0..n {
        g.add_vertex(i);
    }

    match template.as_str() {
        "triangle" => {
            g.add_edge(0, 1);
            g.add_edge(1, 2);
            g.add_edge(2, 0);
        }
        "square" => {
            g.add_edge(0, 1);
            g.add_edge(1, 2);
            g.add_edge(2, 3);
            g.add_edge(3, 0);
        }
        "star" => {
            for i in 1..n {
                g.add_edge(0, i);
            }
        }
        "complete" => {
            for i in 0..n {
                for j in i + 1..n {
                    g.add_edge(i, j);
                }
            }
        }
        _ => {}
    }
    snapshot(&g)
}

pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            graph: Mutex::new(Graph::new()),
        })
        .invoke_handler(tauri::generate_handler![
            get_state,
            set_directed,
            reset_graph,
            add_vertex,
            remove_vertex,
            add_edge,
            remove_edge,
            run_bfs,
            run_dfs,
            get_transitive_direct,
            get_transitive_indirect,
            check_connectivity,
            load_template,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
