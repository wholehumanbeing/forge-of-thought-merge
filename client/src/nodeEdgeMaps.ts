import ConceptNode   from "@/components/nodes/ConceptNode";
import SynthesisNode from "@/components/nodes/SynthesisNode";
import ThinkerNode   from "@/components/nodes/ThinkerNode";
import SchoolNode    from "@/components/nodes/SchoolNode";
import KnowledgeNode from "@/components/nodes/KnowledgeNode";
import { StraightEdge } from "reactflow";

/** 
 * Centralized node and edge type maps for ReactFlow
 * These maps are created ONCE and exported as constants to prevent 
 * React Flow error #002: "It looks like you've created a new nodeTypes or edgeTypes object"
 */

// Node types map - referred to in CanvasPage.tsx
export const nodeTypes = {
  concept:   ConceptNode,
  synthesis: SynthesisNode,
  thinker:   ThinkerNode,
  school:    SchoolNode,
  knowledgeNode: KnowledgeNode,
};

// Edge types map - referred to in CanvasPage.tsx 
export const edgeTypes = { default: StraightEdge }; 