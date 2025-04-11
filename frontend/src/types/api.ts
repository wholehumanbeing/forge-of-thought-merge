// import { Node } from 'reactflow'; // Removed unused import
import { SemanticEdgeType } from '../constants/semanticRelationships';

// --- Basic Types ---

// Enum for Node Types (used in store and components)
export enum NodeType {
  Concept = 'concept',
  Synthesis = 'synthesis',
  Axiom = 'axiom',
  Metaphor = 'metaphor',
  Thinker = 'thinker',
  School = 'school',
  Source = 'source',
}

// Base data structure for general node properties
export interface NodeData {
  label: string;
  name?: string; // Add name if used consistently alongside label
  description?: string;
}

// Extended data structure for nodes managed internally by the store
// This is the type expected in Node<KnowledgeNodeData>
export interface KnowledgeNodeData extends NodeData {
    type: NodeType; // The specific type of the node using the enum
    ki_id?: string | null; // Optional identifier linking to a KI entity (V2 Plan)
    concept_type?: string; // Optional finer-grained type string (e.g., specific concept domain)

    // Fields added for visualization and tracking
    icon?: string;
    concept_source?: 'user_created' | 'synthesized' | 'imported' | 'forked' | string; // Allow specific lineage sources like 'lineage_key_influencers'

    // Fields for Synthesis Nodes
    synthesisOutput?: SynthesisOutput; // Store the core output data
    lineageReport?: LineageReport; // Store the associated lineage report

    // Fields for Lineage Nodes
    lineageCategory?: string; // e.g., 'key_influencers' - helps Inspector identify context
    contribution?: string; // Store contribution directly if available from LineageElement

    // Add other fields specific to internal state management if needed
    // e.g., created_at, updated_at if managed client-side for some nodes
    created_at?: string;
    updated_at?: string;

    // Optional original ID from external source (e.g., lineage item ID, concept library ID)
    original_id?: string; // Store the original ID from lineage source if needed for fetching more data
}

// Data structure for custom edge properties (used within Edge<T>)
export interface EdgeData {
  label?: string; // Optional label visible on the edge
  semantic_type?: SemanticEdgeType | null;
  created_at?: string;
  updated_at?: string;
}

// Input structure for the synthesis API endpoint (what CanvasPage sends)
export interface GraphStructure {
    // Define the specific fields the backend expects for nodes
    nodes: {
      id: string;
      type: string; // Backend likely expects string enum value
      label: string;
      description?: string;
      // Add any other KNOWN fields the backend might use from KnowledgeNodeData
      concept_type?: string;
      // Add any other data fields from KnowledgeNodeData that the backend needs
      // Ensure position is included if the backend needs it for context
      // position?: { x: number; y: number };
      // Include ki_id if needed by the backend
      ki_id?: string | null;
     }[];
    // Define the specific fields the backend expects for edges (matching backend EdgeData)
    edges: {
      id: string; // Edge ID is required by backend EdgeData
      source: string; // Changed from source_id
      target: string; // Changed from target_id
      semantic_type: SemanticEdgeType | string | null; // Match backend + allow null for potential temp edges
      data?: Record<string, any>; // Include generic data field as per backend
     }[];
}

// --- Synthesis Types (Refined) ---

// Output of the core synthesis process itself
export interface SynthesisOutput {
    id: string; // The ID of the *new* synthesis node
    name: string;
    description: string;
    parent_node_ids: string[]; // IDs of the nodes used as input
    created_at: string; // Assuming ISO string format from backend
    updated_at: string; // Assuming ISO string format from backend
    // Any other fields directly related to the synthesized concept from backend
}

// Structure for the lineage information report
export interface LineageReport {
    // Use LineageElement union type defined below
    key_influencers?: LineageElement[];
    schools_and_epochs?: LineageElement[];
    foundational_elements?: LineageElement[];
    // Add other categories if they exist (e.g., key_metaphors, cultural_resonances)
    // Allow flexible categories using an index signature
    [categoryKey: string]: LineageElement[] | undefined;
}

// The complete result returned by the synthesis API call, passed to the store
// This is what the CanvasPage useEffect hook expects in currentSynthesisResult
export interface SynthesisResult {
    synthesis_output: SynthesisOutput;
    lineage_report?: LineageReport; // Lineage might be optional or processed separately
}

// --- Node/Edge Suggestions ---
export interface Suggestion {
  id: string;       // Unique ID for the suggestion
  type: 'node' | 'edge';
  label: string;    // Textual description of the suggestion
  targetIds?: string[]; // For node suggestions: IDs of nodes this might connect to
  sourceId?: string; // For edge suggestions: source node ID
  targetId?: string; // For edge suggestions: target node ID
  // Store actual node/edge data if available for drag/drop population
  data?: Partial<KnowledgeNodeData> | Partial<EdgeData> | unknown; // More specific than unknown if possible
  priority?: number; // Optional priority score
}

