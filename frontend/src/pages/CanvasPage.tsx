import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  Node,         // Import Node type
  Edge,         // Import Edge type
  Connection,   // Import Connection type
  NodeChange,   // Import NodeChange type
  EdgeChange,   // Import EdgeChange type
  useReactFlow, // Import useReactFlow hook
} from 'reactflow';

// Import React Flow styles
import 'reactflow/dist/style.css';

// Import custom node and store
import SynthesisNode from '../components/nodes/SynthesisNode'; // Correctly import the new component
import ThinkerNode from '../components/nodes/ThinkerNode'; // Import lineage nodes
import SchoolNode from '../components/nodes/SchoolNode';
import AxiomNode from '../components/nodes/AxiomNode';
import MetaphorNode from '../components/nodes/MetaphorNode';
import KnowledgeNode from '../components/nodes/KnowledgeNode'; // Import the new KnowledgeNode component
import SourceNode from '../components/nodes/SourceNode'; // Import the new SourceNode component
// import ResonanceNode from '../components/nodes/ResonanceNode'; // Component file doesn't exist yet
import useCanvasStore, { CanvasState } from '../store/canvasStore';
import InspectorPanel from '../components/InspectorPanel'; // Import the new panel
import RelationshipSelectorModal from '../components/RelationshipSelectorModal'; // NEW: Import the modal
import ConceptLibraryPanel from '../components/panels/ConceptLibraryPanel'; // Import the ConceptLibraryPanel
import { KnowledgeNodeData, EdgeData, Suggestion, NodeType } from '../types/api';
import { playSynthesisStart, playNodeAdd } from '../utils/soundUtils'; // Import sound function
import logger from '../utils/logger'; // Import logger
import { useShallow } from 'zustand/react/shallow'; // Import useShallow

// --- Node Types Mapping ---
// Define nodeTypes outside of the component to prevent recreation on each render
const nodeTypes = {
  // Map NodeType enum values to components
  [NodeType.Synthesis]: SynthesisNode,
  [NodeType.Concept]: KnowledgeNode, // Map Concept to KnowledgeNode
  [NodeType.Axiom]: AxiomNode,
  [NodeType.Metaphor]: MetaphorNode,
  [NodeType.Thinker]: ThinkerNode,
  [NodeType.School]: SchoolNode,
  [NodeType.Source]: SourceNode, // Add mapping for Source type

  // Register the string-based 'knowledgeNode' mapping
  'knowledgeNode': KnowledgeNode,
};

