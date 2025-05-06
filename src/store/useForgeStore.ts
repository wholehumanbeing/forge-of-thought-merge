
import { create } from "zustand";
import { throttle } from "lodash";

interface ForgeState {
  initialized: boolean;
  setInitialized: (value: boolean) => void;
  archetypeSymbols: string[];
  setArchetypeSymbols: (symbols: string[]) => void;
  nodes: Node[];
  setNodes: (nodes: Node[]) => void;
  edges: Edge[];
  setEdges: (edges: Edge[]) => void;
}

// Define Node and Edge types (reusing from components)
export type Node = {
  id: string;
  type: string;
  color: string;
  pos: [number, number, number];
  scale?: number;
};

export type Edge = {
  id: string;
  sourceId: string;
  targetId: string;
  color: string;
  midpoint?: [number, number, number];
  isRay?: boolean;
};

// Load initial state from localStorage
const loadFromStorage = () => {
  try {
    const storedNodes = localStorage.getItem('forge-nodes');
    const storedEdges = localStorage.getItem('forge-edges');
    const storedSymbols = localStorage.getItem('forge-symbols');
    
    return {
      nodes: storedNodes ? JSON.parse(storedNodes) : [],
      edges: storedEdges ? JSON.parse(storedEdges) : [],
      archetypeSymbols: storedSymbols ? JSON.parse(storedSymbols) : [],
    };
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return {
      nodes: [],
      edges: [],
      archetypeSymbols: [],
    };
  }
};

// Create throttled storage functions
const persistNodes = throttle((nodes: Node[]) => {
  try {
    localStorage.setItem('forge-nodes', JSON.stringify(nodes));
  } catch (error) {
    console.error('Error saving nodes to localStorage:', error);
  }
}, 300);

const persistEdges = throttle((edges: Edge[]) => {
  try {
    localStorage.setItem('forge-edges', JSON.stringify(edges));
  } catch (error) {
    console.error('Error saving edges to localStorage:', error);
  }
}, 300);

const persistSymbols = throttle((symbols: string[]) => {
  try {
    localStorage.setItem('forge-symbols', JSON.stringify(symbols));
  } catch (error) {
    console.error('Error saving symbols to localStorage:', error);
  }
}, 300);

// Get initial state
const initialState = loadFromStorage();

const useForgeStore = create<ForgeState>((set) => ({
  initialized: initialState.archetypeSymbols.length > 0,
  setInitialized: (value) => set({ initialized: value }),
  archetypeSymbols: initialState.archetypeSymbols,
  setArchetypeSymbols: (symbols) => {
    set({ archetypeSymbols: symbols });
    persistSymbols(symbols);
  },
  nodes: initialState.nodes,
  setNodes: (nodes) => {
    set({ nodes });
    persistNodes(nodes);
  },
  edges: initialState.edges,
  setEdges: (edges) => {
    set({ edges });
    persistEdges(edges);
  },
}));

export default useForgeStore;
