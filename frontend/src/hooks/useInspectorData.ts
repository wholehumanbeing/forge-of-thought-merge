import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Edge, Node } from 'reactflow';
import useCanvasStore from '../store/canvasStore';
import { EdgeData, KnowledgeNodeData } from '../types/api';

export type InspectorType = 'node' | 'edge' | null;

interface UseInspectorData {
  isInspectorOpen: boolean;
  inspectorType: InspectorType;
  selectedNode: Node<KnowledgeNodeData> | null;
  selectedEdge: Edge<EdgeData> | null;
  nodeContextCache: CanvasState['nodeContextCache'];
  isLoadingNodeContext: boolean;
  closeInspector: () => void;
  setEdgeSemanticType: (edgeId: string, newType: string) => void;
  fetchNodeContext: (kiId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<KnowledgeNodeData>) => void;
}

export function useInspectorData(): UseInspectorData {
  // Pull required state from the canvas store
  const {
    isInspectorOpen,
    selectedNodeId,
    selectedEdgeId,
    nodes,
    edges,
    nodeContextCache,
    isLoadingNodeContext,
    closeInspector,
    setEdgeSemanticType,
    fetchNodeContext,
    updateNodeData,
  } = useCanvasStore(
    useShallow((state: any) => ({
      isInspectorOpen: state.isInspectorOpen,
      selectedNodeId: state.selectedNodeId,
      selectedEdgeId: state.selectedEdgeId,
      nodes: state.nodes,
      edges: state.edges,
      nodeContextCache: state.nodeContextCache,
      isLoadingNodeContext: state.isLoadingNodeContext,
      closeInspector: state.closeInspector,
      setEdgeSemanticType: state.setEdgeSemanticType,
      fetchNodeContext: state.fetchNodeContext,
      updateNodeData: state.updateNodeData,
    }))
  );

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) || null : null),
    [selectedNodeId, nodes]
  );

  const selectedEdge = useMemo(
    () => (selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) || null : null),
    [selectedEdgeId, edges]
  );

  const inspectorType: InspectorType = selectedNode ? 'node' : selectedEdge ? 'edge' : null;

  return {
    isInspectorOpen,
    inspectorType,
    selectedNode,
    selectedEdge,
    nodeContextCache,
    isLoadingNodeContext,
    closeInspector,
    setEdgeSemanticType,
    fetchNodeContext,
    updateNodeData,
  };
} 