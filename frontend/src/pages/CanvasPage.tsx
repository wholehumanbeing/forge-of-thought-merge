import React, { useCallback, useMemo, useEffect, useRef } from "react";
import ReactFlow, {
  Controls,
  Background,
  Node,
  Connection,
  NodeChange,
  EdgeChange,
  useReactFlow,
  Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import clsx from "clsx";

import { useCanvasStore } from "../store/canvasStore";
import { KnowledgeNodeData, EdgeData } from "../types/api";
import RelationshipSelectorModal from "../components/RelationshipSelectorModal";
import InspectorPanel from "../components/InspectorPanel";
import ConceptLibraryPanel from "../components/panels/ConceptLibraryPanel";
import CanvasToolbar from "../components/layout/CanvasToolbar";

import { nodeTypes, edgeTypes } from "../nodeEdgeMaps"; // Import the pre-defined constants
import { playNodeAdd, playSynthesisStart } from "../utils/soundUtils";
import { logger } from "../utils/logger";
import { nanoid } from "nanoid";
import { useReactFlowViewport } from "../hooks/useReactFlowViewport";

const CanvasPage: React.FC = () => {
  // Add render counter for debugging
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    console.log(`[DEBUG] CanvasPage render #${renderCount.current}`);
  });
  
  // Break down the selector into smaller, more specific selectors to prevent over-rendering
  const nodes = useCanvasStore(state => state.nodes);
  const edges = useCanvasStore(state => state.edges);
  const inspectorContent = useCanvasStore(state => state.inspectorContent);
  const inspectorType = useCanvasStore(state => state.inspectorType);
  const conceptLibOpen = useCanvasStore(state => state.isConceptLibraryOpen);
  
  // Actions are unlikely to change, but we still should memoize them just in case
  const addNode = useCanvasStore(state => state.addNode);
  const onNodesChange = useCanvasStore(state => state.onNodesChange);
  const onEdgesChange = useCanvasStore(state => state.onEdgesChange);
  const setPending = useCanvasStore(state => state.setPendingConnection);
  const edgesStateInvokeSynthesis = useCanvasStore(state => state.invokeSynthesis);
  const toggleConceptLib = useCanvasStore(state => state.toggleConceptLibrary);
  
  const rf = useReactFlow<KnowledgeNodeData, EdgeData>();
  const { getDepthByNodeType } = useReactFlowViewport();

  // Log state updates for debugging
  const prevNodeCount = useRef(nodes.length);
  useEffect(() => {
    if (prevNodeCount.current !== nodes.length) {
      console.log(`[DEBUG] Node count changed from ${prevNodeCount.current} to ${nodes.length}`);
      prevNodeCount.current = nodes.length;
    }
    
    console.log("[DEBUG] Current state:", {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      inspectorOpen: inspectorContent !== null,
      conceptLibOpen: conceptLibOpen,
    });
  }, [nodes, edges, inspectorContent, conceptLibOpen]);

  /* ---------- callbacks ---------- */
  // Wrap the handlers in useCallback to prevent recreation on every render
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      console.log("[DEBUG] onNodesChange called", changes);
      onNodesChange(changes);
    },
    [onNodesChange]
  );
  
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      console.log("[DEBUG] onEdgesChange called", changes);
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );
  
  const handleConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      logger.info("edge draft", params);
      setPending(params);
    },
    [setPending]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const data = e.dataTransfer.getData("application/reactflow");
      if (!data) return;
      const { nodeType, label, description } = JSON.parse(data);
      const pos = rf.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
      addNode(nodeType, pos, {
        label,
        description,
        original_id: nanoid(),
      });
      playNodeAdd();
    },
    [rf, addNode]
  );

  // Edge click triggers synthesis
  const handleEdgeClick = useCallback(async (evt: React.MouseEvent, edge: Edge) => {
    // Prevent default ReactFlow edge selection behaviour interfering (optional)
    evt.stopPropagation();
    logger.info("Edge clicked", edge.id);
    playSynthesisStart();
    try {
      await edgesStateInvokeSynthesis();
    } catch (err) {
      logger.error("synthesis failed", err);
    }
  }, [edgesStateInvokeSynthesis]);

  /* ---------- memo node list with inspector flag and depth mapping ---------- */
  const enhancedNodes = useMemo(
    () => {
      console.log("[DEBUG] Recalculating nodes memoization");
      return nodes.map((n: Node, index: number) => {
        // Calculate depth based on node type and creation order
        const calculatedDepth = getDepthByNodeType(n.data.type, index);
        
        return {
          ...n,
          data: {
            ...n.data,
            // Use explicitly set depth if available, otherwise use calculated
            depth: n.data.depth !== undefined ? n.data.depth : calculatedDepth,
            isInspectorSelected:
              inspectorType === "node" && inspectorContent?.id === n.id,
          },
        };
      });
    },
    [nodes, inspectorContent, inspectorType, getDepthByNodeType]
  );
  
  // Depth preview toggle state
  const [depthPreviewOn, setDepthPreviewOn] = React.useState<boolean>(() => {
    return localStorage.getItem('previewDepth') === 'true';
  });

  /* ---------- render ---------- */
  return (
    <div className="w-full h-screen relative flex flex-col">
      <div
        className={clsx(
          'flex-grow border border-gray-300 relative overflow-hidden',
          depthPreviewOn ? 'rf-parallax-wrapper' : 'preview-depth-off'
        )}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
      >
        <ReactFlow
          nodes={enhancedNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onEdgeClick={handleEdgeClick}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>

        <InspectorPanel />
        {conceptLibOpen && <ConceptLibraryPanel />}
      </div>

      <RelationshipSelectorModal />

      <CanvasToolbar
        conceptLibOpen={conceptLibOpen}
        toggleConceptLib={toggleConceptLib}
        onToggleDepthPreview={setDepthPreviewOn}
      />
    </div>
  );
};

export default CanvasPage; 