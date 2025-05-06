import { StateCreator } from "zustand";
import { Edge, Node, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from "reactflow";
import { nanoid } from "nanoid";
import { KnowledgeNodeData, NodeType } from "../types/api";

// Debug counter for tracking graph slice operations
let graphUpdateCount = 0;

export interface GraphSlice {
  nodes: Node<KnowledgeNodeData>[];
  edges: Edge[];
  addNode: (type: string, position: {x:number,y:number}, data: Partial<KnowledgeNodeData>) => void;
  addEdge: (edge: Edge) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addSeedNodes: (seedNodes: Node<KnowledgeNodeData>[]) => void;
  updateNodeData: (nodeId: string, data: Partial<KnowledgeNodeData>) => void;
}

export const createGraphSlice: StateCreator<GraphSlice, [], [], GraphSlice> = (set) => ({
  nodes: [],
  edges: [],
  addNode: (type, position, data) => {
    graphUpdateCount++;
    console.log(`[DEBUG] GraphSlice - addNode called (update #${graphUpdateCount})`);
    
    const newNode: Node<KnowledgeNodeData> = {
      id: nanoid(),
      type,
      position,
      data: {
        ...data,
        type: data.type || NodeType.Concept // Fixed case to match the enum
      } as KnowledgeNodeData, // Cast to ensure type completeness
    };
    set((s) => {
      console.log(`[DEBUG] GraphSlice - adding new node to ${s.nodes.length} existing nodes`);
      return {
        nodes: [...s.nodes, newNode],
      };
    });
  },
  addEdge: (edge) => {
    graphUpdateCount++;
    console.log(`[DEBUG] GraphSlice - addEdge called (update #${graphUpdateCount})`, edge);
    
    set((s) => ({ edges: [...s.edges, edge] }));
  },
  onNodesChange: (changes) => {
    graphUpdateCount++;
    console.log(`[DEBUG] GraphSlice - onNodesChange called (update #${graphUpdateCount})`, changes);
    
    set((s) => {
      const newNodes = applyNodeChanges(changes, s.nodes);
      console.log(`[DEBUG] GraphSlice - nodes changed from ${s.nodes.length} to ${newNodes.length}`);
      return { nodes: newNodes };
    });
  },
  onEdgesChange: (changes) => {
    graphUpdateCount++;
    console.log(`[DEBUG] GraphSlice - onEdgesChange called (update #${graphUpdateCount})`, changes);
    
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) }));
  },
  addSeedNodes: (seedNodes) => {
    graphUpdateCount++;
    console.log(`[DEBUG] GraphSlice - addSeedNodes called (update #${graphUpdateCount})`, 
      { count: seedNodes.length, nodes: seedNodes });
    
    set((s) => {
      console.log(`[DEBUG] GraphSlice - adding ${seedNodes.length} seed nodes to ${s.nodes.length} existing nodes`);
      return { nodes: [...s.nodes, ...seedNodes] };
    });
  },
  updateNodeData: (nodeId, data) => {
    graphUpdateCount++; 
    console.log(`[DEBUG] GraphSlice - updateNodeData called (update #${graphUpdateCount})`, 
      { nodeId, data });
    
    set((s) => ({
      nodes: s.nodes.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...data } } 
          : node
      )
    }));
  },
}); 