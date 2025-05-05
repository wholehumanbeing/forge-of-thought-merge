import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
    Node, Edge, OnNodesChange, OnEdgesChange, applyNodeChanges, applyEdgeChanges,
    Connection, /* addEdge as reactFlowAddEdge, */ NodeChange, EdgeChange, Viewport, OnConnect, XYPosition, MarkerType /* , ReactFlowInstance */
} from 'reactflow';
import {
    EdgeData,
    SynthesisResult,
    GraphStructure,
    KnowledgeNodeData,
    NodeType,
    Suggestion,
    NodeContextData,
    // LineageElement, // Removed unused
    // SynthesisOutput // Removed unused
} from '../types/api';
import {
    getNodeSuggestions,
    // addEdge as apiAddEdge, // Removed unused import
    getNodeContext as apiGetNodeContext,
    updateEdge,
    invokeSynthesis as apiInvokeSynthesis,
    getEdgeSuggestions,
} from '../services/api';
import { playNodeAdd, playEdgeConnect, playSynthesisComplete } from '../utils/soundUtils';
import { logger } from '../utils/logger';
import { /* SEMANTIC_RELATIONSHIPS, SemanticRelationship, */ ALCHEMICAL_EDGES_MAP } from '../constants/semanticRelationships'; // Removed unused SEMANTIC_RELATIONSHIPS, SemanticRelationship
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import {
    // AlchemicalEdge, // Removed unused import
    /* ALCHEMICAL_EDGES, */ // Removed unused ALCHEMICAL_EDGES
    SemanticEdgeType,
    getEdgeStyleByType,
} from '../constants/semanticRelationships';

// --- Types ---
type InspectorType = 'node' | 'edge' | null;

// interface RelationshipSelectorData { // V2: Removed, replaced by pendingConnectionParams + isRelationshipSelectorOpen
//   connection: Connection;
//   sourceNode: Node<KnowledgeNodeData>;
//   targetNode: Node<KnowledgeNodeData>;
// }

