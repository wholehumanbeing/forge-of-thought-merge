import logging
from typing import List, Dict, Set, Optional, Tuple, Any
from collections import defaultdict
import heapq # Import heapq for potential ranking improvements
# Optional: Import a library for simple string similarity if needed (e.g., fuzzywuzzy or standard library difflib)
# from fuzzywuzzy import fuzz

# Dependency Injection: Import the specific implementation classes
from app.db.knowledge_graph_interface import Neo4jKnowledgeGraph
from app.db.vector_db_interface import ChromaVectorDB

from app.models.data_models import NodeData
from app.models.ki_ontology import NodeType, SemanticEdgeType, RelationshipType

logger = logging.getLogger(__name__)

class SuggestionService:
    """
    Provides context-aware suggestions for node relations and edge types
    by integrating Knowledge Graph structural data and Vector DB semantic data.
    """

    def __init__(self, kg_interface: Neo4jKnowledgeGraph, vector_interface: ChromaVectorDB):
        """
        Initializes the SuggestionService.

        Args:
            kg_interface: An instance of the Neo4jKnowledgeGraph interface.
            vector_interface: An instance of the ChromaVectorDB interface.
        """
        if not kg_interface:
            raise ValueError("KnowledgeGraphInterface instance is required.")
        if not vector_interface:
            raise ValueError("VectorDBInterface instance is required.")
        self.kg_interface = kg_interface
        self.vector_interface = vector_interface
        logger.info("SuggestionService initialized.")

    def suggest_related_nodes(
        self,
        focus_node_ki_id: str,
        current_node_ids_on_canvas: Set[str],
        limit: int = 5
    ) -> List[NodeData]:
        """
        Suggests nodes related to a focus node, excluding those already on the canvas.

        Combines structurally related nodes from the KG and semantically similar
        nodes from the Vector DB.

        Args:
            focus_node_ki_id: The ki_id of the node to get suggestions for.
            current_node_ids_on_canvas: A set of ki_ids currently present on the user's canvas.
            limit: The maximum number of suggestions to return.

        Returns:
            A list of NodeData objects representing suggested related nodes, ranked by relevance.
        """
        logger.info(f"Suggesting related nodes for {focus_node_ki_id}, excluding {len(current_node_ids_on_canvas)} nodes, limit {limit}.")
        suggestions: Dict[str, Tuple[NodeData, float]] = {} # ki_id -> (NodeData, score)

        # 1. Get Structurally Related Nodes (KG)
        try:
            structural_neighbors = self.kg_interface.find_related_nodes(
                node_ki_id=focus_node_ki_id,
                limit=limit * 2 # Fetch more initially to allow for filtering/ranking
            )
            for node in structural_neighbors:
                if node.ki_id and node.ki_id not in current_node_ids_on_canvas and node.ki_id != focus_node_ki_id:
                    # Assign higher score for direct structural links
                    suggestions[node.ki_id] = (node, 1.0)
            logger.debug(f"Found {len(structural_neighbors)} potential structural neighbors for {focus_node_ki_id}.")
        except Exception as e:
            logger.error(f"Error fetching structural neighbors for {focus_node_ki_id}: {e}", exc_info=True)

        # 2. Get Semantically Similar Nodes (Vector DB)
        # Fetch focus node details (e.g., name, description) to use for semantic query
        focus_node_data = self.kg_interface.get_node_context(focus_node_ki_id)
        query_text = None
        if focus_node_data:
             # Combine relevant text fields for a richer query
             query_text_parts = [focus_node_data.label]
             if focus_node_data.data.get('description'):
                 query_text_parts.append(focus_node_data.data['description'])
             # Add other relevant fields if available, e.g., user_notes
             query_text = " ".join(query_text_parts)

        if query_text:
            try:
                # Fetch more initially to allow for filtering/ranking
                # Optional: Filter vector search by NodeType if relevant (e.g., suggest Concepts related to a Thinker)
                # filter_meta = {"node_type": NodeType.CONCEPT.value} # Example filter
                semantic_results = self.vector_interface.find_similar(
                    query_text=query_text,
                    n_results=limit * 2,
                    # filter_metadata=filter_meta # Optional: Add metadata filter if desired
                )

                if semantic_results and semantic_results.get('ids') and semantic_results['ids'][0]:
                    result_ids = semantic_results['ids'][0]
                    distances = semantic_results.get('distances', [[]])[0] if semantic_results.get('distances') else []
                    metadatas = semantic_results.get('metadatas', [[]])[0] if semantic_results.get('metadatas') else []

                    nodes_to_fetch = []
                    potential_semantic: Dict[str, float] = {} # ki_id -> score

                    for i, node_id in enumerate(result_ids):
                        # Assuming metadata contains ki_id or we use the result ID directly if it's the ki_id
                        # Adjust based on how vector DB is populated
                        ki_id = metadatas[i].get('ki_id', node_id) if i < len(metadatas) and metadatas[i] else node_id

                        if ki_id and ki_id not in current_node_ids_on_canvas and ki_id != focus_node_ki_id:
                            # Simple scoring: higher score for lower distance (more similar)
                            distance = distances[i] if i < len(distances) and distances[i] is not None else 1.0 # Default distance if missing
                            score = max(0.0, 1.0 - distance) # Normalize score (assuming distance is 0-1 range, e.g., cosine)

                            # Only consider adding if not already present or has a better score (semantic score < 1.0)
                            if ki_id not in suggestions or score > suggestions[ki_id][1]:
                                potential_semantic[ki_id] = score
                                if ki_id not in suggestions: # Avoid fetching if already have NodeData from structural
                                     nodes_to_fetch.append(ki_id)

                    logger.debug(f"Found {len(potential_semantic)} potential semantic neighbors for {focus_node_ki_id}.")

                    # Fetch full NodeData for new semantic suggestions
                    if nodes_to_fetch:
                        fetched_nodes = self.kg_interface.get_nodes_by_ids(nodes_to_fetch) # Assumes get_nodes_by_ids exists and uses ki_id
                        for node in fetched_nodes:
                             if node.ki_id in potential_semantic:
                                 suggestions[node.ki_id] = (node, potential_semantic[node.ki_id] * 0.8) # Weight semantic less than structural?

            except Exception as e:
                logger.error(f"Error fetching semantic neighbors for query '{query_text[:50]}...': {e}", exc_info=True)
        else:
             logger.warning(f"Could not generate query text for focus node {focus_node_ki_id}. Skipping semantic suggestions.")


        # 3. Rank and Limit Results
        # Sort by score (descending) then alphabetically by label as tie-breaker
        ranked_suggestions = sorted(
            suggestions.values(),
            key=lambda item: (-item[1], item[0].label)
        )

        final_suggestions = [node for node, score in ranked_suggestions[:limit]]
        logger.info(f"Returning {len(final_suggestions)} ranked suggestions for {focus_node_ki_id}.")
        return final_suggestions


    def _get_heuristic_edge_suggestions(
        self, source_type: NodeType, target_type: NodeType
    ) -> List[SemanticEdgeType]:
        """Provides baseline edge suggestions based on node type pairs."""
        # Define heuristics (expand significantly based on ontology and use cases)
        heuristics: Dict[Tuple[NodeType, NodeType], List[SemanticEdgeType]] = {
            # Thinker -> X
            (NodeType.THINKER, NodeType.CONCEPT): [SemanticEdgeType.DEFINES, SemanticEdgeType.INFLUENCES, SemanticEdgeType.CHALLENGES_PREMISE_OF],
            (NodeType.THINKER, NodeType.WORK): [SemanticEdgeType.INFLUENCES], # Usually captured by HAS_AUTHOR in KG
            (NodeType.THINKER, NodeType.THINKER): [SemanticEdgeType.INFLUENCES, SemanticEdgeType.OPPOSES, SemanticEdgeType.RESONATES_WITH],
            (NodeType.THINKER, NodeType.SCHOOL_OF_THOUGHT): [SemanticEdgeType.INFLUENCES], # Usually MEMBER_OF in KG
            # Concept -> X
            (NodeType.CONCEPT, NodeType.CONCEPT): [SemanticEdgeType.RESONATES_WITH, SemanticEdgeType.IS_ANALOGOUS_TO, SemanticEdgeType.SYNTHESIZES_WITH, SemanticEdgeType.OPPOSES, SemanticEdgeType.DERIVES_FROM, SemanticEdgeType.IS_COMPONENT_OF, SemanticEdgeType.LIMITS],
            (NodeType.CONCEPT, NodeType.THINKER): [SemanticEdgeType.INFLUENCES, SemanticEdgeType.ILLUSTRATES],
            (NodeType.CONCEPT, NodeType.WORK): [SemanticEdgeType.ILLUSTRATES, SemanticEdgeType.IS_METAPHOR_FOR],
            (NodeType.CONCEPT, NodeType.AXIOM): [SemanticEdgeType.DERIVES_FROM, SemanticEdgeType.CHALLENGES_PREMISE_OF],
            (NodeType.CONCEPT, NodeType.METAPHOR): [SemanticEdgeType.IS_METAPHOR_FOR, SemanticEdgeType.USES_METAPHOR], # Assuming UsesMetaphor is semantic too
            # Work -> X
            (NodeType.WORK, NodeType.CONCEPT): [SemanticEdgeType.DEFINES, SemanticEdgeType.ILLUSTRATES, SemanticEdgeType.USES_METAPHOR],
            (NodeType.WORK, NodeType.THINKER): [SemanticEdgeType.INFLUENCES, SemanticEdgeType.REFUTES],
            (NodeType.WORK, NodeType.WORK): [SemanticEdgeType.RESONATES_WITH, SemanticEdgeType.REFUTES, SemanticEdgeType.CITES], # Assuming Cites is semantic too
            # School -> X
            (NodeType.SCHOOL_OF_THOUGHT, NodeType.CONCEPT): [SemanticEdgeType.DEFINES, SemanticEdgeType.INFLUENCES],
            (NodeType.SCHOOL_OF_THOUGHT, NodeType.THINKER): [SemanticEdgeType.INFLUENCES],
            # Axiom/Metaphor -> Concept
            (NodeType.AXIOM, NodeType.CONCEPT): [SemanticEdgeType.IS_AXIOM_FOR, SemanticEdgeType.ENABLES],
            (NodeType.METAPHOR, NodeType.CONCEPT): [SemanticEdgeType.IS_METAPHOR_FOR, SemanticEdgeType.ILLUSTRATES],
        }

        # Check both directions (Source -> Target and Target -> Source)
        suggestions = heuristics.get((source_type, target_type), [])
        # Consider reverse relationship suggestions if applicable (e.g., if A influences B, maybe B illustrates A)
        # This part needs careful ontological consideration - skipping for now for simplicity.
        # reverse_suggestions = heuristics.get((target_type, source_type), [])
        # Add logic here to map reverse heuristics appropriately if needed

        # Add generic fallback
        if not suggestions:
            suggestions.append(SemanticEdgeType.RELATED_TO)

        return list(set(suggestions)) # Return unique suggestions


    def _map_known_interaction_to_semantic(self, interaction_type: str) -> List[SemanticEdgeType]:
        """Maps known KG RelationshipTypes to plausible SemanticEdgeTypes."""
        # This mapping is crucial and depends on the semantics of RelationshipType vs SemanticEdgeType
        mapping: Dict[str, List[SemanticEdgeType]] = {
            RelationshipType.INFLUENCED_BY.value: [SemanticEdgeType.INFLUENCES, SemanticEdgeType.DERIVES_FROM],
            RelationshipType.CONTRADICTS.value: [SemanticEdgeType.OPPOSES, SemanticEdgeType.CONTRADICTS_CLAIM, SemanticEdgeType.REFUTES],
            RelationshipType.DERIVED_FROM.value: [SemanticEdgeType.DERIVES_FROM, SemanticEdgeType.IS_COMPONENT_OF],
            RelationshipType.CITES.value: [SemanticEdgeType.REFERENCES], # Assuming REFERENCES is added to SemanticEdgeType
            RelationshipType.USES_METAPHOR.value: [SemanticEdgeType.USES_METAPHOR, SemanticEdgeType.IS_METAPHOR_FOR],
            RelationshipType.BASED_ON_AXIOM.value: [SemanticEdgeType.IS_AXIOM_FOR, SemanticEdgeType.DERIVES_FROM],
            RelationshipType.HAS_AUTHOR.value: [SemanticEdgeType.DEFINES, SemanticEdgeType.ILLUSTRATES], # Author defines concepts in work?
            RelationshipType.HAS_MEMBER.value: [SemanticEdgeType.INFLUENCES], # Member influences school?
            RelationshipType.SUBCLASS_OF.value: [SemanticEdgeType.IS_COMPONENT_OF], # Loose mapping
            RelationshipType.INSTANCE_OF.value: [SemanticEdgeType.ILLUSTRATES], # Instance illustrates concept?
            # Add mappings for other RelationshipTypes...
        }
        # Fallback: if a direct documented relationship exists, RELATED_TO is always plausible
        base_suggestion = [SemanticEdgeType.RELATED_TO]
        specific_suggestions = mapping.get(interaction_type, [])

        return list(set(base_suggestion + specific_suggestions))


    async def suggest_edge_types(
        self,
        source_type: NodeType,
        target_type: NodeType,
        source_label: Optional[str] = None,
        target_label: Optional[str] = None,
        source_ki_id: Optional[str] = None,
        target_ki_id: Optional[str] = None,
        limit: int = 5
    ) -> List[SemanticEdgeType]:
        """
        Suggests potential SemanticEdgeTypes between two nodes.

        Prioritizes suggestions based on known interactions in the Knowledge Graph
        and semantic similarity from the Vector DB if KI IDs are provided.
        Falls back to heuristics based on node types and potentially labels if KI IDs are missing.

        Args:
            source_type: The NodeType of the source node.
            target_type: The NodeType of the target node.
            source_label: The label (name) of the source node (optional).
            target_label: The label (name) of the target node (optional).
            source_ki_id: The Knowledge Infrastructure ID of the source node (optional).
            target_ki_id: The Knowledge Infrastructure ID of the target node (optional).
            limit: The maximum number of suggestions to return.

        Returns:
            A list of suggested SemanticEdgeType enums, ranked by relevance.
        """
        logger.info(f"Suggesting edge types between source (type={source_type}, ki_id={source_ki_id}) and target (type={target_type}, ki_id={target_ki_id})")
        suggestions_scores: Dict[SemanticEdgeType, float] = defaultdict(float)

        # 1. Heuristics based on Node Types (Always applicable)
        try:
            heuristic_suggestions = self._get_heuristic_edge_suggestions(source_type, target_type)
            for edge_type in heuristic_suggestions:
                # Assign a baseline score for heuristic matches
                suggestions_scores[edge_type] += 0.5 # Base score for type compatibility
            logger.debug(f"Heuristic suggestions based on types ({source_type} -> {target_type}): {heuristic_suggestions}")
        except Exception as e:
            logger.error(f"Error getting heuristic suggestions: {e}", exc_info=True)

        # 2. Knowledge Graph Interactions (Requires KI IDs)
        if source_ki_id and target_ki_id:
            try:
                known_interactions = await self.kg_interface.find_known_interactions(
                    source_ki_id, target_ki_id
                )
                logger.debug(f"Found {len(known_interactions)} known interactions between {source_ki_id} and {target_ki_id}.")
                for interaction in known_interactions:
                    # Assuming interaction is a tuple (relationship_type_str, direction) or similar
                    # Adjust based on actual return type of find_known_interactions
                    interaction_type_str = None
                    if isinstance(interaction, (list, tuple)) and len(interaction) > 0:
                        interaction_type_str = interaction[0]
                    elif isinstance(interaction, dict):
                        interaction_type_str = interaction.get('type') # Example if dict
                    
                    if interaction_type_str:
                        semantic_types = self._map_known_interaction_to_semantic(interaction_type_str)
                        for edge_type in semantic_types:
                            # Increase score significantly for known KG interactions
                            suggestions_scores[edge_type] += 2.0 # Higher weight for direct KG evidence
                            logger.debug(f"KG Interaction '{interaction_type_str}' boosts {edge_type} score.")
                    else:
                         logger.warning(f"Could not determine interaction type from interaction data: {interaction}")

            except AttributeError:
                 logger.error(f"Missing method 'find_known_interactions' on kg_interface object: {type(self.kg_interface)}")
            except Exception as e:
                logger.error(f"Error querying KG for interactions between {source_ki_id} and {target_ki_id}: {e}", exc_info=True)
        else:
            logger.debug("Skipping KG interaction check as one or both ki_ids are missing.")

        # 3. Vector DB Semantic Similarity (Requires KI IDs to fetch context/embeddings)
        # Requires get_node_context and find_similar_nodes (or equivalent) methods
        if source_ki_id and target_ki_id:
            source_context_text = None
            target_context_text = None
            try:
                # Check if kg_interface has get_node_context method
                if hasattr(self.kg_interface, 'get_node_context') and callable(getattr(self.kg_interface, 'get_node_context')):
                     source_node_data = await self.kg_interface.get_node_context(source_ki_id)
                     if source_node_data:
                         source_context_text = self._build_query_text(source_node_data)
                     target_node_data = await self.kg_interface.get_node_context(target_ki_id)
                     if target_node_data:
                         target_context_text = self._build_query_text(target_node_data)
                else:
                     logger.warning("KG Interface does not support 'get_node_context', skipping vector similarity check.")

                # Proceed only if we got context for both and vector interface supports similarity search
                if source_context_text and target_context_text and hasattr(self.vector_interface, 'find_similar_nodes') and callable(getattr(self.vector_interface, 'find_similar_nodes')):
                    logger.debug(f"Attempting vector similarity check between {source_ki_id} and {target_ki_id}.")
                    
                    # Option 1: Check if target is in source's neighbors
                    # This assumes find_similar_nodes can filter or returns enough results to check
                    source_similar_results = await self.vector_interface.find_similar_nodes(
                        query_text=source_context_text,
                        n_results=20, # How many neighbors to check
                        # filter_metadata={'ki_id': target_ki_id} # If direct filtering is supported
                    )
                    
                    similarity_score = 0.0
                    if source_similar_results and source_similar_results.get('ids') and source_similar_results['ids'][0]:
                        neighbor_ids = source_similar_results.get('ids', [[]])[0]
                        distances = source_similar_results.get('distances', [[]])[0]
                        metadatas = source_similar_results.get('metadatas', [[]])[0]
                        
                        for i, neighbor_id in enumerate(neighbor_ids):
                             # Extract ki_id from metadata if available, otherwise assume neighbor_id is ki_id
                             ki_id = metadatas[i].get('ki_id', neighbor_id) if i < len(metadatas) and metadatas[i] else neighbor_id
                             if ki_id == target_ki_id:
                                 distance = distances[i] if i < len(distances) and distances[i] is not None else 1.0
                                 similarity_score = max(0.0, 1.0 - distance) # Assuming distance is 0-1 (e.g., cosine)
                                 logger.debug(f"Target node {target_ki_id} found in source node {source_ki_id}'s vector neighbors with score: {similarity_score:.2f}")
                                 break # Found the target node
                                 
                    if similarity_score > 0.1: # Threshold to consider it significant
                        # Boost scores for edge types related to similarity
                        suggestions_scores[SemanticEdgeType.RESONATES_WITH] += similarity_score * 1.5
                        suggestions_scores[SemanticEdgeType.IS_ANALOGOUS_TO] += similarity_score * 1.0
                        # Consider adding others like ALIGNS_WITH from V2 plan?
                        if SemanticEdgeType.ALIGNS_WITH in SemanticEdgeType.__members__:
                            suggestions_scores[SemanticEdgeType.ALIGNS_WITH] += similarity_score * 1.0
                        logger.debug(f"Vector similarity boosts scores for RESONATES_WITH, IS_ANALOGOUS_TO, ALIGNS_WITH.")

                elif not (hasattr(self.vector_interface, 'find_similar_nodes') and callable(getattr(self.vector_interface, 'find_similar_nodes'))):
                     logger.warning("Vector Interface does not support 'find_similar_nodes', skipping vector similarity check.")
                elif not source_context_text or not target_context_text:
                     logger.debug("Could not retrieve sufficient context for one or both nodes, skipping vector similarity.")
                     
            except AttributeError as ae:
                 logger.error(f"Missing method required for vector similarity check: {ae}")                 
            except Exception as e:
                logger.error(f"Error performing vector similarity check between nodes {source_ki_id} and {target_ki_id}: {e}", exc_info=True)
        else:
             logger.debug("Skipping vector similarity check as one or both ki_ids are missing.")

        # 4. Label Similarity (Optional Fallback / Signal)
        # Example using simple lowercase matching for demonstration
        if source_label and target_label:
            try:
                # Simple exact match (case-insensitive)
                if source_label.lower() == target_label.lower():
                     logger.debug(f"Labels match: '{source_label}'. Boosting identity/analogy scores.")
                     # Boost IS, RESONATES_WITH strongly if types also match
                     if source_type == target_type:
                         if SemanticEdgeType.IS in SemanticEdgeType.__members__:
                             suggestions_scores[SemanticEdgeType.IS] += 1.5 # Strong boost for identical labels/types
                         suggestions_scores[SemanticEdgeType.RESONATES_WITH] += 1.0
                     suggestions_scores[SemanticEdgeType.IS_ANALOGOUS_TO] += 0.5
                # Could add fuzzy matching here using difflib or fuzzywuzzy if needed
                # from difflib import SequenceMatcher
                # label_similarity = SequenceMatcher(None, source_label.lower(), target_label.lower()).ratio()
                # if label_similarity > 0.8: ... boost relevant scores ...
            except Exception as e:
                 logger.warning(f"Could not compare labels: {e}")
        
        # 5. Rank suggestions based on accumulated scores
        # Convert SemanticEdgeType enums to string for consistent sorting if needed, or rely on enum name
        ranked_suggestions = sorted(
            suggestions_scores.items(), 
            key=lambda item: (-item[1], item[0].name) # Sort by score (desc), then alphabetically by name
        )

        final_suggestions = [edge_type for edge_type, score in ranked_suggestions[:limit]]

        # Ensure a generic fallback like RELATED_TO if no suggestions meet criteria or list is empty
        # Check if RELATED_TO exists in the enum first
        related_to_enum = getattr(SemanticEdgeType, 'RELATED_TO', None)
        if not final_suggestions and related_to_enum:
            final_suggestions.append(related_to_enum)
            logger.debug("Adding RELATED_TO as fallback as no other suggestions were generated.")
        elif len(final_suggestions) < limit and related_to_enum and related_to_enum not in final_suggestions and suggestions_scores[related_to_enum] > 0:
             # Add RELATED_TO if it had a score but didn't make the initial cut due to limit
             final_suggestions.append(related_to_enum)
             logger.debug("Adding RELATED_TO as it had score but missed initial limit.")

        # Re-apply limit in case RELATED_TO was added
        final_suggestions = final_suggestions[:limit]

        logger.info(f"Returning {len(final_suggestions)} suggestions: {[s.name for s in final_suggestions]}")
        return final_suggestions

    # Helper method to build query text from node data
    # Ensure this method exists in the class or is added
    def _build_query_text(self, node_data: Optional[NodeData]) -> Optional[str]:
        if not node_data:
            return None
        # Combine relevant text fields for a richer query
        query_text_parts = [node_data.label] # Assume label is always present
        # Check if data attribute exists and is a dict before accessing description
        if hasattr(node_data, 'data') and isinstance(node_data.data, dict) and node_data.data.get('description'):
            query_text_parts.append(node_data.data['description'])
        # Add other relevant fields if available, ensuring they are strings
        # Example: if node_data.data and node_data.data.get('user_notes'):
        #     query_text_parts.append(node_data.data['user_notes'])
        
        # Filter out None values and join non-empty parts
        valid_parts = [part for part in query_text_parts if part]
        if valid_parts:
             return " ".join(valid_parts)
        elif node_data.label: # Fallback to just label if description etc. are missing/empty
            return node_data.label
        return None # Return None if even label is missing

    def _calculate_node_similarity(self, source_results: List[Dict[str, Any]], 
                                target_results: List[Dict[str, Any]]) -> float:
        """Calculates semantic similarity between nodes based on their vector neighbors.
        
        Args:
            source_results: Vector search results for source node
            target_results: Vector search results for target node
            
        Returns:
            float: A similarity score between 0 and 1
        """
        # If either result list is empty, return low similarity
        if not source_results or not target_results:
            return 0.3  # Default medium-low similarity
            
        # Method 1: Check for overlap in similar concepts
        source_ids = {result['ki_id'] for result in source_results}
        target_ids = {result['ki_id'] for result in target_results}
        
        overlap = source_ids.intersection(target_ids)
        overlap_score = len(overlap) / min(len(source_ids), len(target_ids)) if min(len(source_ids), len(target_ids)) > 0 else 0
        
        # Method 2: Compare average similarities of results
        source_avg_sim = sum(result.get('similarity', 0) for result in source_results) / len(source_results) if source_results else 0
        target_avg_sim = sum(result.get('similarity', 0) for result in target_results) / len(target_results) if target_results else 0
        
        similarity_diff = 1.0 - abs(source_avg_sim - target_avg_sim)
        
        # Combine methods with weights (adjust weights as needed)
        combined_score = (overlap_score * 0.7) + (similarity_diff * 0.3)
        
        # Ensure result is between 0 and 1
        return max(0.0, min(1.0, combined_score))