// Simple Loading Spinner Component
const LoadingSpinner: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    className={`animate-spin text-blue-500`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width={size}
    height={size}
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

// Suggestions Panel Component
const SuggestionsPanel: React.FC = () => {
  // Create a single selector to get all needed state at once instead of multiple selectors
  const { nodeSuggestions, isFetchingSuggestions, selectedNodeId } = useCanvasStore(
    useShallow(state => ({
      nodeSuggestions: state.nodeSuggestions,
      isFetchingSuggestions: state.isFetchingSuggestions,
      selectedNodeId: state.selectedNodeId
    }))
  );

  const handleDragStart = (event: React.DragEvent, suggestion: Suggestion) => {
    if (!suggestion.data) {
        logger.warn("Suggestion drag started without data:", suggestion);
        event.preventDefault();
        return;
    }
    // Cast to KnowledgeNodeData with proper type safety
    const nodeData = suggestion.data as KnowledgeNodeData;
    const dragData = JSON.stringify({
        nodeType: nodeData.type || NodeType.Concept, // Use received type or default
        label: nodeData.label,
        description: nodeData.description, // Include description
        ki_id: nodeData.original_id, // Use original_id as ki_id
    });
    event.dataTransfer.setData('application/reactflow', dragData);
    event.dataTransfer.effectAllowed = 'move';
    logger.debug("Dragging suggestion:", dragData);
  };

  if (!selectedNodeId) return null; // Only show panel when a node is selected

  return (
    <div className="absolute top-16 right-4 z-10 w-60 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 border border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">Node Suggestions</h4>
      {isFetchingSuggestions ? (
        <div className="flex justify-center items-center h-20">
          <LoadingSpinner />
        </div>
      ) : nodeSuggestions.length > 0 ? (
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {nodeSuggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              className="text-xs p-1.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-grab transition-colors text-gray-800 dark:text-gray-100"
              draggable
              onDragStart={(event) => handleDragStart(event, suggestion)}
              title={suggestion.data ? (suggestion.data as KnowledgeNodeData).description || suggestion.label : suggestion.label}
            >
              {suggestion.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">No suggestions available.</p>
      )}
    </div>
  );
};

const CanvasPage: React.FC = () => {
  const {
    nodes,
    edges,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    selectedNodeId, // Keep selectedNodeId from store for SuggestionsPanel
    // isRelationshipSelectorOpen, // Get from store if needed for conditional rendering
    // relationshipSelectorData, // Old data, not needed
    inspectorContent,
    inspectorType,
    _onNodesChange,
    _onEdgesChange,
    _addNode,
    _setSelectedNodeId,
    _setSelectedEdgeId,
    _setPendingConnection, // Get the new action
    _openRelationshipSelector, // Now only controls visibility
    _closeInspector,
    _invokeSynthesis,
    _isConceptLibraryOpen,
    _toggleConceptLibrary,
  } = useCanvasStore(
    useShallow((state: CanvasState) => ({
    nodes: state.nodes,
    edges: state.edges,
    selectedNodeId: state.selectedNodeId,
    // isRelationshipSelectorOpen: state.isRelationshipSelectorOpen,
    // relationshipSelectorData: state.relationshipSelectorData, // Old
    inspectorContent: state.inspectorContent,
    inspectorType: state.inspectorType,
    _onNodesChange: state.onNodesChange,
    _onEdgesChange: state.onEdgesChange,
    _addNode: state.addNode,
    _setSelectedNodeId: state.setSelectedNodeId,
    _setSelectedEdgeId: state.setSelectedEdgeId,
    _setPendingConnection: state.setPendingConnection, // Add new action
    _openRelationshipSelector: state.openRelationshipSelector, // Update selector name
    _closeInspector: state.closeInspector,
    _invokeSynthesis: state.invokeSynthesis,
    _isConceptLibraryOpen: state.isConceptLibraryOpen, // Select the state
    _toggleConceptLibrary: state.toggleConceptLibrary, // Select the action
  })));

  const reactFlowInstance = useReactFlow<KnowledgeNodeData, EdgeData>();

  // --- Wrapped Handlers --- 
  const onNodesChange = useCallback((changes: NodeChange[]) => _onNodesChange(changes), [_onNodesChange]);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => _onEdgesChange(changes), [_onEdgesChange]);

  const invokeSynthesis = useCallback(async () => {
    playSynthesisStart();
    logger.info("Initiating synthesis process...");
    try {
      await _invokeSynthesis();
    } catch (error) {
      logger.error("Synthesis invocation failed in UI:", error);
    }
  }, [_invokeSynthesis]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node<KnowledgeNodeData>) => {
      logger.debug(`Node clicked: ${node.id}, setting selected node ID.`);
      _setSelectedNodeId(node.id);
  }, [_setSelectedNodeId]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge<EdgeData>) => {
    logger.debug('Clicked edge, setting selected edge ID:', edge.id);
    _setSelectedEdgeId(edge.id);
  }, [_setSelectedEdgeId]);

  const onPaneClick = useCallback(() => {
      logger.debug('Pane clicked, deselecting items and closing inspector.');
      _setSelectedNodeId(null);
      _setSelectedEdgeId(null);
      _closeInspector();
  }, [_setSelectedNodeId, _setSelectedEdgeId, _closeInspector]);

  // V2: Refactored onConnect handler
  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) {
      logger.error("Connection attempt missing source or target", params);
      return;
    }
    logger.info('Connection attempt (V2 Hypothesis): Storing params and opening modal...', params);
    
    // 1. Store the connection parameters temporarily
    _setPendingConnection(params);

    // 2. Open the Relationship Selector Modal
    _openRelationshipSelector();

    // 3. Fetching edge suggestions is now handled automatically by the store's internal onConnect
    //    triggered by React Flow, which correctly gets the full nodes.
    //    We no longer need to call _fetchEdgeSuggestions here.
    // _fetchEdgeSuggestions(params.source, params.target).catch(error => { ... }); // REMOVED

    // 4. **IMPORTANT:** Edge addition is handled by `confirmRelationshipSelection` in the store.

  }, [_setPendingConnection, _openRelationshipSelector]); // Removed _fetchEdgeSuggestions from dependencies

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      logger.debug('Drop event detected');
      try {
        const reactFlowBounds = event.currentTarget.getBoundingClientRect();
        const dataString = event.dataTransfer.getData('application/reactflow');
        logger.debug("onDrop raw data:", dataString);
        if (!dataString) {
          logger.warn("onDrop called with no application/reactflow data.");
          return;
        }
        const nodeInfo = JSON.parse(dataString);
        logger.debug('Parsed drop data:', nodeInfo);
        if (!nodeInfo || typeof nodeInfo.nodeType === 'undefined' || !nodeInfo.label) { // Removed ki_id check as original_id is sufficient
          logger.warn('Dropped data missing required fields (type, label):', nodeInfo);
          return;
        }
        if (!Object.values(NodeType).includes(nodeInfo.nodeType)) {
          logger.warn('Dropped element has invalid NodeType:', nodeInfo.nodeType);
          return;
        }
        let position;
        try {
          position = reactFlowInstance.screenToFlowPosition({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
          });
        } catch (posError) {
          logger.error("Failed to calculate node position:", posError);
          position = { x: 100, y: 100 };
        }
        logger.info("Adding new node from drop:", { 
          type: nodeInfo.nodeType, 
          position, 
          label: nodeInfo.label,
          original_id: nodeInfo.ki_id // Pass original_id correctly
        });
        const nodeData: Partial<KnowledgeNodeData> = {
          label: nodeInfo.label,
          name: nodeInfo.label,
          description: nodeInfo.description || '',
          original_id: nodeInfo.ki_id // Map ki_id to original_id
        };
        _addNode(nodeInfo.nodeType, position, nodeData);
        playNodeAdd();
      } catch (error) {
        logger.error("Error in drop handler:", error);
      }
    },
    [reactFlowInstance, _addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const nodesWithInspectorStatus = useMemo(() => nodes.map(node => ({
      ...node,
      data: {
          ...node.data,
          isInspectorSelected: inspectorType === 'node' && inspectorContent?.id === node.id
      }
  })), [nodes, inspectorType, inspectorContent]);

  return (
    <div className="w-full h-screen relative flex flex-col">
      <div className="flex-grow border border-gray-300 relative" onDrop={onDrop} onDragOver={onDragOver}>
         <button
          onClick={invokeSynthesis}
          className="absolute top-2 left-2 z-10 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!nodes.some(n => n.selected)}
          style={{zIndex: 10}}
        >
          Synthesize Selected
        </button>
        <ReactFlow
          nodes={nodesWithInspectorStatus}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          fitView
          className="bg-gradient-to-br from-blue-50 via-white to-purple-50"
        >
          <Controls />
          <Background />
        </ReactFlow>
        <InspectorPanel />
        <SuggestionsPanel />
        {_isConceptLibraryOpen && <ConceptLibraryPanel />}
      </div>
      <RelationshipSelectorModal />
      <button 
        onClick={_toggleConceptLibrary} 
        className="absolute bottom-4 left-4 z-10 p-2 bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        aria-label={_isConceptLibraryOpen ? "Close Concept Library" : "Open Concept Library"}
      >
        {_isConceptLibraryOpen ? 
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg> 
          : 
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        }
      </button>
    </div>
  );
};

export default CanvasPage; 