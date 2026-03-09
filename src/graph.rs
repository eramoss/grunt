#[cfg(feature = "csr")]
use crate::csr::CSR;

use nalgebra::DMatrix;
use std::collections::HashMap;

#[derive(Debug)]
pub struct Graph {
    pub vertices: Vec<u32>,
    pub edges: Vec<(u32, u32)>,
    pub adjacency: HashMap<u32, Vec<u32>>,

    #[cfg(feature = "csr")]
    pub csr: CSR,
}

impl Graph {
    pub fn from_edges(vertices: Vec<u32>, edges: Vec<(u32, u32)>) -> Self {
        let mut adjacency: HashMap<u32, Vec<u32>> =
            vertices.iter().map(|&v| (v, Vec::new())).collect();

        for (u, v) in edges.clone() {
            adjacency.entry(u).or_default().push(v);
        }

        Self {
            vertices: vertices.clone(),
            edges: edges.clone(),
            adjacency,

            #[cfg(feature = "csr")]
            csr: CSR::from_edges(vertices.len(), edges.as_slice()),
        }
    }

    pub fn adjency_matrix(self) -> DMatrix<u32> {
        let n = self.vertices.len();
        let mut m = DMatrix::zeros(n, n);

        for &(u, v) in &self.edges {
            let i = self.vertices.iter().position(|&x| x == u);
            let j = self.vertices.iter().position(|&x| x == v);

            if let (Some(row), Some(col)) = (i, j) {
                m[(row, col)] = 1;
            }
        }
        m
    }

    pub fn neighbors(&self, v: u32) -> &[u32] {
        self.adjacency.get(&v).map(|s| s.as_slice()).unwrap_or(&[])
    }
}
