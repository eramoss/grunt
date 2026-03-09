#[derive(Debug)]
pub struct CSR {
    // neighbors of vertex i are offsets[i]..offsets[i+1] in `neighbors`
    pub offsets: Vec<usize>, // len = n_vertices + 1
    pub neighbors: Vec<u32>, // all adjacency packed
    pub n: usize,
}

impl CSR {
    pub fn from_edges(n_vertices: usize, edges: &[(u32, u32)]) -> Self {
        let mut degree = vec![0usize; n_vertices];
        for &(u, _v) in edges {
            degree[u as usize] += 1;
        }

        let mut offsets = vec![0usize; n_vertices + 1];
        for i in 0..n_vertices {
            offsets[i + 1] = offsets[i] + degree[i];
        }

        let mut neighbors = vec![0u32; edges.len()];
        let mut cursor = offsets.clone();

        for &(u, v) in edges {
            let pos = cursor[u as usize];
            neighbors[pos] = v;
            cursor[u as usize] += 1;
        }

        Self {
            offsets,
            neighbors,
            n: n_vertices,
        }
    }

    pub fn neighbors(&self, v: u32) -> &[u32] {
        let start = self.offsets[v as usize];
        let end = self.offsets[v as usize + 1];
        &self.neighbors[start..end]
    }
}
