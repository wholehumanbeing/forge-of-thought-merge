from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid

# Import necessary types from the ontology
from .ki_ontology import NodeType, SemanticEdgeType

# --- API Request/Response Models ---

class NodeDTO(BaseModel):
    """
    Represents a node as transferred between frontend and backend APIs.
    This model is used for consistent communication between layers.
    """
    id: str = Field(..., description="Unique identifier for the node.")
    label: str = Field(..., description="The display name or label of the node.")
    type: NodeType = Field(..., description="The ontological type of the node.")
    data: Dict[str, Any] = Field(default_factory=dict, description="Flexible data payload with description, position, etc.")
    ki_id: Optional[str] = Field(None, description="Optional identifier linking to Knowledge Infrastructure.")

class EdgeDTO(BaseModel):
    """
    Represents an edge connecting two nodes in API communications.
    """
    id: str = Field(..., description="Unique identifier for the edge.")
    source: str = Field(..., description="The ID of the source node.")
    target: str = Field(..., description="The ID of the target node.")
    semantic_type: SemanticEdgeType = Field(..., description="The semantic meaning of the connection.")
    data: Optional[Dict[str, Any]] = Field(None, description="Optional data payload for the edge.")

class NodeData(BaseModel):
    """
    Represents a node as transferred between frontend and backend,
    or used internally for graph processing.
    """
    id: str = Field(..., description="Unique identifier for the node (e.g., UUID or frontend-generated ID).")
    type: NodeType = Field(..., description="The ontological type of the node.")
    label: str = Field(..., description="The display name or label of the node.")
    data: Dict[str, Any] = Field(default_factory=dict, description="Flexible data payload. Expected keys might include: 'description', 'position' (Dict[str, float]), 'user_notes', 'ki_confidence', etc.")
    position: Optional[Dict[str, float]] = Field(
        default_factory=lambda: {"x": 0.0, "y": 0.0, "z": 0.0},
        description="3-D position of the node in the scene. If omitted, will default to x/y from legacy data and z = 0."
    )
    ki_id: Optional[str] = Field(None, description="Optional identifier linking to a corresponding entity in the Knowledge Infrastructure graph.")

class EdgeData(BaseModel):
    """
    Represents an edge connecting two nodes, as transferred between
    frontend and backend or used internally.
    """
    id: str = Field(..., description="Unique identifier for the edge (e.g., UUID or frontend-generated ID).")
    source: str = Field(..., description="The ID of the source node.")
    target: str = Field(..., description="The ID of the target node.")
    semantic_type: SemanticEdgeType = Field(..., description="The user-defined semantic meaning of the connection.")
    data: Optional[Dict[str, Any]] = Field(None, description="Optional data payload for the edge (e.g., user notes, confidence).")

# Alias NodeDTO to ConceptOut for backward compatibility with existing code
ConceptOut = NodeDTO

class GraphStructure(BaseModel):
    """
    Represents the structure of the graph (nodes and edges) used as input
    for synthesis or other graph processing tasks.
    """
    nodes: List[NodeData] = Field(..., description="A list of nodes in the graph.")
    edges: List[EdgeData] = Field(..., description="A list of edges connecting the nodes.")

class SynthesisInput(BaseModel):
    """Represents the input for a synthesis request, primarily the graph structure."""
    graph: GraphStructure = Field(..., description="The graph structure to be synthesized.")
    # Potentially add other parameters like synthesis configuration options here
    # config: Optional[Dict[str, Any]] = None

class SynthesisOutput(BaseModel):
    """
    Represents the core output of a synthesis process, detailing the
    newly created concept/node.
    """
    id: str = Field(..., description="Unique identifier for the synthesized concept/node.")
    name: str = Field(..., description="The name assigned to the synthesized concept.")
    description: str = Field(..., description="A textual description or summary of the synthesized concept.")
    parent_node_ids: List[str] = Field(..., description="List of IDs of the direct parent nodes used in the synthesis.")
    status: str = Field(..., description="Indicates the status of the synthesis (e.g., 'success', 'failed', 'pending').")