// --- Initial State Definition ---
const initialNodes: Node<KnowledgeNodeData>[] = [
    // Add a test node that should exist in the KI
    {
        id: 'test-node-with-ki',
        type: NodeType.Concept,
        position: { x: 300, y: 300 },
        data: {
          label: 'Test Concept (Exists in KI)',
          name: 'Test Concept (Exists in KI)', // Ensure name is also set
          type: NodeType.Concept,
          ki_id: 'concept_being', // <<< USE AN ACTUAL ID FROM YOUR NEO4J DATA
          description: 'This node should have context fetched from the backend.',
          icon: '🧪',
          concept_type: 'Test',
          concept_source: 'test_data',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }
];
const initialEdges: Edge<EdgeData>[] = [];
const initialViewport: Viewport = { x: 0, y: 0, zoom: 1 };

const initialStateForStore = {
    nodes: initialNodes,
    edges: initialEdges,
    canvasViewport: initialViewport,
    selectedNodeId: null as string | null, // Explicit type
    selectedEdgeId: null as string | null, // Explicit type
    nodeContextCache: {},
    nodeSuggestions: [] as Suggestion[],
    edgeSuggestions: [] as SemanticEdgeType[],
    isLoadingNodeContext: false,
    isFetchingSuggestions: false,
    isFetchingNodeSuggestions: false,
    isFetchingEdgeSuggestions: false,
    isRelationshipSelectorOpen: false,
    currentSynthesisResult: null as SynthesisResult | null, // Explicit type
    isLoadingSynthesis: false,
    isInspectorOpen: false,
    inspectorType: null as InspectorType, // Explicit type
    inspectorContent: null as Node<KnowledgeNodeData> | Edge<EdgeData> | null, // Explicit type
    isConceptLibraryOpen: true, // Default to open for now
    pendingConnectionParams: null as Connection | null, // Explicit type
};

// --- Store State Interface ---
export interface CanvasState {
  // Core React Flow State
  nodes: Node<KnowledgeNodeData>[];
  edges: Edge<EdgeData>[];
  canvasViewport: Viewport;

  // Selection State
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Context & Suggestions (Fetched Data)
  nodeContextCache: Record<string, NodeContextData | 'loading' | 'error'>;
  nodeSuggestions: Suggestion[];
  edgeSuggestions: SemanticEdgeType[];
  isLoadingNodeContext: boolean;
  isFetchingSuggestions: boolean;
  isFetchingNodeSuggestions: boolean;
  isFetchingEdgeSuggestions: boolean;

  // Relationship Selector Modal State
  isRelationshipSelectorOpen: boolean;

  // Synthesis State
  currentSynthesisResult: SynthesisResult | null;
  isLoadingSynthesis: boolean;

  // Inspector State
  isInspectorOpen: boolean;
  inspectorType: InspectorType;
  inspectorContent: Node<KnowledgeNodeData> | Edge<EdgeData> | null;

  // Concept Library State (NEW)
  isConceptLibraryOpen: boolean;

  // --- V2 Hypothesis Flow State ---
  pendingConnectionParams: Connection | null; // Holds params while relationship modal is open

  // --- Actions ---

  // React Flow Handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setCanvasViewport: (viewport: Viewport) => void;

  // Node & Edge Management
  addNode: (type: NodeType, position: XYPosition, data?: Partial<KnowledgeNodeData>) => Node<KnowledgeNodeData> | undefined;
  addNodes: (nodesToAdd: Node<KnowledgeNodeData>[]) => void;
  updateNodeData: (nodeId: string, data: Partial<KnowledgeNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (connection: Connection, data?: Partial<EdgeData>) => Edge<EdgeData>;
  addEdges: (edgesToAdd: Edge<EdgeData>[]) => void;
  updateEdgeData: (edgeId: string, data: Partial<EdgeData>) => Promise<void>;
  setEdgeSemanticType: (edgeId: string, type: SemanticEdgeType) => void;
  deleteEdge: (edgeId: string) => void;

  // Selection
  setSelectedNodeId: (nodeId: string | null) => void;
  setSelectedEdgeId: (edgeId: string | null) => void;

  // Data Fetching Actions
  fetchNodeContext: (nodeKiId: string) => Promise<void>;
  fetchNodeSuggestions: () => Promise<void>;
  fetchEdgeSuggestions: (sourceNode: Node<KnowledgeNodeData>, targetNode: Node<KnowledgeNodeData>) => Promise<void>;

  // Relationship Selector Modal Actions
  openRelationshipSelector: () => void;
  closeRelationshipSelector: () => void;
  confirmRelationshipSelection: (selectedType: SemanticEdgeType) => void;

  // Synthesis Actions
  invokeSynthesis: () => Promise<void>;
  clearSynthesisResult: () => void;

  // Canvas Setup / Reset
  addSeedNodes: (seedNodes: Node<KnowledgeNodeData>[]) => void;
  resetCanvas: () => void;

  // Inspector Actions
  openInspector: (type: InspectorType, content: Node<KnowledgeNodeData> | Edge<EdgeData>) => void;
  closeInspector: () => void;

  // Concept Library Actions (NEW)
  toggleConceptLibrary: () => void;
  openConceptLibrary: () => void; // Optional: Explicit open action
  closeConceptLibrary: () => void; // Optional: Explicit close action

  // V2 Hypothesis Flow Actions
  setPendingConnection: (params: Connection | null) => void;

  // V2 Specific: Fork Synthesis Result
  forkSynthesisResult: (sourceSynthesisNodeId: string, newPosition?: XYPosition | null) => void;
}

// --- Helper Type Guards ---
// Added more specific types than 'any'
const isInspectorContentNode = (content: unknown): content is Node<KnowledgeNodeData> => {
    return content !== null && typeof content === 'object' && 'data' in content && 'position' in content;
};
const isInspectorContentEdge = (content: unknown): content is Edge<EdgeData> => {
    return content !== null && typeof content === 'object' && 'source' in content && 'target' in content;
};

// Helper to validate KI ID format (namespace:id pattern)
const isValidKiId = (s: string): boolean => /^[a-zA-Z0-9_]+:[a-zA-Z0-9_.-]+$/.test(s);

// --- Helper Function to calculate center position ---
const calculateCenterPosition = (nodes: Node<KnowledgeNodeData>[], defaultOffsetRange = 50): XYPosition => {
  if (nodes.length === 0) return { x: window.innerWidth / 2, y: window.innerHeight / 3 }; // Default if no nodes

  const xs = nodes.map(n => n.position.x);
  const ys = nodes.map(n => n.position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Add random offset to prevent stacking
  const offsetX = (Math.random() - 0.5) * 2 * defaultOffsetRange;
  const offsetY = (Math.random() - 0.5) * 2 * defaultOffsetRange;

  return { x: centerX + offsetX, y: centerY + offsetY };
};

// --- Store Implementation ---
const useCanvasStore = create<CanvasState>()(
  persist(
    immer((set, get) => ({
      // Spread the initial state
      ...initialStateForStore,

      // --- Actions ---

      // React Flow Handlers
      onNodesChange: (changes: NodeChange[]) => {
          logger.debug('Applying node changes:', changes);
          const selectionChange = changes.find(c => c.type === 'select');
          if (selectionChange && selectionChange.type === 'select') {
               set((state: CanvasState) => {
                   state.selectedNodeId = selectionChange.selected ? selectionChange.id : null;
                   if (selectionChange.selected) {
                      state.selectedEdgeId = null;
                      state.edgeSuggestions = [];
                      state.isFetchingEdgeSuggestions = false;
                   }
               });
          }
          set((state: CanvasState) => {
            state.nodes = applyNodeChanges(changes, state.nodes);
          });
        },

      onEdgesChange: (changes: EdgeChange[]) => {
          logger.debug('Applying edge changes:', changes);
          const selectionChange = changes.find(c => c.type === 'select');
          if (selectionChange && selectionChange.type === 'select') {
               set((state: CanvasState) => {
                   state.selectedEdgeId = selectionChange.selected ? selectionChange.id : null;
                   if (selectionChange.selected) {
                       state.selectedNodeId = null;
                       state.nodeContextCache = {};
                       state.nodeSuggestions = [];
                       state.isFetchingNodeSuggestions = false;
                   }
               });
          }
          set((state: CanvasState) => {
            state.edges = applyEdgeChanges(changes, state.edges);
          });
        },

      onConnect: (connection: Connection) => {
            logger.info('Connection process initiated:', connection);
            if (connection.source && connection.target) {
                // V2: Fetch suggestions by passing full node objects
                const { nodes } = get(); // Get current nodes state
                const sourceNode = nodes.find(n => n.id === connection.source);
                const targetNode = nodes.find(n => n.id === connection.target);

                if (sourceNode && targetNode) {
                    // Call fetchEdgeSuggestions with the full node objects
                    get().fetchEdgeSuggestions(sourceNode, targetNode).catch(err => {
                        logger.error("Failed to fetch edge suggestions on connect:", err, { sourceNode, targetNode });
                    });
                } else {
                    logger.error("Connection attempt failed: Source or target node not found in state", {
                        connection,
                        sourceFound: !!sourceNode,
                        targetFound: !!targetNode
                    });
                    get().setPendingConnection(null); // Clear pending state
                }
                // Note: The actual edge creation and modal opening are handled in CanvasPage's onConnect wrapper now.
                
            } else {
                logger.error("Connection attempt missing source or target ID", connection);
                get().setPendingConnection(null); // Clear any pending state if invalid
            }
        },

      setCanvasViewport: (viewport: Viewport) => {
          set({ canvasViewport: viewport });
          set({ isFetchingEdgeSuggestions: false, edgeSuggestions: [] }); // Clear stale suggestions on error
        },

      // Node & Edge Management
      addNode: (type: NodeType, position: XYPosition, data?: Partial<KnowledgeNodeData>) => {
          if (!type || !position) {
            logger.error("addNode called with missing required parameters", { type, position });
            return undefined;
          }

          // Ensure default values for required fields
          const newNodeData: KnowledgeNodeData = {
              label: data?.label || `New ${type}`,
              name: data?.name || data?.label || `New ${type}`,
              type: type,
              description: data?.description || '',
              concept_type: data?.concept_type,
              concept_source: data?.concept_source || 'user_created',
              icon: data?.icon || '💡',
              created_at: data?.created_at || new Date().toISOString(),
              updated_at: data?.updated_at || new Date().toISOString(),
              ...data,
          };

          // Generate final ID directly
          const nodeId = nanoid();
          logger.debug(`Creating node with ID ${nodeId}`);

          const newNode: Node<KnowledgeNodeData> = {
              id: nodeId,
              type: String(type),
              position,
              data: newNodeData,
              selected: false,
          };

          // Direct update - add node to UI immediately
          set((state: CanvasState) => { state.nodes.push(newNode); });
          playNodeAdd();

          logger.info("Node added directly to local state:", newNode);

          return newNode;
        },

      addNodes: (nodesToAdd: Node<KnowledgeNodeData>[]) => {
           if (!nodesToAdd || nodesToAdd.length === 0) return;
           logger.info(`Bulk adding ${nodesToAdd.length} nodes directly to state.`);
           playNodeAdd();
           set((state: CanvasState) => {
              const existingIds = new Set(state.nodes.map((n: Node<KnowledgeNodeData>) => n.id));
              const uniqueNewNodes = nodesToAdd.filter((newNode: Node<KnowledgeNodeData>) => {
                  if (!newNode || !newNode.id) {
                      logger.warn("Skipping add node: Invalid node data.", newNode);
                      return false;
                  }
                  if (existingIds.has(newNode.id)) {
                      logger.warn(`Skipping add node: Node ID ${newNode.id} already exists.`);
                      return false;
                  }
                  newNode.type = String(newNode.data.type || NodeType.Concept);
                  existingIds.add(newNode.id);
                  return true;
              });
               if (uniqueNewNodes.length > 0) {
                  state.nodes.push(...uniqueNewNodes);
                  logger.debug(`Added ${uniqueNewNodes.length} unique nodes.`);
               }
           });
        },

      updateNodeData: (nodeId: string, data: Partial<KnowledgeNodeData>) => {
          logger.info(`Updating data for node ${nodeId}:`, data);
          set((state: CanvasState) => {
              const node = state.nodes.find((n: Node<KnowledgeNodeData>) => n.id === nodeId);
              if (node && node.data) {
                  node.data = { ...node.data, ...data };
                  if ('label' in data && data.label && !data.name) {
                      node.data.name = data.label;
                  }
              }
          });
        },

      deleteNode: (nodeId: string) => {
            logger.info(`Deleting node ${nodeId}`);
            set((state: CanvasState) => {
                state.nodes = state.nodes.filter((n: Node<KnowledgeNodeData>) => n.id !== nodeId);
                state.edges = state.edges.filter((e: Edge<EdgeData>) => e.source !== nodeId && e.target !== nodeId);
                if (state.selectedNodeId === nodeId) {
                    state.selectedNodeId = null;
                    state.isInspectorOpen = false;
                    state.inspectorContent = null;
                    state.nodeContextCache = {};
                }
            });
        },

      addEdge: (connection: Connection, data?: Partial<EdgeData>) => {
          // Only log a warning if not called from confirmRelationshipSelection
          // Get stack trace to detect if called from confirmRelationshipSelection
          const stackTrace = new Error().stack || '';
          const isCalledFromConfirmRelationship = stackTrace.includes('confirmRelationshipSelection');
          
          if (!isCalledFromConfirmRelationship) {
            logger.warn('Direct addEdge called. User flow should use confirmRelationshipSelection.', { connection, data });
          }
          
          const newEdge: Edge<EdgeData> = {
              id: uuidv4(),
              source: connection.source!,
              target: connection.target!,
              sourceHandle: connection.sourceHandle,
              targetHandle: connection.targetHandle,
              data: {
                  semantic_type: data?.semantic_type || null, // Default to null if not provided
                  ...data
              },
              label: data?.semantic_type ? String(data.semantic_type) : 'Related', // Basic label
              style: getEdgeStyleByType(data?.semantic_type || null),
              animated: true, // Default animation
          };
          set((state: CanvasState) => {
              state.edges.push(newEdge);
          });
          playEdgeConnect();
          return newEdge;
        },

      addEdges: (edgesToAdd: Edge<EdgeData>[]) => {
           if (!edgesToAdd || edgesToAdd.length === 0) return;
           logger.info(`Bulk adding ${edgesToAdd.length} edges directly to state.`);
           playEdgeConnect();
           set((state: CanvasState) => {
              const existingEdgeIds = new Set(state.edges.map((e: Edge<EdgeData>) => e.id));
              const nodeIds = new Set(state.nodes.map((n: Node<KnowledgeNodeData>) => n.id));

              const uniqueNewEdges = edgesToAdd.filter((newEdge: Edge<EdgeData>) => {
                   if (!newEdge || !newEdge.id || !newEdge.source || !newEdge.target) {
                       logger.warn("Skipping add edge: Edge, ID, source, or target is missing.", newEdge);
                       return false;
                   }
                   if (existingEdgeIds.has(newEdge.id)) {
                      logger.warn(`Skipping add edge: Edge with ID ${newEdge.id} already exists.`);
                      return false;
                  }
                  const sourceExists = nodeIds.has(newEdge.source);
                  const targetExists = nodeIds.has(newEdge.target);
                  if (!sourceExists || !targetExists) {
                      logger.warn(`Skipping add edge ${newEdge.id}: Source (${newEdge.source}, exists=${sourceExists}) or target (${newEdge.target}, exists=${targetExists}) node does not exist.`);
                      return false;
                  }
                  if (!newEdge.markerEnd) {
                      newEdge.markerEnd = { type: MarkerType.ArrowClosed };
                  }
                  existingEdgeIds.add(newEdge.id);
                  return true;
              });
               if (uniqueNewEdges.length > 0) {
                   state.edges.push(...uniqueNewEdges);
                   logger.debug(`Added ${uniqueNewEdges.length} unique edges.`);
               }
           });
        },

      updateEdgeData: async (edgeId: string, data: Partial<EdgeData>) => {
          logger.debug(`Attempting to update edge ${edgeId} with data:`, data);
          const edge = get().edges.find(e => e.id === edgeId);
          if (!edge) {
              logger.error(`updateEdgeData: Edge ${edgeId} not found.`);
              return;
          }

          const updatedData = { ...edge.data, ...data };

          // Optimistically update local state
          set((state: CanvasState) => {
              const edgeIndex = state.edges.findIndex((e: Edge<EdgeData>) => e.id === edgeId);
              if (edgeIndex > -1) {
                  const currentEdge = state.edges[edgeIndex];
                  const semanticType = data.semantic_type;
                  // Use the new map for efficient lookup
                  const relationshipInfo = semanticType ? ALCHEMICAL_EDGES_MAP[semanticType] : undefined;

                  state.edges[edgeIndex] = {
                      ...currentEdge,
                      data: updatedData,
                      // V2: Update label and style based on semantic_type if present in data
                      label: semanticType ? relationshipInfo?.label || semanticType : updatedData.label,
                      style: semanticType ? getEdgeStyleByType(semanticType) : currentEdge.style,
                      markerEnd: semanticType ? getEdgeStyleByType(semanticType).markerEnd : currentEdge.markerEnd,
                  };
              }
          });

          // Call API to persist the change (only if semantic_type is changing for now)
          // Adjust this logic if other edge data needs backend persistence
          if ('semantic_type' in data && data.semantic_type !== undefined) {
              try {
                  // API expects the partial data object containing the semantic_type
                  await updateEdge(edgeId, { semantic_type: data.semantic_type }); 
                  logger.info(`Successfully updated edge ${edgeId} semantic type to ${data.semantic_type} via API.`);
              } catch (error: unknown) {
                  logger.error(`Failed to update edge ${edgeId} semantic type via API:`, error);
                  // Consider reverting the optimistic update or showing an error
                  set((state: CanvasState) => {
                      const edgeIndex = state.edges.findIndex(e => e.id === edgeId);
                      if (edgeIndex > -1) {
                           // Revert to original data - more complex state management might be needed here
                           // For simplicity, we are not reverting the style/label changes
                           state.edges[edgeIndex].data = edge.data; 
                      }
                  });
              }
          }
        },

      setEdgeSemanticType: (edgeId: string, type: SemanticEdgeType) => {
            logger.debug(`Setting semantic type for edge ${edgeId} to ${type}`);
            get().updateEdgeData(edgeId, { semantic_type: type });
        },

      deleteEdge: (edgeId: string) => {
            logger.info(`Deleting edge ${edgeId}`);
            set((state: CanvasState) => {
                state.edges = state.edges.filter((e: Edge<EdgeData>) => e.id !== edgeId);
                if (state.selectedEdgeId === edgeId) {
                    state.selectedEdgeId = null;
                    if (state.inspectorType === 'edge') {
                        state.isInspectorOpen = false;
                        state.inspectorContent = null;
                        state.inspectorType = null;
                    }
                }
            });
        },

      setSelectedNodeId: (nodeId: string | null) => {
          logger.debug(`Setting selectedNodeId: ${nodeId}`);
          set((state: CanvasState) => {
            state.selectedNodeId = nodeId;
            state.selectedEdgeId = null; // Deselect edges when a node is selected
            // Reset context loading state when selection changes
            state.isLoadingNodeContext = false;
            if (nodeId) {
              state.isInspectorOpen = true;
              state.inspectorType = 'node';
              const node = state.nodes.find(n => n.id === nodeId);
              state.inspectorContent = node || null;
              // V2: Trigger context fetch if node has ki_id (handled in InspectorPanel useEffect)
            } else {
              state.isInspectorOpen = false;
              state.inspectorType = null;
              state.inspectorContent = null;
            }
          });
        },

      setSelectedEdgeId: (edgeId: string | null) => {
          logger.debug(`Setting selectedEdgeId: ${edgeId}`);
          set((state: CanvasState) => {
            state.selectedEdgeId = edgeId;
            state.selectedNodeId = null; // Deselect nodes when an edge is selected
            state.isLoadingNodeContext = false; // Reset node context loading
            if (edgeId) {
              state.isInspectorOpen = true;
              state.inspectorType = 'edge';
              const edge = state.edges.find(e => e.id === edgeId);
              state.inspectorContent = edge || null;
            } else {
              state.isInspectorOpen = false;
              state.inspectorType = null;
              state.inspectorContent = null;
            }
          });
        },

      openInspector: (type: InspectorType, content: Node<KnowledgeNodeData> | Edge<EdgeData>) => {
          logger.debug('Opening inspector:', { type, content });
          set((state: CanvasState) => {
            state.isInspectorOpen = true;
            state.inspectorType = type;
            state.inspectorContent = content;
            // V2: If opening for a node, clear edge selection/suggestions
            if (type === 'node' && isInspectorContentNode(content)) {
              state.selectedNodeId = content.id; // Also select the node
              state.selectedEdgeId = null;
              state.edgeSuggestions = []; 
              state.isFetchingEdgeSuggestions = false;
              // Fetch context if ki_id exists and not already cached/loading
              const kiId = content.data?.ki_id;
              if (kiId && !state.nodeContextCache[kiId]) {
                state.fetchNodeContext(kiId).catch(err => logger.error("Error fetching context on inspector open:", err));
              }
              // Fetch node suggestions
              state.fetchNodeSuggestions().catch(err => logger.error("Error fetching node suggestions on inspector open:", err));
            }
            // V2: If opening for an edge, clear node selection/suggestions
            else if (type === 'edge' && isInspectorContentEdge(content)) {
              state.selectedEdgeId = content.id; // Also select the edge
              state.selectedNodeId = null;
              state.nodeSuggestions = [];
              state.nodeContextCache = {}; // Clear node context cache when selecting edge
              state.isFetchingNodeSuggestions = false;
              // Fetch edge suggestions for the connected nodes
              const sourceNode = state.nodes.find(n => n.id === content.source);
              const targetNode = state.nodes.find(n => n.id === content.target);
              if(sourceNode && targetNode) {
                  state.fetchEdgeSuggestions(sourceNode, targetNode).catch(err => logger.error("Error fetching edge suggestions on inspector open:", err));
              }
            }
          });
        },
      closeInspector: () => {
          logger.debug('Closing inspector');
          set((state: CanvasState) => {
            state.isInspectorOpen = false;
            state.inspectorType = null;
            state.inspectorContent = null;
            // Deselect node/edge when closing inspector unless modal is open
            if (!state.isRelationshipSelectorOpen) {
              state.selectedNodeId = null;
              state.selectedEdgeId = null;
              // Clear suggestions/context when deselection happens via inspector close
              state.nodeSuggestions = [];
              state.edgeSuggestions = [];
              state.nodeContextCache = {}; // Clear context cache
              state.isFetchingNodeSuggestions = false;
              state.isFetchingEdgeSuggestions = false;
            }
          });
        },

      // Concept Library Actions (NEW)
      toggleConceptLibrary: () => {
          set((state: CanvasState) => {
            state.isConceptLibraryOpen = !state.isConceptLibraryOpen;
            logger.debug('Concept Library toggled:', state.isConceptLibraryOpen);
          });
        },
      openConceptLibrary: () => {
          set((state: CanvasState) => {
            if (!state.isConceptLibraryOpen) {
              state.isConceptLibraryOpen = true;
              logger.debug('Concept Library opened explicitly');
            }
          });
        },
      closeConceptLibrary: () => {
          set((state: CanvasState) => {
            if (state.isConceptLibraryOpen) {
              state.isConceptLibraryOpen = false;
              logger.debug('Concept Library closed explicitly');
            }
          });
        },

      // V2 Hypothesis Flow Actions
      setPendingConnection: (params: Connection | null) => {
            logger.debug('Setting pending connection:', params);
            set({ pendingConnectionParams: params });
        },

      fetchNodeContext: async (nodeKiId: string) => {
          if (!nodeKiId) {
            logger.warn("fetchNodeContext called with empty nodeKiId");
            return;
          }
          
          if (!isValidKiId(nodeKiId)) {
            logger.warn(`fetchNodeContext called with invalid KI ID format: ${nodeKiId}`);
            return;
          }
          
          logger.debug(`Fetching context for node KI_ID: ${nodeKiId}`);
          // Immediately set loading state for this specific ID
          set((state: CanvasState) => {
            state.isLoadingNodeContext = true; // Keep overall loading flag? Maybe remove if cache handles it.
            state.nodeContextCache[nodeKiId] = 'loading';
          });

          try {
            const context = await apiGetNodeContext(nodeKiId);
            logger.debug(`Successfully fetched context for ${nodeKiId}:`, context);
            set((state: CanvasState) => {
              state.nodeContextCache[nodeKiId] = context;
              state.isLoadingNodeContext = false; // Set false on success
            });
          } catch (error: unknown) {
            logger.error(`Failed to fetch node context for ${nodeKiId}:`, error);
            set((state: CanvasState) => {
              state.nodeContextCache[nodeKiId] = 'error'; // Mark as error in cache
              state.isLoadingNodeContext = false; // Set false on error
            });
          }
          // No finally needed as isLoadingNodeContext is set in both try and catch
        },

      fetchNodeSuggestions: async () => {
          const selectedNodeId = get().selectedNodeId;
          
          if (!selectedNodeId) {
            logger.warn("fetchNodeSuggestions called with no selected node");
            set({ 
              nodeSuggestions: [],
              isFetchingNodeSuggestions: false,
              isFetchingSuggestions: false 
            });
            return;
          }
          
          // Find the selected node and its ki_id
          const selectedNode = get().nodes.find(n => n.id === selectedNodeId);
          const kiId = selectedNode?.data?.original_id;
          
          if (!kiId) {
            logger.warn(`Node ${selectedNodeId} has no ki_id (original_id), cannot fetch suggestions.`);
            set({ 
              nodeSuggestions: [],
              isFetchingNodeSuggestions: false,
              isFetchingSuggestions: false 
            });
            return;
          }
          
          // Get the set of all ki_ids currently present on the canvas
          const currentKiIds = get().nodes
            .map(node => node.data?.original_id)
            .filter(id => id !== undefined && id !== null) as string[];
          
          logger.info(`Fetching node suggestions for node ID: ${selectedNodeId} (ki_id: ${kiId})`);
          
          // Set loading state
          set((state: CanvasState) => {
            state.isFetchingNodeSuggestions = true;
            state.isFetchingSuggestions = true; // Update both flags
          });
          
          try {
            // Call the API service function
            const suggestions = await getNodeSuggestions(kiId, currentKiIds);
            
            // Transform the API response into Suggestion objects
            const formattedSuggestions: Suggestion[] = suggestions.map((nodeData, index) => ({
              id: `suggestion-${selectedNodeId}-${index}-${Date.now()}`,
              type: 'node',
              label: nodeData.label,
              data: nodeData
            }));
            
            // Update state with suggestions
            set((state: CanvasState) => {
              // Only update if the same node is still selected
              if (state.selectedNodeId === selectedNodeId) {
                state.nodeSuggestions = formattedSuggestions;
                state.isFetchingNodeSuggestions = false;
                state.isFetchingSuggestions = false;
              }
            });
            
            logger.debug(`Successfully fetched ${formattedSuggestions.length} node suggestions for ${selectedNodeId} (ki_id: ${kiId})`);
          } catch (error: unknown) {
            logger.error(`Failed to fetch node suggestions for ${selectedNodeId} (ki_id: ${kiId}):`, error);
            
            // Clear suggestions and set error state
            set((state: CanvasState) => {
              if (state.selectedNodeId === selectedNodeId) {
                state.nodeSuggestions = [];
                state.isFetchingNodeSuggestions = false;
                state.isFetchingSuggestions = false;
              }
            });
          }
        },

      fetchEdgeSuggestions: async (sourceNode: Node<KnowledgeNodeData>, targetNode: Node<KnowledgeNodeData>) => {
          if (!sourceNode || !targetNode) {
              logger.error('fetchEdgeSuggestions called with null/undefined nodes');
              return;
          }
          logger.info('Fetching edge suggestions for nodes:', { source: sourceNode.id, target: targetNode.id });
          set({ isFetchingEdgeSuggestions: true, edgeSuggestions: [] });
          try {
            // Pass the full node objects to the updated API function
            const suggestions = await getEdgeSuggestions(sourceNode, targetNode);
            logger.info('Received edge suggestions:', suggestions);
            set({ edgeSuggestions: suggestions, isFetchingEdgeSuggestions: false });
          } catch (error: unknown) {
            logger.error('Error fetching edge suggestions:', error);
            set({ isFetchingEdgeSuggestions: false, edgeSuggestions: [] });
          }
        },

        // Relationship Selector Modal Actions
        openRelationshipSelector: () => {
          logger.debug('Opening Relationship Selector Modal');
          set({ isRelationshipSelectorOpen: true });
        },

        closeRelationshipSelector: () => {
          logger.debug('Closing Relationship Selector Modal and clearing pending connection');
          set({ isRelationshipSelectorOpen: false, pendingConnectionParams: null, edgeSuggestions: [] });
        },

        confirmRelationshipSelection: (selectedType: SemanticEdgeType) => {
          logger.debug(`Confirming relationship selection: ${selectedType}`);
          const { pendingConnectionParams } = get();
          
          if (!pendingConnectionParams || !pendingConnectionParams.source || !pendingConnectionParams.target) {
            logger.error("Cannot confirm relationship: No pending connection parameters.");
            set({ isRelationshipSelectorOpen: false, pendingConnectionParams: null, edgeSuggestions: [] });
            return;
          }
          
          // Create the edge with the selected semantic type
          const newEdge = get().addEdge(pendingConnectionParams, { 
            semantic_type: selectedType,
            label: selectedType
          });
          
          // Close the modal and clear pending state
          set({ 
            isRelationshipSelectorOpen: false, 
            pendingConnectionParams: null,
            edgeSuggestions: []
          });
          
          logger.info(`Created edge with semantic type ${selectedType}:`, newEdge);
          playEdgeConnect();
        },

        // V2 Specific: Fork Synthesis Result
        forkSynthesisResult: (sourceSynthesisNodeId: string, newPosition?: XYPosition | null) => {
          const { nodes, edges, addEdges: bulkAddEdges, addNodes: bulkAddNodes } = get(); // Kept removal of unused addNode
          logger.debug(`Initiating fork for synthesis result originating from node ${sourceSynthesisNodeId}`);

          // Find the synthesis node and its immediate children/edges
          const synthesisNode = nodes.find(n => n.id === sourceSynthesisNodeId);
          if (!synthesisNode || synthesisNode.data.type !== NodeType.Synthesis) {
            logger.error("Cannot fork: Source node is not a SYNTHESIS node or not found", { sourceSynthesisNodeId });
            return;
          }

          // Find edges connected *from* the synthesis node
          const outgoingEdges = edges.filter(e => e.source === sourceSynthesisNodeId);
          const childrenNodeIds = new Set(outgoingEdges.map(e => e.target));

          // Find nodes to copy: the synthesis node and its direct children
          const nodesToCopy = nodes.filter(n => n.id === sourceSynthesisNodeId || childrenNodeIds.has(n.id));

          // Find edges to copy: edges between the copied nodes (includes original outgoingEdges)
          const nodeIdsToCopySet = new Set(nodesToCopy.map(n => n.id));
          const edgesToCopy = edges.filter(e => nodeIdsToCopySet.has(e.source) && nodeIdsToCopySet.has(e.target));

          logger.debug(`Found ${nodesToCopy.length} nodes and ${edgesToCopy.length} edges to copy.`);

          if (nodesToCopy.length === 0) {
              logger.warn("Forking stopped: No nodes found to copy.");
              return;
          }

          const idMapping = new Map<string, string>();
          const newNodes: Node<KnowledgeNodeData>[] = [];
          const newEdges: Edge<EdgeData>[] = [];

          const basePosition = newPosition ?? synthesisNode.position ?? { x: 50, y: 50 }; // Fallback position
          const offsetX = 50; // Offset for the new nodes
          const offsetY = 50;

          nodesToCopy.forEach((node, index) => {
              const newNode: Node<KnowledgeNodeData> = JSON.parse(JSON.stringify(node)); // Deep copy
              newNode.id = `${node.data.type || 'node'}-fork-${uuidv4().slice(0,4)}`; // Generate new ID
              idMapping.set(node.id, newNode.id);

              // Adjust position slightly for the copied nodes
              newNode.position = {
                  x: basePosition.x + offsetX * (index + 1),
                  y: basePosition.y + offsetY * (index + 1)
              };
              newNode.selected = false; // Deselect new nodes
              newNode.data.created_at = new Date().toISOString();
              newNode.data.updated_at = new Date().toISOString();
              // Optionally modify label or other data
              newNode.data.label = `${node.data.label} (Fork)`;

              newNodes.push(newNode);
          });

          edgesToCopy.forEach(edge => {
              const newSourceId = idMapping.get(edge.source);
              const newTargetId = idMapping.get(edge.target);

              if (!newSourceId || !newTargetId) {
                  logger.warn(`Skipping edge fork: Could not map old IDs (${edge.source}, ${edge.target}) to new IDs.`);
                  return;
              }

              const newEdge: Edge<EdgeData> = JSON.parse(JSON.stringify(edge));
              // Use label instead of semantic_label
              newEdge.id = `e-${newSourceId}-${newTargetId}-${newEdge.data?.label || 'fork'}-${uuidv4().slice(0,4)}`;
              newEdge.source = newSourceId;
              newEdge.target = newTargetId;
              newEdge.selected = false;

              newEdges.push(newEdge);
          });

          logger.debug(`Forking complete. Adding ${newNodes.length} new nodes and ${newEdges.length} new edges.`);

          if (newNodes.length > 0) {
              bulkAddNodes(newNodes);
          }
          if (newEdges.length > 0) {
              bulkAddEdges(newEdges);
          }

          const newSynthesisNodeId = idMapping.get(sourceSynthesisNodeId);
          if (newSynthesisNodeId) {
               // Selection logic might be handled elsewhere or added later
          }
        },

        // Synthesis Actions
        invokeSynthesis: async () => {
          logger.info("invokeSynthesis called in store");
          const { nodes, edges, selectedNodeId, selectedEdgeId } = get();
          const selectedNodes = nodes.filter(n => n.selected);
          const selectedEdges = edges.filter(e => e.selected);

          // Fallback: Use selected node/edge if no multi-selection
          let inputNodes: Node<KnowledgeNodeData>[] = selectedNodes;
          let inputEdges: Edge<EdgeData>[] = selectedEdges;

          if (inputNodes.length === 0 && selectedNodeId) {
            const node = nodes.find(n => n.id === selectedNodeId);
            if (node) inputNodes = [node];
          }
          if (inputEdges.length === 0 && selectedEdgeId) {
            const edge = edges.find(e => e.id === selectedEdgeId);
            if (edge) inputEdges = [edge];
          }

          // If still nothing, try to infer from a single selected edge
          if (inputNodes.length === 0 && inputEdges.length === 1) {
              const edge = inputEdges[0];
              const sourceNode = nodes.find(n => n.id === edge.source);
              const targetNode = nodes.find(n => n.id === edge.target);
              if (sourceNode && targetNode) {
                  inputNodes = [sourceNode, targetNode];
                  logger.info("Inferred nodes from single selected edge for synthesis:", inputNodes.map(n=>n.id));
              }
          }


          if (inputNodes.length < 1) {
              logger.warn("Synthesis requires at least one node to be selected or inferred.");
              // TODO: Add user feedback (e.g., toast notification)
              return;
          }

          logger.info("Nodes selected for synthesis:", inputNodes.map(n => ({ id: n.id, label: n.data.label })));
          logger.info("Edges selected for synthesis:", inputEdges.map(e => ({ id: e.id, type: e.data?.semantic_type })));

          // Construct the GraphStructure payload
          const graphStructure: GraphStructure = {
            nodes: inputNodes.map(n => ({
              id: n.id,
              type: (n.data.type || NodeType.Concept).toString().toUpperCase(), // Ensure type is uppercase
              label: n.data.label || 'Unknown',
              data: {
                description: n.data.description || '',
                position: n.position, // Include position
                // Add other relevant data fields from n.data if needed by the backend
              },
              ki_id: n.data.ki_id, // Pass ki_id if available
            })),
            edges: inputEdges.map(e => ({
              id: e.id,
              source: e.source,
              target: e.target,
              semantic_type: e.data?.semantic_type?.toString() || null, // Ensure semantic_type is string or null
              internal_type: e.data?.internal_type, // Pass internal type if available
              data: e.data,
            })),
          };

          set({ isLoadingSynthesis: true, currentSynthesisResult: null });
          logger.debug("Sending graph structure to synthesis API:", JSON.stringify(graphStructure, null, 2));

          try {
              const result = await apiInvokeSynthesis(graphStructure);
              logger.info("Synthesis API returned result:", result);

              // Backend now guarantees synthesis_node is present on success
              playSynthesisComplete(); // Play sound on success

              const synthesisNodeData = result.synthesis_node;

              // --- BEGIN FIX ---
              // 1. Ensure type is SYNTHESIS
              synthesisNodeData.type = NodeType.Synthesis;

              // 2. Ensure position exists, calculate default if not
              let position = synthesisNodeData.data?.position;
              if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
                  logger.warn(`Synthesis node ${synthesisNodeData.id} missing valid position. Calculating default.`);
                  const currentNodes = get().nodes; // Get current nodes for centering calculation
                  position = calculateCenterPosition(currentNodes);
              }
              // --- END FIX ---

              const newNode: Node<KnowledgeNodeData> = {
                  id: synthesisNodeData.id || uuidv4(), // Ensure ID exists
                  type: NodeType.Synthesis, // Use the corrected type
                  position: position, // Use the validated/calculated position
                  data: {
                      ...synthesisNodeData.data,
                      label: synthesisNodeData.label || 'Synthesis Result',
                      type: NodeType.Synthesis, // Also set type within data
                      description: synthesisNodeData.data?.description || 'Synthesized from selection.', // Default description
                  },
              };

              logger.debug("Adding synthesized node:", newNode);

              // Process lineage - ensure nodes/edges have unique IDs and positions
              const lineageNodes = (result.lineage?.nodes || []).map((n, index) => ({
                  ...n,
                  id: n.id || `lineage-node-${uuidv4()}`, // Ensure ID
                  position: n.data?.position || { x: position.x + 100 + (index * 10), y: position.y + 100 + (index * 10) }, // Offset lineage nodes
                  data: { ...n.data, type: n.type || NodeType.Concept, label: n.label || 'Lineage Node' }, // Ensure data basics
                  type: n.type || NodeType.Concept, // Ensure type
              }));

              const lineageEdges = (result.lineage?.edges || []).map(e => ({
                  ...e,
                  id: e.id || `lineage-edge-${uuidv4()}`, // Ensure ID
                  data: { ...e.data, internal_type: e.internal_type || 'RELATED_TO' }, // Add internal_type if missing
                  markerEnd: { type: MarkerType.ArrowClosed },
                  style: { stroke: '#888', strokeDasharray: '5 5' }, // Style lineage edges
              }));

              set((state: CanvasState) => {
                  // Add synthesis node
                  const nodesWithSynth = [...state.nodes, newNode];
                  // Add lineage nodes, avoiding duplicates
                  const uniqueLineageNodes = lineageNodes.filter(ln => !nodesWithSynth.some(existing => existing.id === ln.id));
                  const finalNodes = [...nodesWithSynth, ...uniqueLineageNodes];

                  // Add lineage edges, avoiding duplicates
                  const edgesWithLineage = [...state.edges];
                  const uniqueLineageEdges = lineageEdges.filter(le => !edgesWithLineage.some(existing => existing.id === le.id));
                  const finalEdges = [...edgesWithLineage, ...uniqueLineageEdges];


                  return {
                      nodes: finalNodes,
                      edges: finalEdges,
                      currentSynthesisResult: result,
                      isLoadingSynthesis: false,
                      // Optionally select the new synthesis node
                      selectedNodeId: newNode.id,
                      selectedEdgeId: null,
                      // Optionally adjust viewport
                      // canvasViewport: { ...state.canvasViewport, x: position.x - window.innerWidth / 2, y: position.y - window.innerHeight / 2, zoom: state.canvasViewport.zoom }
                  };
              });


              // Fetch context for the new synthesis node
              if (newNode.data.ki_id) {
                 get().fetchNodeContext(newNode.data.ki_id).catch(err => logger.error("Error fetching context for new synthesis node:", err));
              }


          } catch (error) {
              logger.error("Error invoking synthesis:", error);
              set({ isLoadingSynthesis: false, currentSynthesisResult: null });
              // TODO: Show error message to the user
          }
      },

      clearSynthesisResult: () => {
        set({ currentSynthesisResult: null });
        logger.debug("Cleared current synthesis result.");
      },

      addSeedNodes: (seedNodes: Node<KnowledgeNodeData>[]) => {
        logger.info(`Adding ${seedNodes.length} seed nodes to the canvas.`);
        playNodeAdd();
        set((state: CanvasState) => {
            state.nodes = seedNodes;
            state.edges = [];
            state.selectedNodeId = null;
            state.selectedEdgeId = null;
            state.nodeContextCache = {};
            state.nodeSuggestions = [];
            state.edgeSuggestions = [];
            state.currentSynthesisResult = null;
            state.isInspectorOpen = false;
            state.inspectorType = null;
            state.inspectorContent = null;
        });
      },

      resetCanvas: () => {
        logger.info("Resetting canvas state.");
        set({
            nodes: initialNodes,
            edges: initialEdges,
            canvasViewport: initialViewport,
            selectedNodeId: null,
            selectedEdgeId: null,
            nodeContextCache: {},
            nodeSuggestions: [],
            edgeSuggestions: [],
            isRelationshipSelectorOpen: false,
            currentSynthesisResult: null,
            isLoadingSynthesis: false,
            isLoadingNodeContext: false,
            isFetchingSuggestions: false,
            isInspectorOpen: false,
            inspectorType: null,
            inspectorContent: null,
        });
      },
    })),
    {
      name: 'canvas-storage',
      partialize: (state: CanvasState): Partial<CanvasState> => ({
        nodes: state.nodes,
        edges: state.edges,
        canvasViewport: state.canvasViewport,
      }),
      merge: (persistedState: unknown, currentState: CanvasState): CanvasState => {
          if (typeof persistedState === 'object' && persistedState !== null) {
              const partialPersisted = persistedState as Partial<CanvasState>; 
              // Only merge the actual persisted properties
              return {
                  ...currentState,
                  nodes: partialPersisted.nodes ?? currentState.nodes,
                  edges: partialPersisted.edges ?? currentState.edges,
                  canvasViewport: partialPersisted.canvasViewport ?? currentState.canvasViewport,
              };
          }
          // If no persisted state, return current state (which includes initialStateForStore)
          return currentState;
      },
    }
  )
);

export default useCanvasStore;