// --- Node Context (Refined for Inspector Panel) ---

// Mirrors backend data_models.RelatedNodeInfo
export interface RelatedNodeInfo {
    id: string;       // Identifier of the related node (e.g., KI ID)
    label: string;    // Display label of the related node
    type?: NodeType;  // Ontological type of the related node (optional)
    relationship?: string; // Relationship type connecting to the main node (optional)
}

// Mirrors backend data_models.RelevantEdgeInfo
export interface RelevantEdgeInfo {
    id: string;       // Identifier of the edge
    source: string;    // ID of the source node
    target: string;    // ID of the target node
    label?: string;    // Optional display label for the edge
    semantic_label?: string; // Semantic type of the relationship (optional)
}

// Structure for data returned when requesting context for a selected node
// Mirrors backend data_models.NodeContext
export interface NodeContextData {
    summary?: string; // Summary/description from the backend
    relatedNodes?: RelatedNodeInfo[]; // Renamed field to match backend
    relevantEdges?: RelevantEdgeInfo[]; // Renamed field to match backend
    // Add other fields if the backend NodeContext model evolves
}

// --- Lineage Types (Refined structure for use in LineageReport and Nodes) ---

// Base interface for common properties of lineage items from the backend/source
interface LineageBase {
  id: string; // This ID comes from the knowledge graph / lineage source
  name: string; // Renamed from 'label' for consistency
  description?: string; // General description from source
  contribution?: string; // Specific contribution relevant to the synthesis (often generated)
}

// Specific lineage item types (matching potential backend structure)
export interface LineageThinker extends LineageBase {
  type: 'thinker'; // Matches backend/source type string
  // Add specific fields if available from backend (birth_year, field_of_study etc.)
}

export interface LineageSchool extends LineageBase {
  type: 'school_of_thought';
  // Add specific fields (key_ideas etc.)
}

export interface LineageAxiom extends LineageBase {
  type: 'axiom';
  // Add specific fields (source_thinker_id, source_school_id etc.)
}

export interface LineageMetaphor extends LineageBase {
  type: 'metaphor';
  // Add specific fields (source_domain, target_domain etc.)
}

export interface LineageResonance extends LineageBase {
  type: 'resonance';
  // Add specific fields (related_concept_id etc.)
}

// Union type for any lineage element item received from the backend/API
// This is the type used inside LineageReport arrays
export type LineageElement = LineageThinker | LineageSchool | LineageAxiom | LineageMetaphor | LineageResonance;

// --- Concept Search Types ---

// Structure returned by the concept search endpoint (or used in suggestions)
export interface ConceptInfo {
  id: string; // The unique ID of the concept node (e.g., elementId from Neo4j)
  name: string; // The name of the concept
  type?: NodeType; // Include type if backend provides it
  description?: string; // Include description if backend provides it
}

// --- Onboarding/Seed Concept Types ---

// Interface matching the data structure from the backend API for seed concepts
export interface ApiSeedConcept {
    id: string;
    label: string; // Matches NodeData.label
    description?: string; // Matches NodeData.description
    x?: number; // For initial positioning
    y?: number; // For initial positioning
    // Include other fields if the API provides them (e.g., type)
    type?: string; // If the backend provides a type string
}

// --- Type Guards ---

/**
 * Type guard to check if an object conforms to the KnowledgeNodeData interface.
 * Note: This checks for the presence and basic type of essential fields.
 * It assumes NodeData fields like 'label' are already validated or present.
 */
export function isKnowledgeNodeData(data: unknown): data is KnowledgeNodeData {
    if (!data || typeof data !== 'object') {
        return false;
    }
    // Check for required 'type' from KnowledgeNodeData
    const hasValidType = typeof (data as KnowledgeNodeData).type === 'string' && Object.values(NodeType).includes((data as KnowledgeNodeData).type as NodeType);
    // Check for optional but often used 'original_id'
    const hasOriginalId = 'original_id' in data ? typeof (data as KnowledgeNodeData).original_id === 'string' : true; // Allow missing original_id

    // Add checks for other distinguishing KnowledgeNodeData fields if necessary
    // For example, if only KnowledgeNodeData has a 'concept_source'
    // const hasConceptSource = 'concept_source' in data ? typeof (data as KnowledgeNodeData).concept_source === 'string' : true;

    return hasValidType && hasOriginalId; // && hasConceptSource etc.
} 