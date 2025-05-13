export interface Node {
  id: string;
  label: string;
  type: string; // e.g., 'concept', 'archetype', 'synthesized', 'SYMBOL', 'THINKER'
  // For 3D placement of the node in the scene (x, y, z)
  position?: [number, number, number];
  color?: string;
  scale?: number;
  data?: {
    description?: string;
    sourceConceptId?: string | null; // Can be null for nodes not from seed data
    [key: string]: any; // Allows for other arbitrary data
  };
  // Add other node-specific properties here
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

export interface Concept {
  id: string;
  name: string;
  description?: string;
  type?: string; // Corresponds to Node type
  // any other properties from your seed_concepts_llm_generated.json
}

export interface Edge {
  id: string;
  source: string; // ID of the source node
  target: string; // ID of the target node
  semantic_type?: string; // e.g., 'analogousTo', 'derivedFrom'
  label?: string; // Optional label for the edge
  color?: string;
  // Extended props used for rendering/synthesis interactions
  sourceId?: string;
  targetId?: string;
  midpoint?: [number, number, number];
  isRay?: boolean;
  // Add other edge-specific properties here
}

// You might also want a type for the whole graph structure if you pass it around
export interface GraphStructure {
  nodes: Node[];
  edges: Edge[];
} 