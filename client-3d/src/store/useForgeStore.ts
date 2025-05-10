import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Node, Edge } from '../types/graph'; // Assuming this path is correct and graph.ts exports Node and Edge

// import { NodeType, RelationshipType } from '../constants/graph'; // Keep this commented out for now

export interface RFState {
  nodes: Node[];
  edges: Edge[];
  isDrawingEdge: boolean;
  edgeStartNodeId: string | null;
  setNodes: (nodes: Node[]) => void;
  addNode: (node: Node) => void;
  updateNodePosition: (nodeId: string, position: [number, number, number]) => void;
  getNodes: () => Node[];
  getNodeById: (id: string) => Node | undefined;
  addEdge: (edge: Partial<Edge> & { source: string; target: string }) => void; // Allow partial edge for ID generation
  setIsDrawingEdge: (isDrawing: boolean) => void;
  setEdgeStartNodeId: (nodeId: string | null) => void;
  // TODO: Add other actions like removeNode, updateNodeData, setEdges, removeEdge, etc.
}

const useForgeStore = create<RFState>()(
  devtools(
    (set, get) => ({
      nodes: [],
      edges: [], // Initialize edges
      isDrawingEdge: false,
      edgeStartNodeId: null,
      setNodes: (nodes) => set({ nodes }),
      addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
      updateNodePosition: (nodeId, position) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId ? { ...node, position } : node
          ),
        })),
      getNodes: () => get().nodes,
      getNodeById: (id) => get().nodes.find((node) => node.id === id),
      addEdge: (edge) =>
        set((state) => {
          const newEdge: Edge = {
            id: edge.id || uuidv4(), // Generate ID if not provided
            source: edge.source,
            target: edge.target,
            semantic_type: edge.semantic_type,
            label: edge.label,
          };
          return { edges: [...state.edges, newEdge] };
        }),
      setIsDrawingEdge: (isDrawing) => set({ isDrawingEdge: isDrawing }),
      setEdgeStartNodeId: (nodeId) => set({ edgeStartNodeId: nodeId }),
    }),
    {
      name: 'forge-store',
    }
  )
);

export default useForgeStore;
