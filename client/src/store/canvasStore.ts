import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    Node, Edge, Connection,
} from 'reactflow';
import {
    SynthesisResult,
    EdgeData,
    KnowledgeNodeData,
    Suggestion,
} from '../types/api';
import {
    SemanticEdgeType,
} from '../constants/semanticRelationships';
import { nanoid } from 'nanoid';
import { createGraphSlice, GraphSlice } from "./graphSlice";
import { logger } from '../utils/logger';

// Debug counter for tracking store updates
let storeUpdateCount = 0;

// --- Types ---
type InspectorType = 'node' | 'edge' | null;

// Define the UISlice type
type UISlice = {
  pendingConnectionParams: Connection | null;
  isRelationshipSelectorOpen: boolean;
  nodeSuggestions: Suggestion[];
  edgeSuggestions: SemanticEdgeType[];
  isLoadingNodeContext: boolean;
  nodeContextCache: Record<string, unknown>;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isFetchingSuggestions: boolean;
  isFetchingNodeSuggestions: boolean;
  isFetchingEdgeSuggestions: boolean;
  currentSynthesisResult: SynthesisResult | null;
  isLoadingSynthesis: boolean;
  isInspectorOpen: boolean;
  inspectorType: InspectorType;
  inspectorContent: Node<KnowledgeNodeData> | Edge<EdgeData> | null;
  isConceptLibraryOpen: boolean;
  
  setPendingConnection: (c: Connection|null) => void;
  confirmRelationshipSelection: (type: SemanticEdgeType) => void;
  closeRelationshipSelector: () => void;
  
  // Add missing function definitions
  closeInspector: () => void;
  invokeSynthesis: () => Promise<void>;
  toggleConceptLibrary: () => void;
  setEdgeSemanticType: (edgeId: string, newType: SemanticEdgeType) => void;
  fetchNodeContext: (kiId: string) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
};

// Re-export the CanvasState type for backwards compatibility
export type CanvasState = GraphSlice & UISlice;

// --- Store Implementation ---
export const useCanvasStore = create<GraphSlice & UISlice>()(
  persist(
    (...a) => {
      // Debug: Log store initialization
      console.log("[DEBUG] Initializing canvas store");
      
      return {
        ...createGraphSlice(...a),
        // UI state
        pendingConnectionParams: null,
        isRelationshipSelectorOpen: false,
        nodeSuggestions: [],
        edgeSuggestions: [],
        isLoadingNodeContext: false,
        nodeContextCache: {},
        selectedNodeId: null,
        selectedEdgeId: null,
        isFetchingSuggestions: false,
        isFetchingNodeSuggestions: false,
        isFetchingEdgeSuggestions: false,
        currentSynthesisResult: null,
        isLoadingSynthesis: false,
        isInspectorOpen: false,
        inspectorType: null,
        inspectorContent: null,
        isConceptLibraryOpen: true,
        
        // UI actions
        setPendingConnection: (c: Connection|null) => {
          storeUpdateCount++;
          console.log(`[DEBUG] setPendingConnection called (update #${storeUpdateCount}):`, c ? 'connection' : 'null');
          
          a[0]({ 
            pendingConnectionParams: c,
            isRelationshipSelectorOpen: c !== null
          });
          logger.debug(`Set pending connection: ${c ? 'connection object' : 'null'}`);
        },
        confirmRelationshipSelection: (type: SemanticEdgeType) => {
          storeUpdateCount++;
          console.log(`[DEBUG] confirmRelationshipSelection called (update #${storeUpdateCount}):`, type);
          
          // Access state directly through the setState function parameter
          a[0]((state) => {
            const conn = state.pendingConnectionParams;
            if (!conn) return state;
            
            // Call addEdge from the current state
            state.addEdge({
              id: nanoid(),
              source: conn.source!,
              target: conn.target!,
              type: "default",
              label: type,
              data: { semantic_type: type },
            });
            
            // Prepare new state values
            const newState = {
              pendingConnectionParams: null,
              isRelationshipSelectorOpen: false
            } as Partial<CanvasState>;

            // Trigger synthesis automatically after relationship selection
            // Access invokeSynthesis via Zustand `get` (a[1])
            try {
              const invokeSynth = a[1]().invokeSynthesis;
              if (invokeSynth) {
                setTimeout(() => {
                  invokeSynth().catch((err: unknown) => console.error("Auto-synthesis failed", err));
                }, 0); // defer to ensure state update completed
              }
            } catch (err: unknown) {
              console.error("Error invoking synthesis", err);
            }

            return newState;
          });
          logger.debug(`Relationship confirmed: ${type}`);
        },
        closeRelationshipSelector: () => {
          storeUpdateCount++;
          console.log(`[DEBUG] closeRelationshipSelector called (update #${storeUpdateCount})`);
          
          a[0]({ 
            pendingConnectionParams: null,
            isRelationshipSelectorOpen: false
          });
          logger.debug('Relationship selector closed');
        },
        
        // Implement the missing functions
        closeInspector: () => {
          storeUpdateCount++;
          console.log(`[DEBUG] closeInspector called (update #${storeUpdateCount})`);
          
          a[0]({
            isInspectorOpen: false,
            inspectorContent: null,
            inspectorType: null
          });
          logger.debug('Inspector closed');
        },
        
        invokeSynthesis: async () => {
          storeUpdateCount++;
          console.log(`[DEBUG] invokeSynthesis called (update #${storeUpdateCount})`);
          
          logger.debug('Synthesis invoked (stub implementation)');
          // TODO: Implement actual synthesis logic
          return Promise.resolve();
        },
        
        toggleConceptLibrary: () => {
          storeUpdateCount++;
          console.log(`[DEBUG] toggleConceptLibrary called (update #${storeUpdateCount})`);
          
          // Use setState with a function parameter to access current state
          a[0]((state) => {
            console.log(`[DEBUG] toggleConceptLibrary - current isConceptLibraryOpen:`, state.isConceptLibraryOpen);
            return {
              isConceptLibraryOpen: !state.isConceptLibraryOpen
            };
          });
          logger.debug('Concept library toggled');
        },
        
        // --- Newly added actions ---
        setEdgeSemanticType: (edgeId: string, newType: SemanticEdgeType) => {
          a[0]((state) => {
            return {
              edges: state.edges.map((edge) =>
                edge.id === edgeId
                  ? {
                      ...edge,
                      data: { ...(edge.data || {}), semantic_type: newType },
                      label: newType,
                    }
                  : edge
              ),
            };
          });
        },
        
        fetchNodeContext: (kiId: string) => {
          // Stub: simulate async fetch
          a[0]({ isLoadingNodeContext: true });
          setTimeout(() => {
            a[0]((state) => ({
              isLoadingNodeContext: false,
              nodeContextCache: {
                ...state.nodeContextCache,
                [kiId]: {
                  summary: 'Stub context for ' + kiId,
                  relatedNodes: [],
                  relevantEdges: [],
                },
              },
            }));
          }, 500);
        },
        
        selectNode: (nodeId: string | null) => {
          a[0]({ selectedNodeId: nodeId, selectedEdgeId: null, isInspectorOpen: !!nodeId });
        },
        
        selectEdge: (edgeId: string | null) => {
          a[0]({ selectedEdgeId: edgeId, selectedNodeId: null, isInspectorOpen: !!edgeId });
        },
      };
    },
    { name: "canvas" }
  )
);

// Re-export for backwards compatibility with existing code
export default useCanvasStore;