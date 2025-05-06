import { useStore } from 'reactflow';
import { NodeType } from '../types/api';

/**
 * Depth mapping constants - defines the baseline depth per node type
 */
export const DEPTH_PRESETS = {
  LOW: 1,
  MEDIUM: 3,
  HIGH: 5,
};

/**
 * Maps node types to their base depth values
 */
export const NODE_TYPE_DEPTH_MAP = {
  [NodeType.Concept]: DEPTH_PRESETS.MEDIUM,
  [NodeType.Axiom]: DEPTH_PRESETS.HIGH,
  [NodeType.School]: DEPTH_PRESETS.MEDIUM,
  [NodeType.Metaphor]: DEPTH_PRESETS.LOW,
  [NodeType.Source]: DEPTH_PRESETS.HIGH,
  [NodeType.Thinker]: DEPTH_PRESETS.MEDIUM,
  [NodeType.Synthesis]: DEPTH_PRESETS.LOW,
};

/**
 * Lightweight hook to get the current pan/zoom (viewport) from React Flow's internal store.
 * We rely on the public `useStore` selector to avoid private event APIs.
 * 
 * Also provides a utility to adjust depth values based on current zoom level
 * for maintaining perceptually consistent z-translation during zooming.
 */
export function useReactFlowViewport() {
  const transform = useStore((s) => s.transform); // [x, y, zoom]
  
  const zoom = transform[2];
  
  /**
   * Adjusts a base depth value according to current zoom level
   * to keep the visual effect consistent when zooming
   * 
   * @param baseDepth - The node's base depth value (typically 0-10)
   * @param baseScale - Optional multiplier for the effect (default: 10)
   * @returns Adjusted z-translation value in pixels
   */
  const getZAdjustedDepth = (baseDepth: number, baseScale: number = 10): number => {
    // Scale inversely with zoom to maintain perceptual consistency
    const scale = 1 / zoom;
    return baseDepth * baseScale * scale;
  };

  /**
   * Maps a node type to a depth value
   * 
   * @param nodeType - The type of the node
   * @param index - Optional index of the node in creation order (earlier = deeper)
   * @returns A depth value for the node
   */
  const getDepthByNodeType = (nodeType: NodeType | string, index: number = 0): number => {
    // Base depth from type mapping
    const typeDepth = NODE_TYPE_DEPTH_MAP[nodeType as NodeType] || DEPTH_PRESETS.MEDIUM;
    
    // Optional: Adjust by creation order - earlier nodes are slightly deeper
    // This creates more variation in the Z-axis layout
    const orderAdjustment = Math.max(0, Math.min(1, index / 20)); // Range 0-1 based on position
    
    return typeDepth - orderAdjustment;
  };

  return {
    x: transform[0],
    y: transform[1],
    zoom,
    getZAdjustedDepth,
    getDepthByNodeType,
    DEPTH_PRESETS,
  } as const;
} 