import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Node, Edge } from '../types/graph'; // Assuming this path is correct

// TODO: Consider re-introducing NodeType, RelationshipType if they become necessary for store logic.
// import { NodeType, RelationshipType } from '../constants/graph';

export interface RFState {
  nodes: Node[];
  edges: Edge[];
  archetypeSymbols: string[];
  isDrawingEdge: boolean;
  edgeStartNodeId: string | null;
  selectedNodeId: string | null; // Added for selected node
  currentUserArchetype: string | null; // Added for current user archetype
  setNodes: (nodes: Node[]) => void;
  addNode: (node: Node) => void;
  updateNodePosition: (nodeId: string, position: [number, number, number]) => void;
  getNodes: () => Node[];
  getNodeById: (id: string) => Node | undefined;
  setEdges: (edges: Edge[]) => void; // Added setEdges
  addEdge: (edge: Partial<Edge> & { source: string; target: string }) => void;
  setArchetypesFromSymbols: (symbols: string[]) => void; // For onboarding
  setIsDrawingEdge: (isDrawing: boolean) => void;
  setEdgeStartNodeId: (nodeId: string | null) => void;
  setSelectedNodeId: (nodeId: string | null) => void; // Added for selected node
  setCurrentUserArchetype: (archetypeName: string | null) => void; // Added for current user archetype
  // TODO: Add other actions like removeNode, updateNodeData, removeEdge, etc.
}

const useForgeStore = create<RFState>()(
  devtools(
    (set, get) => ({
      nodes: [], // Initialized nodes
      edges: [], // Initialized edges
      archetypeSymbols: [], // Initialized archetypeSymbols
      isDrawingEdge: false,
      edgeStartNodeId: null,
      selectedNodeId: null, // Initialized selectedNodeId
      currentUserArchetype: null, // Initialized currentUserArchetype
      setNodes: (nodes) => set({ nodes }),
      addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
      updateNodePosition: (nodeId, position) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId ? { ...node, position: position as [number, number, number] } : node // Ensure position is typed correctly
          ),
        })),
      getNodes: () => get().nodes,
      getNodeById: (id) => get().nodes.find((node) => node.id === id),
      setEdges: (edges) => set({ edges }), // Implemented setEdges
      addEdge: (edge) =>
        set((state) => {
          const newEdge: Edge = {
            id: edge.id || uuidv4(),
            source: edge.source,
            target: edge.target,
            semantic_type: edge.semantic_type || 'related_to', // Provide a default semantic_type
            label: edge.label || '', // Provide a default label
            // color: edge.color // Assuming color might be part of Edge type, ensure it's handled or optional
          };
          return { edges: [...state.edges, newEdge] };
        }),
      setArchetypesFromSymbols: (symbols) => set({ archetypeSymbols: symbols }), // Implemented
      setIsDrawingEdge: (isDrawing) => set({ isDrawingEdge: isDrawing }),
      setEdgeStartNodeId: (nodeId) => set({ edgeStartNodeId: nodeId }),
      setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }), // Implemented
      setCurrentUserArchetype: (archetypeName) => set({ currentUserArchetype: archetypeName }), // Implemented
    }),
    {
      name: 'forge-store',
    }
  )
);

export default useForgeStore;
// Make sure Node and Edge types are correctly defined in ../types/graph.ts
// Example:
// export interface Node {
//   id: string;
//   label: string;
//   type?: string; // or NodeType
//   color?: string;
//   position: [number, number, number];
//   data?: any; // For additional properties
// }

// export interface Edge {
//   id: string;
//   source: string;
//   target: string;
//   semantic_type?: string; // or RelationshipType
//   label?: string;
//   color?: string;
// }

// If your Node type in useForgeStore has `pos` but CatwalkScene expects `position`,
// or vice-versa, you need to ensure consistency or map them appropriately.
// The current `updateNodePosition` uses `position`.
// The `Node` type in `../types/graph.ts` should reflect this.
// The starterNodes in CatwalkScene.tsx uses `pos`. This needs to be changed to `position`.
