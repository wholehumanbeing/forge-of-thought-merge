import logging
from typing import Dict, List, Set, Optional, Union, Tuple
import asyncio

from app.db.knowledge_graph_interface import KnowledgeGraphInterface
# from app.db.vector_db_interface import VectorDBInterface
from app.models.data_models import (
    # StoredSynthesis,
    LineageReport, LineageItem, SynthesisOutput, GraphStructure, NodeData
    # Removed: Thinker, Work, SchoolOfThought, Epoch,
    # Concept, CoreMetaphor, Symbol, SemanticResonance, Node
)
from app.models.ki_ontology import NodeType, RelationshipType

logger = logging.getLogger(__name__)

class LineageMapper:
    """Service responsible for tracing and structuring the lineage of a synthesis."""

    def __init__(self, kg_interface: KnowledgeGraphInterface):
        """
        Initializes the LineageMapper.

        Args:
            kg_interface: An instance of the KnowledgeGraphInterface.
        """
        if not kg_interface:
             raise ValueError("KnowledgeGraphInterface instance is required.")
        self.kg_interface = kg_interface
        # self.vector_db_interface = vector_db_interface
        logger.info("LineageMapper initialized.")

    def _format_as_lineage_item(self, node_data: Union[NodeData, Dict], connection_info: Optional[List[Union[str, RelationshipType]]] = None) -> Optional[LineageItem]:
        """
        Converts NodeData or a KG node dictionary into a LineageItem.
        Optionally includes information about how the item is connected.

        Args:
            node_data: The node data (NodeData object or dict from KG).
            connection_info: Information about the path/relationships connecting this node
                               (e.g., list of relationship types as strings or enums).

        Returns:
            A populated LineageItem or None if conversion fails.
        """
        if not node_data:
            return None

        try:
            ki_id = None
            label = "Unknown Label"
            node_type = NodeType.CONCEPT # Default
            description = ""

            if isinstance(node_data, NodeData):
                # If it's already NodeData from the generating graph
                ki_id = node_data.ki_id
                label = node_data.label
                node_type = node_data.type
                description = node_data.data.get("description", "")
            elif isinstance(node_data, dict):
                # If it's a dictionary returned from the KG
                ki_id = node_data.get("ki_id")
                label = node_data.get("label", "Unknown Label")
                node_type_str = node_data.get("type", NodeType.CONCEPT.value)
                try:
                    node_type = NodeType(node_type_str)
                except ValueError:
                    logger.warning(f"Unknown node type '{node_type_str}' found for {ki_id}. Defaulting to Concept.")
                    node_type = NodeType.CONCEPT
                description = node_data.get("description", "")
            else:
                logger.warning(f"Unsupported data type for lineage item conversion: {type(node_data)}")
                return None

            if not ki_id:
                 logger.warning(f"Node data missing ki_id: {node_data}")
                 return None # Cannot create LineageItem without ki_id

            # --- Determine Contribution and Connection --- 
            contribution = f"{node_type.value.replace('_', ' ').title()}"
            connection_via = "Direct Parent" # Default for direct parents

            if connection_info:
                # Format connection_via based on provided path info
                # Example: Join relationship types
                rel_types = []
                for rel in connection_info:
                    if isinstance(rel, RelationshipType):
                        rel_types.append(rel.value)
                    elif isinstance(rel, str):
                        rel_types.append(rel)
                connection_via = " -> ".join(rel_types) if rel_types else "Related"

                # Infer contribution based on node type and potentially connection
                if node_type == NodeType.THINKER:
                    contribution = "Influential Thinker"
                elif node_type == NodeType.WORK:
                    contribution = "Source Work"
                elif node_type == NodeType.SCHOOL_OF_THOUGHT:
                    contribution = "Associated School"
                elif node_type == NodeType.EPOCH:
                    contribution = "Historical Epoch"
                elif node_type == NodeType.CONCEPT:
                    if RelationshipType.BASED_ON_AXIOM in connection_info:
                        contribution = "Axiomatic Concept"
                    else:
                        contribution = "Related Concept"
                elif node_type == NodeType.CORE_METAPHOR:
                     if RelationshipType.USES_METAPHOR in connection_info:
                         contribution = "Underlying Metaphor"
                     else:
                         contribution = "Related Metaphor"
                # Add more specific contribution logic if needed

            return LineageItem(
                ki_id=ki_id,
                label=label,
                node_type=node_type,
                description=description,
                contribution=contribution,
                connection_via=connection_via
            )

        except Exception as e:
            logger.error(f"Error converting node data to LineageItem: {e} - Data: {node_data}", exc_info=True)
            return None

    async def trace_lineage(self, synthesis_output: SynthesisOutput, generating_graph: GraphStructure) -> LineageReport:
        """
        Constructs the structured lineage report for a given synthesis, querying the Knowledge Graph.

        Args:
            synthesis_output: The generated synthesis object.
            generating_graph: The graph structure used to generate the synthesis.

        Returns:
            A LineageReport containing traced parent nodes and influential KI entities.
        """
        logger.info(f"Tracing lineage for synthesis: {synthesis_output.id}")
        parent_ki_ids: List[str] = synthesis_output.parent_node_ids
        generating_node_map: Dict[str, NodeData] = {node.id: node for node in generating_graph.nodes}
        # Use ki_id as key if available, otherwise fallback to canvas id
        generating_node_ki_map: Dict[str, NodeData] = {node.ki_id: node for node in generating_graph.nodes if node.ki_id}

        direct_parents: List[LineageItem] = []
        deep_lineage_seed_ids: Set[str] = set() # Use KI IDs for deep tracing

        # --- Step 1: Identify Direct Parents --- 
        logger.debug(f"Identifying direct parents from {len(parent_ki_ids)} potential KI IDs.")
        if parent_ki_ids:
            # Try to find NodeData in the generating_graph first
            for ki_id in parent_ki_ids:
                if ki_id in generating_node_ki_map:
                    node_data = generating_node_ki_map[ki_id]
                    # Direct parents have implicit connection
                    item = self._format_as_lineage_item(node_data, connection_info=None) # Pass None for connection_info
                    if item:
                        direct_parents.append(item)
                        deep_lineage_seed_ids.add(ki_id)
                else:
                    # If not in generating_graph (e.g., only KI ID was known), flag for potential KG lookup
                    # We could query KG here, but let's rely on deep lineage query later for simplicity
                    logger.warning(f"Parent KI ID {ki_id} not found in generating graph. Will rely on deep trace.")
                    # Still add the KI ID for deep tracing
                    deep_lineage_seed_ids.add(ki_id)
        else:
             logger.warning(f"Synthesis {synthesis_output.id} has no parent KI IDs listed.")
             # Optionally: could inspect generating_graph for nodes without KI IDs as parents?

        # Fallback: If no KI IDs were found, use local IDs from generating graph?
        # This is less ideal as deep tracing needs KI IDs. For now, we proceed if deep_lineage_seed_ids is empty.
        if not deep_lineage_seed_ids:
             logger.warning(f"No KI IDs identified as parents for {synthesis_output.id}. Deep lineage trace will be limited.")
             # If needed, add logic here to use generating_graph.nodes without ki_ids


        # --- Step 2: Plan & Execute Deep Lineage Queries --- 
        key_thinkers: List[LineageItem] = []
        key_works: List[LineageItem] = []
        schools: List[LineageItem] = []
        epochs: List[LineageItem] = []
        foundational_concepts: List[LineageItem] = []
        foundational_metaphors: List[LineageItem] = []
        # semantic_resonances removed

        if deep_lineage_seed_ids:
            seed_list = list(deep_lineage_seed_ids)
            logger.info(f"Starting deep lineage trace from {len(seed_list)} seed nodes: {seed_list}")
            try:
                # Define relationship types for influence tracing
                influence_rels = [
                    RelationshipType.INFLUENCED_BY,
                    RelationshipType.DERIVED_FROM,
                    RelationshipType.CRITIQUED_BY,
                    RelationshipType.BUILT_UPON,
                    RelationshipType.REFERENCES_WORK,
                    RelationshipType.PART_OF_SCHOOL,
                    RelationshipType.ASSOCIATED_WITH_EPOCH,
                ]
                # Define relationships for foundational elements
                foundation_rels = [
                    RelationshipType.BASED_ON_AXIOM,
                    RelationshipType.USES_METAPHOR,
                    RelationshipType.DEFINED_BY_CONCEPT,
                    RelationshipType.HAS_COMPONENT, # e.g. School -> Concept
                ]

                # Execute a combined query if possible, or separate queries
                # Assuming kg_interface has methods like find_related_entities_by_paths
                # or dedicated methods like find_thinkers_for_nodes etc.

                # Example using hypothetical combined query:
                # **ASSUMPTION**: This method returns list of tuples: (node_dict, connection_info_list)
                related_entities_with_paths: List[Tuple[Dict, List[Union[str, RelationshipType]]]] = \
                    self.kg_interface.find_related_entities_by_paths(
                    start_node_ids=seed_list,
                    relationships=influence_rels + foundation_rels,
                    target_types=[
                        NodeType.THINKER, NodeType.WORK, NodeType.SCHOOL_OF_THOUGHT,
                        NodeType.EPOCH, NodeType.CONCEPT, NodeType.CORE_METAPHOR
                    ],
                    max_depth=3 # Limit search depth
                )

                # Process and categorize results
                processed_ids: Set[str] = set() # Avoid duplicates
                # for entity_dict in related_entities: # Assuming list of node dictionaries
                for entity_dict, conn_info in related_entities_with_paths: # Iterate through tuples
                    ki_id = entity_dict.get("ki_id")
                    if ki_id in processed_ids or ki_id in deep_lineage_seed_ids: # Also skip seeds
                        continue

                    # item = self._format_as_lineage_item(entity_dict)
                    item = self._format_as_lineage_item(entity_dict, connection_info=conn_info) # Pass connection info
                    if not item:
                        continue

                    if item.node_type == NodeType.THINKER:
                        key_thinkers.append(item)
                    elif item.node_type == NodeType.WORK:
                        key_works.append(item)
                    elif item.node_type == NodeType.SCHOOL_OF_THOUGHT:
                        schools.append(item)
                    elif item.node_type == NodeType.EPOCH:
                        epochs.append(item)
                    elif item.node_type == NodeType.CONCEPT:
                        # Check if it's one of the direct parents to avoid double listing?
                        if ki_id not in deep_lineage_seed_ids:
                             foundational_concepts.append(item)
                    elif item.node_type == NodeType.CORE_METAPHOR:
                        foundational_metaphors.append(item)
                    # Add other types if needed

                    processed_ids.add(ki_id)

                logger.info(f"Deep lineage trace found: {len(key_thinkers)} thinkers, {len(key_works)} works, "
                            f"{len(schools)} schools, {len(epochs)} epochs, "
                            f"{len(foundational_concepts)} concepts, {len(foundational_metaphors)} metaphors.")

            except AttributeError:
                 logger.warning("KG Interface does not have 'find_related_entities_by_paths'. Falling back to individual queries.")
                 # Fallback to individual queries if the combined one doesn't exist
                 try:
                     limit_per_type = 3 # Define limit for each type
                     processed_ids: Set[str] = set() # Track processed IDs across all categories

                     # --- Define Relationship and Node Types for each Category ---
                     # (Keep definitions for reference if needed later)
                     thinker_config = {
                         "target_list": key_thinkers,
                         "neighbor_types": [NodeType.THINKER],
                         "relationship_types": [RelationshipType.INFLUENCED_BY] # Removed CRITIQUED_BY
                     }
                     # ... (other configs remain for context but are not used in the loop below) ...


                     # --- New Simplified Sequential Logic for Thinkers Only ---
                     logger.info("Executing simplified sequential query for Thinkers.")
                     key_thinkers = [] # Reset target list
                     key_works = []
                     schools = []
                     epochs = []
                     foundational_concepts = []
                     foundational_metaphors = []

                     thinker_results_raw: List[NodeData] = []
                     async for current_ki_id in AsyncIteratorWrapper(seed_list): # Helper needed if seed_list isn't async iterable
                         try:
                             logger.debug(f"Querying thinkers related to seed: {current_ki_id}")
                             results = self.kg_interface.find_related_nodes(
                                 node_ki_id=current_ki_id,
                                 relationship_types=thinker_config["relationship_types"],
                                 neighbor_types=thinker_config["neighbor_types"],
                                 limit=limit_per_type
                             )
                             if results:
                                 thinker_results_raw.extend(results)
                         except Exception as loop_error:
                             logger.error(f"Error fetching thinkers for seed {current_ki_id}: {loop_error}", exc_info=True)

                     # Deduplicate and limit thinker results
                     deduplicated_thinkers: Dict[str, NodeData] = {}
                     for node in thinker_results_raw:
                         if node and node.ki_id and node.ki_id not in deep_lineage_seed_ids and node.ki_id not in processed_ids:
                             deduplicated_thinkers[node.ki_id] = node

                     final_thinker_nodes = list(deduplicated_thinkers.values())[:limit_per_type]

                     # Format final thinker nodes
                     for node_data in final_thinker_nodes:
                         item = self._format_as_lineage_item(node_data, connection_info=None) # No connection info from find_related_nodes
                         if item:
                             key_thinkers.append(item)
                             processed_ids.add(node_data.ki_id) # Add to processed set

                     logger.info(f"Deep lineage trace (sequential fallback) found: {len(key_thinkers)} thinkers.")
                     # Other lists remain empty for now

                 except AttributeError as e:
                     logger.error(f"KG Interface missing 'find_related_nodes' method for deep lineage fallback: {e}", exc_info=True)
                 except Exception as fallback_error: # Catch potential errors in the new logic
                      logger.error(f"Error during simplified fallback lineage trace: {fallback_error}", exc_info=True)


            except Exception as e:
                logger.error(f"Error during deep lineage trace query: {e}", exc_info=True)
                # Continue with potentially incomplete data

        # --- Structure the output ---
        report = LineageReport(
            synthesized_concept_id = synthesis_output.id, # Use correct field name
            direct_parents=direct_parents,
            # Structure according to LineageReport model
            key_influencers=key_thinkers + key_works, # key_works is []
            schools_and_epochs=schools + epochs,     # schools and epochs are []
            foundational_elements={
                "concepts": foundational_concepts,   # foundational_concepts is []
                "metaphors": foundational_metaphors, # foundational_metaphors is []
                # "symbols": foundational_symbols # Symbols not included in example query
                "symbols": [] # Add if symbols are queried later
            },
            semantic_resonances=[] # Removed
        )

        logger.info(f"Lineage tracing complete for {synthesis_output.id}. Report generated.")
        return report