# Example usage (requires setting up mock interfaces or running services)
if __name__ == '__main__':
    # This block requires mock implementations or running instances of KG and VectorDB
    # For demonstration purposes, we assume they exist and can be instantiated.

    logging.basicConfig(level=logging.INFO)
    logger.info("Running SuggestionService example usage (requires Mocks or Live Services)...")

    # --- Mock Interfaces (Replace with actual instances) ---
    class MockKGInterface:
        def find_related_nodes(self, node_ki_id, limit):
            logger.info(f"[MockKG] Finding related for {node_ki_id}")
            # Simulate finding nodes, ensure ki_id is populated
            return [
                NodeData(id="rel1", ki_id="rel1", type=NodeType.CONCEPT, label="Related Concept 1", data={}),
                NodeData(id="rel2", ki_id="rel2", type=NodeType.THINKER, label="Related Thinker", data={}),
            ]
        def get_node_context(self, node_ki_id):
             logger.info(f"[MockKG] Getting context for {node_ki_id}")
             if node_ki_id == "focus1":
                 return NodeData(id=node_ki_id, ki_id=node_ki_id, type=NodeType.CONCEPT, label="Focus Concept", data={"description": "Some focus node"})
             return None
        def get_nodes_by_ids(self, node_ids):
            logger.info(f"[MockKG] Getting nodes by IDs: {node_ids}")
            nodes = []
            if "sem1" in node_ids:
                 nodes.append(NodeData(id="sem1", ki_id="sem1", type=NodeType.CONCEPT, label="Semantic Result 1", data={}))
            if "sem2" in node_ids:
                 nodes.append(NodeData(id="sem2", ki_id="sem2", type=NodeType.WORK, label="Semantic Work", data={}))
            return nodes
        async def find_known_interactions(self, id1, id2):
             logger.info(f"[MockKG] Finding interactions between {id1} and {id2}")
             if {id1, id2} == {"nodeA", "nodeB"}:
                  return [{'type': RelationshipType.INFLUENCED_BY.value, 'properties': {}}]
             return []

    class MockVectorDB:
        def find_similar(self, query_text, n_results, filter_metadata=None):
            logger.info(f"[MockVector] Finding similar for: {query_text[:30]}...")
            # Simulate finding nodes, return ki_id in metadata
            return {
                'ids': [['sem1', 'sem2', 'rel1']], # 'rel1' might overlap with KG results
                'distances': [[0.1, 0.3, 0.5]],
                'metadatas': [[{'ki_id': 'sem1', 'name': 'Semantic Result 1'}, {'ki_id': 'sem2', 'name': 'Semantic Work'}, {'ki_id': 'rel1', 'name': 'Related Concept 1'}]]
            }
    # --- End Mock Interfaces ---

    try:
        mock_kg = MockKGInterface()
        mock_vector = MockVectorDB()
        suggestion_service = SuggestionService(mock_kg, mock_vector)

        # --- Example 1: Suggest Related Nodes ---
        print("\n--- Example 1: Suggest Related Nodes ---")
        focus_id = "focus1"
        canvas_ids = {"existing1", "rel2"} # 'rel2' is a structural neighbor, should be excluded
        related_nodes = suggestion_service.suggest_related_nodes(focus_id, canvas_ids, limit=3)
        print(f"Suggested nodes for {focus_id} (excluding {canvas_ids}):")
        for node in related_nodes:
            print(f"- {node.label} (ID: {node.ki_id}, Type: {node.type.value})")
        # Expected: Should see 'Related Concept 1' (from KG/Vect), 'Semantic Result 1', 'Semantic Work', ranked. 'rel2' excluded.

        # --- Example 2: Suggest Edge Types (Heuristics only) ---
        print("\n--- Example 2: Suggest Edge Types (Heuristics) ---")
        source_type = NodeType.THINKER
        target_type = NodeType.CONCEPT
        edge_types_heuristic = suggestion_service.suggest_edge_types(source_type, target_type, limit=3)
        print(f"Suggested edge types for {source_type.value} -> {target_type.value}:")
        for edge_type in edge_types_heuristic:
            print(f"- {edge_type.value}")

        # --- Example 3: Suggest Edge Types (With Known Interactions) ---
        print("\n--- Example 3: Suggest Edge Types (Known Interaction) ---")
        source_id = "nodeA" # Assume NodeType.THINKER
        target_id = "nodeB" # Assume NodeType.THINKER
        edge_types_known = suggestion_service.suggest_edge_types(
            NodeType.THINKER, NodeType.THINKER, source_id, target_id, limit=4
        )
        print(f"Suggested edge types for {source_id} -> {target_id} (Known INFLUENCED_BY):")
        for edge_type in edge_types_known:
            print(f"- {edge_type.value}")
        # Expected: INFLUENCES/DERIVES_FROM (from mapping INFLUENCED_BY) likely ranked high, followed by THINKER->THINKER heuristics.

    except Exception as e:
        logger.error(f"An error occurred during example execution: {e}", exc_info=True)
        print(f"\nAn error occurred: {e}") 