# --- Lineage Report Models ---

class LineageItem(BaseModel):
    """
    A generic item representing an entity contributing to the lineage
    of a synthesized concept.
    """
    id: str = Field(..., description="Unique identifier of the lineage entity (e.g., KI ID).")
    name: str = Field(..., description="Name of the lineage entity.")
    type: str = Field(..., description="The type of the entity (e.g., 'Thinker', 'School', 'Axiom', 'Metaphor'). Could potentially use NodeType or a specific LineageEntityType enum.")
    contribution: Optional[str] = Field(None, description="Brief description of how this entity contributed to the synthesis.")
    connection_via: Optional[str] = Field(None, description="Describes the path or reason for this entity's inclusion in the lineage (e.g., 'Parent Node', 'Influences Parent X').")

class FoundationalElements(BaseModel):
    """
    Represents the underlying axioms and core metaphors identified
    as foundational to the synthesized concept.
    """
    underlying_axioms: List[LineageItem] = Field(default_factory=list, description="List of foundational axioms.")
    core_metaphors: List[LineageItem] = Field(default_factory=list, description="List of core metaphors.")

class LineageReport(BaseModel):
    """
    A detailed report outlining the intellectual and conceptual lineage
    of a synthesized concept.
    """
    synthesized_concept_id: str = Field(..., description="The ID of the concept this lineage report pertains to.")
    direct_parents: List[LineageItem] = Field(default_factory=list, description="Nodes directly used as input for the synthesis.")
    key_influencers: List[LineageItem] = Field(default_factory=list, description="Significant thinkers, works, or concepts indirectly influencing the synthesis.")
    schools_and_epochs: List[LineageItem] = Field(default_factory=list, description="Relevant schools of thought or historical periods providing context.")
    foundational_elements: FoundationalElements = Field(..., description="Core axioms and metaphors underlying the synthesized concept.")
    semantic_resonances: List[LineageItem] = Field(default_factory=list, description="Other concepts or entities found to be semantically related or resonant.")

# --- Combined Synthesis Result ---

class SynthesisResult(BaseModel):
    """
    The complete result of a synthesis operation, including the output
    concept and its detailed lineage report. This is typically the
    response model for the synthesis API endpoint.
    """
    synthesis_output: SynthesisOutput = Field(..., description="The details of the synthesized concept.")
    lineage_report: LineageReport = Field(..., description="The detailed lineage report for the synthesized concept.")


# --- Other Utility Models (Used elsewhere, e.g., Concept Library) ---

class ConceptInfo(BaseModel):
    """Simple model for concept search results, used by the Concept Library."""
    id: str = Field(..., description="Identifier of the concept (e.g., from Knowledge Infrastructure).")
    name: str = Field(..., description="Name of the concept.")

class RelatedNodeInfo(BaseModel):
    """Information about a node that's related to another node."""
    id: str = Field(..., description="Identifier of the related node.")
    label: str = Field(..., description="Display label of the related node.")
    type: Optional[NodeType] = Field(None, description="The type of the related node (e.g., CONCEPT, THINKER).")
    relationship: Optional[str] = Field(None, description="The relationship type connecting to the main node.")

class RelevantEdgeInfo(BaseModel):
    """Information about an edge that's relevant to a node."""
    id: str = Field(..., description="Identifier of the edge.")
    source: str = Field(..., description="ID of the source node.")
    target: str = Field(..., description="ID of the target node.")
    label: Optional[str] = Field(None, description="Optional display label for the edge.")
    semantic_label: Optional[str] = Field(None, description="Semantic type of the relationship.")

class NodeContext(BaseModel):
    """
    Detailed contextual information about a node, including its summary and related entities.
    Used by the Inspector Panel and Suggestion Service.
    """
    summary: Optional[str] = Field(None, description="A summary or description of the node.")
    relatedNodes: Optional[List[RelatedNodeInfo]] = Field(default_factory=list, description="List of nodes related to this one.")
    relevantEdges: Optional[List[RelevantEdgeInfo]] = Field(default_factory=list, description="List of edges connected to this node.") 