# Helper class to make a standard list asynchronously iterable
class AsyncIteratorWrapper:
    def __init__(self, obj):
        self._it = iter(obj)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            value = next(self._it)
        except StopIteration:
            raise StopAsyncIteration
        return value

# Remove old implementation
'''
class LineageMapper:
    """Service responsible for tracing and structuring the lineage of a synthesis."""

    def __init__(self, kg_interface: KnowledgeGraphInterface, vector_db_interface: VectorDBInterface):
        self.kg_interface = kg_interface
        self.vector_db_interface = vector_db_interface

    def trace_full_lineage(self, synthesis_data: StoredSynthesis) -> LineageReport:
        """Constructs the full structured lineage report for a given synthesis."""

        parent_ids = synthesis_data.parent_node_ids
        if not parent_ids:
            # Handle cases with no direct parents if necessary
            return LineageReport(synthesis_id=synthesis_data.id)

        # 1. Get Direct Parent Nodes
        direct_parents: List[Node] = self.kg_interface.get_nodes_by_ids(parent_ids)

        # 2. Query KG for related entities based on parent IDs
        key_thinkers: List[Thinker] = self.kg_interface.find_thinkers_for_nodes(parent_ids)
        key_works: List[Work] = self.kg_interface.find_works_for_nodes(parent_ids)
        schools: List[SchoolOfThought] = self.kg_interface.find_schools_for_nodes(parent_ids)
        epochs: List[Epoch] = self.kg_interface.find_epochs_for_nodes(parent_ids)

        # Define relationship types for foundational concepts
        foundation_relationships = ["influencedBy", "derivesFrom", "basedOnAxiom", "usesConcept", "references"]
        foundational_concepts: List[Concept] = self.kg_interface.find_concepts_by_relation(parent_ids, foundation_relationships)

        # Find associated metaphors and symbols
        metaphors_symbols_dict: Dict[str, List[Union[CoreMetaphor, Symbol]]] = \
            self.kg_interface.find_metaphors_symbols_for_nodes(parent_ids)
        foundational_metaphors: List[CoreMetaphor] = metaphors_symbols_dict.get("metaphors", [])
        foundational_symbols: List[Symbol] = metaphors_symbols_dict.get("symbols", [])

        # 3. Query VectorDB for Semantic Resonances
        # Use synthesis text or user query as the basis for similarity search
        query_text = synthesis_data.synthesis_text
        semantic_resonances: List[SemanticResonance] = []
        if query_text:
            semantic_resonances = self.vector_db_interface.find_similar_concepts(query_text, k=10) # Find top 10 similar
            # Filter out concepts that are already direct parents or foundational? (Optional)
            parent_concept_ids = {p.id for p in direct_parents if p.label == 'Concept'} \
                                 .union({c.id for c in foundational_concepts})
            semantic_resonances = [res for res in semantic_resonances if res.concept_id not in parent_concept_ids]

        # 4. Structure the output
        report = LineageReport(
            synthesis_id=synthesis_data.id,
            direct_parents=direct_parents,
            key_influencers={
                "thinkers": key_thinkers,
                "works": key_works
            },
            schools_and_epochs={
                "schools": schools,
                "epochs": epochs
            },
            foundational_elements={
                "concepts": foundational_concepts,
                "metaphors": foundational_metaphors,
                "symbols": foundational_symbols
            },
            semantic_resonances=semantic_resonances
        )

        return report
''' 