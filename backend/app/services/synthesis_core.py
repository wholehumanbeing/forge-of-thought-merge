from datetime import datetime
from typing import Optional, List, Dict, Set, Tuple, Any, TypedDict
from collections import Counter, defaultdict
import logging
from fastapi import HTTPException, status
import uuid

from app.models.data_models import (
    LineageReport, NodeData, EdgeData, GraphStructure, SynthesisOutput
)
from app.models.ki_ontology import NodeType, SemanticEdgeType, RelationshipType
from app.services.lineage_mapper import LineageMapper
from app.db.knowledge_graph_interface import KnowledgeGraphInterface, Neo4jKnowledgeGraph
from app.db.vector_db_interface import ChromaVectorDB
# Import the actual LLM client
from app.core.llm_client import LLMClient

logger = logging.getLogger(__name__)

# --- Internal Data Structures ---

class GraphAnalysis(TypedDict):
    """Structure for holding the results of graph analysis."""
    node_count: int
    edge_count: int
    node_types: Dict[NodeType, int]
    edge_types: Dict[SemanticEdgeType, int]
    central_nodes: List[Tuple[str, int]] # List of (node_ki_id, degree)
    key_semantic_edges: List[EdgeData]
    inferred_intent: str # e.g., 'dialectical', 'framework', 'comparison', 'exploration'
    graph_patterns: List[Dict[str, Any]]  # Detected patterns in the graph
    node_communities: List[List[str]]     # Communities or clusters of related nodes
    tension_edges: List[EdgeData]         # Edges that represent tension or contradiction
    synthesis_edges: List[EdgeData]       # Edges that represent synthesis
    analogy_edges: List[EdgeData]         # Edges that represent analogy or metaphor

class KIQueryPlan(TypedDict):
    """Structure for holding the planned KI queries."""
    kg_context_nodes: List[str] # ki_ids of nodes to fetch context for
    kg_interaction_checks: List[Tuple[str, str]] # Pairs of (source_ki_id, target_ki_id) to check
    vector_similarity_nodes: List[str] # ki_ids of nodes to run similarity search around
    vector_analogy_edges: List[EdgeData] # Edges triggering analogy search
    kg_lineage_traces: List[str]  # ki_ids to trace lineage/influence paths
    vector_queries: List[Dict[str, Any]]  # Structured vector queries with parameters

class KIContext(TypedDict):
    """Structure for holding the results from KI queries."""
    kg_node_contexts: Dict[str, Optional[Dict]] # {node_ki_id: context_dict}
    kg_interactions: Dict[Tuple[str, str], List[Any]] # {(id1, id2): interaction_results}
    vector_similarities: Dict[str, List[Any]] # {node_ki_id: similarity_results}
    vector_analogies: Dict[Tuple[str, str], List[Any]] # {(source_ki_id, target_ki_id): analogy_results}
    kg_lineage_paths: Dict[str, List[Any]]  # Lineage paths for key nodes

# --- Synthesis Core Service ---

class SynthesisCore:
    """
    Orchestrates the knowledge synthesis process by analyzing input graphs,
    querying knowledge infrastructure, interacting with LLMs, and generating output.
    """

    def __init__(self, kg_interface: Neo4jKnowledgeGraph, vector_interface: Optional[ChromaVectorDB], llm_client: LLMClient):
        """
        Initializes the SynthesisCore service.

        Args:
            kg_interface: An instance of the Neo4jKnowledgeGraph interface.
            vector_interface: An optional instance of the ChromaVectorDB interface. (TEMPORARILY OPTIONAL)
            llm_client: An instance of the LLMClient.
        """
        if not kg_interface:
            raise ValueError("KnowledgeGraphInterface instance is required.")
        # Temporarily remove this check to allow None
        # if not vector_interface:
        #     raise ValueError("VectorDBInterface instance is required.") 
        if not llm_client:
            raise ValueError("LLMClient instance is required.")

        self.kg_interface = kg_interface
        self.vector_interface = vector_interface # Can now be None
        self.llm_client = llm_client
        if self.vector_interface:
            logger.info("SynthesisCore initialized with KG, VectorDB, and LLMClient.")
        else:
             logger.warning("SynthesisCore initialized with KG and LLMClient. VectorDB is disabled (temporary bypass)." )

    def _analyze_graph(self, graph: GraphStructure) -> GraphAnalysis:
        """
        Analyzes the input graph structure to understand its characteristics and infer user intent.

        Args:
            graph: The input graph structure from the user canvas.

        Returns:
            A dictionary summarizing the graph analysis.
        """
        logger.debug(f"Analyzing graph with {len(graph.nodes)} nodes and {len(graph.edges)} edges.")
        node_count = len(graph.nodes)
        edge_count = len(graph.edges)
        node_types: Counter[NodeType] = Counter()
        edge_types: Counter[SemanticEdgeType] = Counter()
        node_degrees: Dict[str, int] = defaultdict(int) # Using node.id from GraphStructure input
        
        # Enhanced analysis collections
        key_semantic_edges: List[EdgeData] = []
        tension_edges: List[EdgeData] = []
        synthesis_edges: List[EdgeData] = []
        analogy_edges: List[EdgeData] = []
        graph_patterns: List[Dict[str, Any]] = []

        # Prioritized edge types for analysis and intent inference
        TENSION_EDGE_TYPES = {
            SemanticEdgeType.CONTRADICTS_CLAIM, SemanticEdgeType.OPPOSES, 
            SemanticEdgeType.REFUTES, SemanticEdgeType.GENERATES_PARADOX_FROM, 
            SemanticEdgeType.CHALLENGES_PREMISE_OF
        }
        
        SYNTHESIS_EDGE_TYPES = {
            SemanticEdgeType.SYNTHESIZES_WITH, SemanticEdgeType.RESOLVES_TENSION_BETWEEN,
            SemanticEdgeType.RESONATES_WITH
        }
        
        ANALOGY_EDGE_TYPES = {
            SemanticEdgeType.IS_METAPHOR_FOR, SemanticEdgeType.IS_ANALOGOUS_TO,
            SemanticEdgeType.SYMBOLIZES
        }
        
        FRAMEWORK_EDGE_TYPES = {
            SemanticEdgeType.IS_COMPONENT_OF, SemanticEdgeType.IS_AXIOM_FOR,
            SemanticEdgeType.DERIVES_FROM
        }
        
        CAUSAL_EDGE_TYPES = {
            SemanticEdgeType.ENABLES, SemanticEdgeType.CAUSES, 
            SemanticEdgeType.INFLUENCES, SemanticEdgeType.AMPLIFIES
        }

        # Combined prioritized edge types
        PRIORITY_EDGE_TYPES = set().union(
            TENSION_EDGE_TYPES, SYNTHESIS_EDGE_TYPES, ANALOGY_EDGE_TYPES,
            FRAMEWORK_EDGE_TYPES, CAUSAL_EDGE_TYPES
        )

        # Build a node map for easy lookup
        node_id_map: Dict[str, NodeData] = {node.id: node for node in graph.nodes}
        
        # Count node types
        for node in graph.nodes:
            node_types[node.type] += 1
            # Ensure all nodes start with degree 0 in the dictionary
            node_degrees[node.id] = node_degrees.get(node.id, 0)

        # Create an adjacency list for pattern detection
        adjacency_list: Dict[str, List[Tuple[str, SemanticEdgeType]]] = defaultdict(list)
        
        # Process edges
        for edge in graph.edges:
            edge_types[edge.semantic_type] += 1
            
            # Add to adjacency list for pattern detection
            adjacency_list[edge.source].append((edge.target, edge.semantic_type))
            
            # Categorize edges
            if edge.semantic_type in PRIORITY_EDGE_TYPES:
                key_semantic_edges.append(edge)
                
                # Categorize by relationship type
                if edge.semantic_type in TENSION_EDGE_TYPES:
                    tension_edges.append(edge)
                elif edge.semantic_type in SYNTHESIS_EDGE_TYPES:
                    synthesis_edges.append(edge)
                elif edge.semantic_type in ANALOGY_EDGE_TYPES:
                    analogy_edges.append(edge)

            # Calculate degree (undirected for now)
            if edge.source in node_degrees:
                 node_degrees[edge.source] += 1
            if edge.target in node_degrees:
                 node_degrees[edge.target] += 1

        # Detect simple graph patterns
        self._detect_graph_patterns(graph, adjacency_list, graph_patterns)
        
        # Attempt to identify communities or clusters
        node_communities = self._identify_communities(graph, adjacency_list)

        # Identify central nodes (top 3 by degree, or fewer if < 3 nodes)
        central_nodes_sorted = sorted(node_degrees.items(), key=lambda item: item[1], reverse=True)
        top_n = min(3, node_count)
        # Map back to ki_id if available, otherwise use the graph node id
        central_nodes_analysis: List[Tuple[str, int]] = []
        for node_id, degree in central_nodes_sorted[:top_n]:
             node_data = node_id_map.get(node_id)
             # Prefer ki_id if available, otherwise use the frontend/canvas ID
             identifier = node_data.ki_id if node_data and node_data.ki_id else node_id
             central_nodes_analysis.append((identifier, degree))

        # Infer primary intent (simple heuristics based on dominant *priority* edge types)
        inferred_intent = "exploration" # Default
        
        # Count edge types by category
        category_counts = {
            "dialectical_synthesis": sum(1 for e in tension_edges),
            "integrative_synthesis": sum(1 for e in synthesis_edges),
            "analogical_reasoning": sum(1 for e in analogy_edges),
            "framework_building": sum(edge_types.get(t, 0) for t in FRAMEWORK_EDGE_TYPES),
            "causal_analysis": sum(edge_types.get(t, 0) for t in CAUSAL_EDGE_TYPES)
        }
        
        # Determine the dominant intent
        if any(category_counts.values()):
            inferred_intent, _ = max(category_counts.items(), key=lambda item: item[1])
        
        # Process graph patterns into the analysis
        graph_pattern_summary = []
        for pattern in graph_patterns:
            graph_pattern_summary.append({
                "type": pattern["type"],
                "nodes": [node_id_map[node_id].label for node_id in pattern["nodes"] if node_id in node_id_map],
                "description": pattern.get("description", "")
            })

        analysis: GraphAnalysis = {
            "node_count": node_count,
            "edge_count": edge_count,
            "node_types": dict(node_types),
            "edge_types": dict(edge_types),
            "central_nodes": central_nodes_analysis,
            "key_semantic_edges": key_semantic_edges,
            "inferred_intent": inferred_intent,
            "graph_patterns": graph_pattern_summary,
            "node_communities": node_communities,
            "tension_edges": tension_edges,
            "synthesis_edges": synthesis_edges,
            "analogy_edges": analogy_edges,
        }
        
        logger.info(f"Graph analysis complete. Inferred intent: {inferred_intent}. Central nodes: {central_nodes_analysis}")
        return analysis

    def _detect_graph_patterns(self, graph: GraphStructure, adjacency_list: Dict[str, List[Tuple[str, SemanticEdgeType]]], patterns: List[Dict[str, Any]]):
        """
        Detects common patterns in the graph structure.
        
        Args:
            graph: The input graph structure
            adjacency_list: Adjacency list representation of the graph
            patterns: List where detected patterns will be appended
        """
        # Check for chains (A -> B -> C)
        self._detect_chains(graph, adjacency_list, patterns)
        
        # Check for dialectical pairs (A <-> B with tension edge)
        self._detect_dialectical_pairs(graph, adjacency_list, patterns)
        
        # Check for synthesis triangles (A, B -> C with synthesis edge)
        self._detect_synthesis_triangles(graph, adjacency_list, patterns)
        
        # Check for star patterns (central node with many connections)
        self._detect_star_patterns(graph, adjacency_list, patterns)

    def _detect_chains(self, graph: GraphStructure, adjacency_list: Dict[str, List[Tuple[str, SemanticEdgeType]]], patterns: List[Dict[str, Any]]):
        """Detects linear chains in the graph (A -> B -> C)"""
        # Build a set of edges for quick lookup
        edge_set = {(e.source, e.target, e.semantic_type) for e in graph.edges}
        
        # Find chains of length 3 (can be extended for longer chains)
        for node_a in adjacency_list:
            for node_b, type_ab in adjacency_list.get(node_a, []):
                for node_c, type_bc in adjacency_list.get(node_b, []):
                    # Ensure it's not a cycle
                    if node_c != node_a and (node_c, node_a, type_bc) not in edge_set:
                        patterns.append({
                            "type": "chain",
                            "nodes": [node_a, node_b, node_c],
                            "description": f"Chain: {node_a} --({type_ab.value})--> {node_b} --({type_bc.value})--> {node_c}"
                        })

    def _detect_dialectical_pairs(self, graph: GraphStructure, adjacency_list: Dict[str, List[Tuple[str, SemanticEdgeType]]], patterns: List[Dict[str, Any]]):
        """Detects dialectical pairs (nodes with tension edges between them)"""
        # Get tension edge types
        tension_types = {
            SemanticEdgeType.CONTRADICTS_CLAIM, SemanticEdgeType.OPPOSES, 
            SemanticEdgeType.REFUTES, SemanticEdgeType.CHALLENGES_PREMISE_OF
        }
        
        # Look for tension edges
        for edge in graph.edges:
            if edge.semantic_type in tension_types:
                patterns.append({
                    "type": "dialectical_pair",
                    "nodes": [edge.source, edge.target],
                    "description": f"Dialectical Pair: {edge.source} --({edge.semantic_type.value})--> {edge.target}"
                })

    def _detect_synthesis_triangles(self, graph: GraphStructure, adjacency_list: Dict[str, List[Tuple[str, SemanticEdgeType]]], patterns: List[Dict[str, Any]]):
        """Detects synthesis triangles where two nodes connect to a third with synthesis edges"""
        synthesis_types = {
            SemanticEdgeType.SYNTHESIZES_WITH, 
            SemanticEdgeType.RESOLVES_TENSION_BETWEEN
        }
        
        # Track target nodes that have synthesis edges pointing to them
        synthesis_targets = defaultdict(list)
        
        for edge in graph.edges:
            if edge.semantic_type in synthesis_types:
                synthesis_targets[edge.target].append(edge.source)
        
        # Find targets with multiple sources (synthesis triangles)
        for target, sources in synthesis_targets.items():
            if len(sources) >= 2:
                patterns.append({
                    "type": "synthesis_triangle",
                    "nodes": sources + [target],
                    "description": f"Synthesis Triangle: {', '.join(sources)} both connect to {target} via synthesis"
                })

    def _detect_star_patterns(self, graph: GraphStructure, adjacency_list: Dict[str, List[Tuple[str, SemanticEdgeType]]], patterns: List[Dict[str, Any]]):
        """Detects star patterns (central node with many connections)"""
        # Calculate in and out degrees
        in_degree = defaultdict(int)
        out_degree = defaultdict(int)
        
        for edge in graph.edges:
            out_degree[edge.source] += 1
            in_degree[edge.target] += 1
        
        # Look for nodes with high total degree (in + out)
        for node in graph.nodes:
            total_degree = in_degree[node.id] + out_degree[node.id]
            if total_degree >= 3:  # Threshold for being a "star"
                connected_nodes = []
                # Get incoming connections
                for edge in graph.edges:
                    if edge.target == node.id:
                        connected_nodes.append(edge.source)
                    elif edge.source == node.id:
                        connected_nodes.append(edge.target)
                
                patterns.append({
                    "type": "star_pattern",
                    "nodes": [node.id] + connected_nodes,
                    "description": f"Star Pattern: {node.id} is connected to {len(connected_nodes)} other nodes"
                })

    def _identify_communities(self, graph: GraphStructure, adjacency_list: Dict[str, List[Tuple[str, SemanticEdgeType]]]) -> List[List[str]]:
        """
        Simple community detection using a basic clustering approach.
        Returns a list of node communities.
        """
        # This is a simplified approach - in a real implementation, you might use a more
        # sophisticated algorithm like Louvain or label propagation
        
        # Start with each node in its own community
        communities = [[node.id] for node in graph.nodes]
        
        # Simple approach: merge communities that share edges
        merged = True
        while merged and len(communities) > 1:
            merged = False
            for i in range(len(communities)):
                if i >= len(communities):
                    break
                    
                for j in range(i+1, len(communities)):
                    if j >= len(communities):
                        break
                        
                    # Check if communities i and j share an edge
                    for edge in graph.edges:
                        if ((edge.source in communities[i] and edge.target in communities[j]) or
                            (edge.source in communities[j] and edge.target in communities[i])):
                            # Merge j into i
                            communities[i].extend(communities[j])
                            communities.pop(j)
                            merged = True
                            break
                    
                    if merged:
                        break
                
                if merged:
                    break
        
        return communities

    def _plan_ki_queries(self, graph: GraphStructure, analysis: GraphAnalysis) -> KIQueryPlan:
        """
        Plans the necessary Knowledge Graph and Vector DB queries based on the graph analysis.

        Args:
            graph: The input graph structure.
            analysis: The results from the _analyze_graph method.

        Returns:
            A dictionary outlining the specific queries to execute.
        """
        logger.debug("Planning KI queries based on graph analysis.")
        query_plan: KIQueryPlan = {
            "kg_context_nodes": [],
            "kg_interaction_checks": [],
            "vector_similarity_nodes": [],
            "vector_analogy_edges": [],
            "kg_lineage_traces": [],
            "vector_queries": []
        }

        node_map: Dict[str, NodeData] = {node.id: node for node in graph.nodes}

        # 1. IDENTIFY NODES NEEDING CONTEXT
        # Start with central nodes
        nodes_for_context_ids = {ki_id for ki_id, degree in analysis["central_nodes"]}
        
        # Add nodes involved in key edges
        for edge in analysis["key_semantic_edges"]:
            source_node = node_map.get(edge.source)
            target_node = node_map.get(edge.target)
            if source_node:
                nodes_for_context_ids.add(source_node.ki_id if source_node.ki_id else source_node.id)
            if target_node:
                nodes_for_context_ids.add(target_node.ki_id if target_node.ki_id else target_node.id)

        # Filter out non-ki_ids before adding to plan (using a more robust check)
        query_plan["kg_context_nodes"] = [id_val for id_val in nodes_for_context_ids 
                                         if id_val and (":" in id_val or id_val.startswith("ki-"))]

        # 2. PLAN INTERACTION CHECKS
        # Start with key tension edges - for dialectical synthesis
        for edge in analysis["tension_edges"]:
            source_node = node_map.get(edge.source)
            target_node = node_map.get(edge.target)
            # Only check interactions if both nodes have KI IDs
            if source_node and target_node and source_node.ki_id and target_node.ki_id:
                query_plan["kg_interaction_checks"].append((source_node.ki_id, target_node.ki_id))
        
        # Also check synthesis edges - to find existing synthesis patterns
        for edge in analysis["synthesis_edges"]:
            source_node = node_map.get(edge.source)
            target_node = node_map.get(edge.target)
            if source_node and target_node and source_node.ki_id and target_node.ki_id:
                query_plan["kg_interaction_checks"].append((source_node.ki_id, target_node.ki_id))

        # 3. PLAN VECTOR SIMILARITY SEARCHES
        # Use central nodes for similarity search, filtering for ki_ids
        central_node_ki_ids = [ki_id for ki_id, degree in analysis["central_nodes"] 
                              if ki_id and (":" in ki_id or ki_id.startswith("ki-"))]
        query_plan["vector_similarity_nodes"] = central_node_ki_ids
        
        # Add more sophisticated vector queries based on intent
        intent = analysis["inferred_intent"]
        
        # For integrative synthesis, add similarity search for nodes in synthesis edges
        if intent == "integrative_synthesis":
            for edge in analysis["synthesis_edges"]:
                source_node = node_map.get(edge.source)
                target_node = node_map.get(edge.target)
                
                if source_node and source_node.ki_id:
                    query_text = source_node.label or source_node.ki_id
                    query_plan["vector_queries"].append({
                        "method": "find_similar",
                        "args": {
                            "query_text": query_text,
                            "n_results": 5,
                            "filters": {"type": "CONCEPT"}  # Filter for concepts that could bridge these
                        }
                    })
        
        # For dialectical synthesis, look for potential resolutions
        elif intent == "dialectical_synthesis":
            for edge in analysis["tension_edges"]:
                source_node = node_map.get(edge.source)
                target_node = node_map.get(edge.target)
                
                if source_node and target_node:
                    combined_query = f"{source_node.label} {edge.semantic_type.value} {target_node.label}"
                    query_plan["vector_queries"].append({
                        "method": "find_similar",
                        "args": {
                            "query_text": combined_query,
                            "n_results": 3,
                            "filters": {"type": "CONCEPT"}
                        }
                    })

        # 4. PLAN ANALOGY SEARCHES
        for edge in analysis["analogy_edges"]:
            source_node = node_map.get(edge.source)
            target_node = node_map.get(edge.target)
            
            if source_node and target_node:
                # Add to analogy edges if either has a ki_id (we'll handle the complexity in execution)
                if source_node.ki_id or target_node.ki_id:
                    query_plan["vector_analogy_edges"].append(edge)
                
                # Additionally, plan a domain-specific search query
                if target_node.type:  # If we know the target domain
                    query_plan["vector_queries"].append({
                        "method": "find_analogies",
                        "args": {
                            "source_query": source_node.label,
                            "target_domain": target_node.type.value,
                            "n_results": 3
                        }
                    })

        # 5. PLAN LINEAGE TRACES
        # For derivation edges and historical exploration
        derivation_edge_types = {
            SemanticEdgeType.DERIVES_FROM,
            SemanticEdgeType.IS_COMPONENT_OF
        }
        
        for edge in analysis["key_semantic_edges"]:
            if edge.semantic_type in derivation_edge_types:
                source_node = node_map.get(edge.source)
                if source_node and source_node.ki_id:
                    query_plan["kg_lineage_traces"].append(source_node.ki_id)

        logger.info(f"KI Query plan generated: "
                    f"{len(query_plan['kg_context_nodes'])} context nodes, "
                    f"{len(query_plan['kg_interaction_checks'])} interaction checks, "
                    f"{len(query_plan['vector_similarity_nodes'])} similarity searches, "
                    f"{len(query_plan['vector_analogy_edges'])} analogy searches, "
                    f"{len(query_plan['kg_lineage_traces'])} lineage traces.")
        return query_plan

    async def _execute_ki_queries(self, query_plan: KIQueryPlan) -> KIContext:
        """
        Executes the planned Knowledge Infrastructure (KI) queries asynchronously.
        Handles cases where the vector_interface might be None.

        Args:
            query_plan: The plan outlining which queries to run.

        Returns:
            A dictionary containing the results from the KI queries.
        """
        logger.info("Executing KI queries based on the query plan")
        ki_context: KIContext = {
            "kg_node_contexts": {},
            "kg_interactions": {},
            "vector_similarities": {},
            "vector_analogies": {},
            "kg_lineage_paths": {}
        }

        # 1. Fetch KG Node Contexts
        for ki_id in query_plan.get("kg_context_nodes", []):
            try:
                logger.debug(f"Fetching KG context for node with ki_id: {ki_id}")
                node_context = await self.kg_interface.get_node_context(ki_id)
                if node_context:
                    ki_context["kg_node_contexts"][ki_id] = node_context
                else:
                    logger.warning(f"No context found for node with ki_id: {ki_id}")
            except Exception as e:
                logger.error(f"Error fetching context for node {ki_id}: {str(e)}")
        
        # 2. Check KG Interactions
        for interaction_check in query_plan.get("kg_interaction_checks", []):
            try:
                source_ki_id = interaction_check[0]
                target_ki_id = interaction_check[1]
                logger.debug(f"Checking KG interactions between {source_ki_id} and {target_ki_id}")
                interactions = await self.kg_interface.find_known_interactions(source_ki_id, target_ki_id)
                if interactions:
                    ki_context["kg_interactions"][(source_ki_id, target_ki_id)] = interactions
            except Exception as e:
                logger.error(f"Error checking interactions between {interaction_check[0]} and {interaction_check[1]}: {str(e)}")
        
        # 3. Find Vector Similarities
        if self.vector_interface:
            logger.debug("Vector interface is available. Proceeding with vector queries.")
            for node_ki_id in query_plan.get("vector_similarity_nodes", []):
                try:
                    # Get node context if not already fetched
                    node_context = ki_context["kg_node_contexts"].get(node_ki_id)
                    if not node_context:
                        try:
                            # Fetch context if missing (needed for query text)
                            node_context = await self.kg_interface.get_node_context(node_ki_id)
                            if node_context:
                                ki_context["kg_node_contexts"][node_ki_id] = node_context
                        except Exception as e:
                            logger.error(f"Error fetching context for similarity node {node_ki_id}: {str(e)}")
                            continue # Skip similarity if context fails
                    
                    # Build query text from node context
                    query_text = self._build_query_text(node_ki_id, node_context)
                    if not query_text:
                        logger.warning(f"Could not build query text for node {node_ki_id}, skipping similarity search.")
                        continue
                        
                    logger.debug(f"Finding similar concepts to: {query_text[:50]}...")
                    
                    # Fetch similar concepts (check if vector_interface exists again, though covered by outer check)
                    # if self.vector_interface: # Redundant check, kept for clarity?
                    similar_concepts = self.vector_interface.find_similar_concepts(query_text, k=5)
                    if similar_concepts:
                        ki_context["vector_similarities"][node_ki_id] = similar_concepts
                except Exception as e:
                    logger.error(f"Error finding vector similarities for node {node_ki_id}: {str(e)}", exc_info=True)
            
            # 4. Find Vector Analogies
            for edge in query_plan.get("vector_analogy_edges", []):
                try:
                    source_id = edge.source
                    target_id = edge.target
                    logger.debug(f"Finding analogies for edge from {source_id} to {target_id}")
                    
                    # Get node contexts if needed
                    source_context = ki_context["kg_node_contexts"].get(source_id) # May need ki_id lookup
                    target_context = ki_context["kg_node_contexts"].get(target_id)
                    # TODO: Ensure source_id/target_id are mapped to ki_ids if needed for context lookup

                    # Build query texts
                    source_text = self._build_query_text(source_id, source_context) # Assumes build_query_text can handle graph ID if context missing
                    target_text = self._build_query_text(target_id, target_context)
                    
                    # Check if query texts are valid
                    if not source_text or not target_text:
                        logger.warning(f"Cannot build query text for analogy edge {source_id} -> {target_id}, skipping.")
                        continue

                    # Use find_similar as proxy
                    analogy_query = f"{source_text} {edge.semantic_type.value if hasattr(edge.semantic_type, 'value') else edge.semantic_type} {target_text}"
                    logger.debug(f"Vector Analogy Query (using find_similar): {analogy_query[:100]}...")
                    
                    # if self.vector_interface:
                    analogies = self.vector_interface.find_similar_concepts(
                        analogy_query,
                        k=3
                    )
                    
                    if analogies:
                        # Use graph IDs as key for now, maybe map to ki_ids later
                        ki_context["vector_analogies"][(source_id, target_id)] = analogies
                except Exception as e:
                    logger.error(f"Error finding analogies for edge {edge.source} -> {edge.target}: {str(e)}", exc_info=True)
            
            # 6. Execute custom vector queries
            for vector_query in query_plan.get("vector_queries", []):
                try:
                    method_name = vector_query.get("method")
                    args = vector_query.get("args", {})
                    
                    if not method_name:
                        logger.error(f"Skipping vector query due to missing 'method': {vector_query}")
                        continue
                        
                    # if self.vector_interface and hasattr(self.vector_interface, method_name):
                    if hasattr(self.vector_interface, method_name):
                        method = getattr(self.vector_interface, method_name)
                        logger.debug(f"Executing custom vector query: {method_name} with args {args}")
                        result = method(**args)
                        
                        if result:
                            # Store result (keying might need refinement)
                            result_key = f"custom_{method_name}_{len(ki_context['vector_similarities']) + len(ki_context['vector_analogies'])}"
                            # Store under a generic custom key or categorize based on method?
                            # For now, adding to similarities if it resembles that structure
                            if isinstance(result, list): # Simple check if it looks like similarity results
                                ki_context["vector_similarities"][result_key] = result
                            else:
                                logger.warning(f"Custom vector query result format not handled: {result}")
                                # Potentially add a dedicated 'custom_results' section
                    else:
                        logger.error(f"Vector interface has no method named '{method_name}' (or interface is None). Skipping query.")
                except Exception as e:
                    logger.error(f"Error executing custom vector query {vector_query.get('method')}: {str(e)}", exc_info=True)
        else:
            logger.warning("Vector interface is None (temporary bypass). Skipping all vector database queries.")

        # 5. Execute KG Lineage Traces
        for node_ki_id in query_plan.get("kg_lineage_traces", []):
            try:
                logger.debug(f"Tracing lineage for node {node_ki_id}")
                # For compatibility with trace_influence_paths, assuming it needs relationship types
                # Adjust based on actual implementation
                influence_rels = [RelationshipType.INFLUENCED_BY, RelationshipType.DERIVED_FROM]
                lineage_paths = self.kg_interface.trace_influence_paths(node_ki_id, influence_rels, max_depth=3)
                if lineage_paths:
                    ki_context["kg_lineage_paths"][node_ki_id] = lineage_paths
            except Exception as e:
                logger.error(f"Error tracing lineage for node {node_ki_id}: {str(e)}")
        
        logger.info(f"KI query execution completed with: "
                  f"{len(ki_context['kg_node_contexts'])} node contexts, "
                  f"{len(ki_context['kg_interactions'])} interactions, "
                  f"{len(ki_context['vector_similarities'])} similarity results, "
                  f"{len(ki_context['vector_analogies'])} analogies, "
                  f"{len(ki_context['kg_lineage_paths'])} lineage traces")
        
        return ki_context
    
    def _build_query_text(self, node_id: str, node_context) -> str:
        """
        Build a query text from node context for vector searches.
        
        Args:
            node_id: The ID of the node
            node_context: The node context from the knowledge graph
            
        Returns:
            A string query text
        """
        text_parts = []
        
        if not node_context:
            return node_id
            
        # Add summary if available
        if hasattr(node_context, "summary") and node_context.summary:
            text_parts.append(node_context.summary)
            
        # Add node label/name if available from related nodes
        for related_node in getattr(node_context, "relatedNodes", []):
            if hasattr(related_node, "label") and related_node.label:
                text_parts.append(related_node.label)
                
        # Default to node_id if no text found
        if not text_parts:
            text_parts.append(node_id)
            
        return " ".join(text_parts)

    def _construct_llm_prompt(self, graph: GraphStructure, analysis: GraphAnalysis, ki_context: KIContext) -> str:
        """
        Constructs a detailed prompt for the LLM based on the graph, analysis, and KI context.
        Includes specific directives based on the semantic types of the edges in the graph.

        Args:
            graph: The original graph structure
            analysis: The graph analysis results
            ki_context: The knowledge interface context results

        Returns:
            A well-formatted prompt string for the LLM
        """
        logger.info("Constructing LLM prompt from graph analysis and KI context")

        # Initialize sections of the prompt
        sections = []

        # 1. Role Definition
        role_definition = (
            "You are an epistemic alchemist, an expert in synthesizing knowledge and generating novel insights. "
            "Your task is to create a meaningful synthesis based on the graph structure and knowledge context provided below. "
            "You excel at identifying patterns, resolving tensions, and generating creative connections between concepts."
        )
        sections.append(role_definition)

        # 2. Input Graph Summary
        node_map = {node.id: node for node in graph.nodes}

        input_summary = ["## INPUT GRAPH STRUCTURE", "### Nodes:"]
        for node in graph.nodes:
            node_type = node.type.value if hasattr(node.type, 'value') else str(node.type)
            input_summary.append(f"- {node.label} (ID: {node.id}, Type: {node_type})")
            # Access description via node.data dictionary
            node_description = node.data.get('description') if hasattr(node, 'data') else None
            if node_description:
                input_summary.append(f"  Description: {node_description[:150]}...")

        input_summary.append("\n### Relationships:")
        if graph.edges:
            for edge in graph.edges:
                source_node = node_map.get(edge.source)
                target_node = node_map.get(edge.target)
                if source_node and target_node:
                    semantic_type_val = edge.semantic_type.value if hasattr(edge.semantic_type, 'value') else str(edge.semantic_type)
                    # Use the actual enum value for the summary if available
                    input_summary.append(f"- {source_node.label} [{semantic_type_val}] {target_node.label}")
        else:
            input_summary.append("(No relationships defined)")

        sections.append("\n".join(input_summary))

        # 3. Analysis Insights
        analysis_insights = ["## GRAPH ANALYSIS"]
        
        # Central nodes
        if analysis.get("central_nodes"):
            central_nodes_text = []
            for node_id, degree in analysis["central_nodes"]:
                # Find the node label based on its ki_id or id
                node_label = None
                for n in graph.nodes:
                    if n.id == node_id or n.ki_id == node_id:
                        node_label = n.label
                        break
                if node_label:
                    central_nodes_text.append(f"{node_label} (degree: {degree})")
                else:
                    central_nodes_text.append(f"Node {node_id} (degree: {degree})")
            analysis_insights.append(f"Central nodes: {', '.join(central_nodes_text)}")
        
        # Detected patterns
        if analysis.get("graph_patterns"):
            patterns = []
            for pattern in analysis["graph_patterns"]:
                if isinstance(pattern, dict) and "description" in pattern:
                    patterns.append(pattern["description"])
            if patterns:
                analysis_insights.append(f"Detected patterns: {'; '.join(patterns)}")
        
        # Key tensions/relationships
        if analysis.get("tension_edges"):
            tensions = []
            for edge in analysis["tension_edges"]:
                source = node_map.get(edge.source, edge.source)
                target = node_map.get(edge.target, edge.target)
                source_label = source.label if hasattr(source, 'label') else str(source)
                target_label = target.label if hasattr(target, 'label') else str(target)
                tensions.append(f"{source_label} vs {target_label}")
            if tensions:
                analysis_insights.append(f"Key tensions: {'; '.join(tensions)}")
        
        # Inferred intent
        if analysis.get("inferred_intent"):
            analysis_insights.append(f"Inferred synthesis intent: {analysis['inferred_intent']}")
        
        sections.append("\n".join(analysis_insights))
        
        # 4. Knowledge Context
        context_sections = ["## KNOWLEDGE CONTEXT"]
        
        # Node contexts
        if ki_context.get("kg_node_contexts"):
            context_sections.append("### Node Contexts:")
            for ki_id, context in ki_context["kg_node_contexts"].items():
                # Find the node in graph to get its label
                node_label = None
                for node in graph.nodes:
                    if node.ki_id == ki_id or node.id == ki_id:
                        node_label = node.label
                        break
                
                if not node_label:
                    node_label = f"Node {ki_id}"
                
                # Format the context
                if hasattr(context, "summary") and context.summary:
                    context_sections.append(f"- {node_label}: {context.summary}")
                else:
                    context_sections.append(f"- {node_label}: (No summary available)")
        
        # Interactions
        if ki_context.get("kg_interactions"):
            context_sections.append("\n### Known Interactions:")
            for (id1, id2), interactions in ki_context["kg_interactions"].items():
                if interactions:
                    # Find node labels
                    node1_label = None
                    node2_label = None
                    for node in graph.nodes:
                        if node.ki_id == id1 or node.id == id1:
                            node1_label = node.label
                        if node.ki_id == id2 or node.id == id2:
                            node2_label = node.label
                    
                    if not node1_label:
                        node1_label = f"Node {id1}"
                    if not node2_label:
                        node2_label = f"Node {id2}"
                    
                    # Format interactions
                    interaction_types = [interaction.get("type", "unknown") for interaction in interactions]
                    context_sections.append(f"- Between {node1_label} and {node2_label}: {', '.join(interaction_types)}")
        
        # Similar concepts
        if ki_context.get("vector_similarities"):
            context_sections.append("\n### Similar Concepts:")
            for node_id, similars in ki_context["vector_similarities"].items():
                # Find the node label
                node_label = None
                for node in graph.nodes:
                    if node.ki_id == node_id or node.id == node_id:
                        node_label = node.label
                        break
                
                if not node_label and not node_id.startswith("custom_"):
                    node_label = f"Node {node_id}"
                elif node_id.startswith("custom_"):
                    node_label = "Custom query"
                
                # Format similar concepts
                similar_items = []
                for item in similars[:5]:  # Limit to 5 items
                    if isinstance(item, dict):
                        label = item.get("label", "Unnamed")
                        similarity = item.get("similarity", 0)
                        desc = item.get("description", "")
                        similar_items.append(f"{label} (similarity: {similarity:.2f}){': ' + desc[:50] + '...' if desc else ''}")
                    else:
                        similar_items.append(str(item))
                
                if similar_items:
                    context_sections.append(f"- Similar to {node_label}: {'; '.join(similar_items)}")
        
        # Analogies
        if ki_context.get("vector_analogies"):
            context_sections.append("\n### Analogies:")
            for (source_id, target_id), analogies in ki_context["vector_analogies"].items():
                # Find source and target labels
                source_label = None
                target_label = None
                for node in graph.nodes:
                    if node.ki_id == source_id or node.id == source_id:
                        source_label = node.label
                    if node.ki_id == target_id or node.id == target_id:
                        target_label = node.label
                
                if not source_label:
                    source_label = source_id
                if not target_label:
                    target_label = target_id
                
                # Format analogies
                analogy_items = []
                for item in analogies[:3]:  # Limit to 3 items
                    if isinstance(item, dict):
                        label = item.get("label", "Unnamed")
                        similarity = item.get("similarity", 0)
                        analogy_items.append(f"{label} (similarity: {similarity:.2f})")
                    else:
                        analogy_items.append(str(item))
                
                if analogy_items:
                    context_sections.append(f"- Analogous to {source_label} → {target_label}: {'; '.join(analogy_items)}")
        
        # Lineage traces
        if ki_context.get("kg_lineage_paths"):
            context_sections.append("\n### Historical Influences:")
            for node_id, paths in ki_context["kg_lineage_paths"].items():
                # Find the node label
                node_label = None
                for node in graph.nodes:
                    if node.ki_id == node_id or node.id == node_id:
                        node_label = node.label
                        break
                
                if not node_label:
                    node_label = f"Node {node_id}"
                
                # Format lineage paths
                if paths and isinstance(paths, list):
                    path_strings = []
                    for path in paths[:2]:  # Limit to 2 paths
                        if isinstance(path, list):
                            path_labels = []
                            for node_in_path in path:
                                if isinstance(node_in_path, dict):
                                    path_labels.append(node_in_path.get("label", "Unknown"))
                                else:
                                    path_labels.append(str(node_in_path))
                            path_strings.append(" → ".join(path_labels))
                    
                    if path_strings:
                        context_sections.append(f"- Influences for {node_label}: {'; '.join(path_strings)}")
        
        sections.append("\n".join(context_sections))
        
        # 5. Synthesis Task
        task_section = ["## SYNTHESIS TASK"]
        
        # Define the task based on inferred intent
        intent = analysis.get("inferred_intent", "integrative_synthesis")
        
        if intent == "dialectical_synthesis":
            task_section.append(
                "Create a dialectical synthesis that resolves tensions between the opposing concepts in the graph. "
                "Identify the thesis and antithesis, then develop a higher-order synthesis that transcends their limitations "
                "while preserving their valuable aspects."
            )
        elif intent == "integrative_synthesis":
            task_section.append(
                "Generate an integrative synthesis that meaningfully combines the concepts in the graph. "
                "Identify the complementary aspects of each concept and develop a unified framework that "
                "enhances our understanding of all of them."
            )
        elif intent == "analogical_reasoning":
            task_section.append(
                "Develop a rich analogy or metaphor that illuminates the relationships between concepts in the graph. "
                "Identify structural parallels across domains and show how the source domain provides insight "
                "into the target domain."
            )
        elif intent == "causal_analysis":
            task_section.append(
                "Analyze the causal relationships between the concepts in the graph. "
                "Identify chains of influence, feedback loops, and emergent effects. "
                "Develop a causal model that explains the system's behavior."
            )
        elif intent == "framework_building":
            task_section.append(
                "Construct a theoretical framework that organizes the concepts in the graph. "
                "Define the key components, their relationships, and the principles that govern their interaction. "
                "Show how this framework provides explanatory or predictive power."
            )
        else:
            task_section.append(
                "Generate a novel synthesis that integrates the concepts in the graph in a meaningful way. "
                "Identify patterns, tensions, and complementarities, then develop a coherent perspective "
                "that adds value beyond the individual concepts."
            )
        
        # Add specifics based on graph structure
        if len(graph.nodes) <= 2:
            task_section.append(
                "With this focused graph, develop a deep synthesis that explores multiple dimensions "
                "of the relationship between these concepts."
            )
        elif len(graph.nodes) >= 5:
            task_section.append(
                "With this complex graph, focus on finding the core patterns or principles "
                "that connect these diverse concepts in a coherent way."
            )
        
        # --- Add Alchemical Edge Directives ---
        edge_directives = []
        # Define the instruction stems based on SemanticEdgeType (Plan V2, Table IV.D)
        # Note: Using node labels for clarity in the prompt.
        directive_map = {
            SemanticEdgeType.IS_ANALOGOUS_TO: "Explore the structural or functional analogy between '{source}' and '{target}'. What deeper insights arise from this comparison?",
            SemanticEdgeType.IS_METAPHOR_FOR: "Unpack the metaphor where '{target}' represents '{source}'. What are the entailments and limitations of this metaphorical mapping?",
            SemanticEdgeType.SYMBOLIZES: "Construct a rich symbolic link where '{target}' represents '{source}'. How does this symbolism operate across different contexts or domains?",
            SemanticEdgeType.OPPOSES: "Analyze the fundamental opposition between '{source}' and '{target}'. Is this a productive tension or an irreconcilable difference?",
            SemanticEdgeType.CONTRADICTS_CLAIM: "Identify the specific claim or aspect where '{source}' contradicts '{target}'. Can this contradiction be resolved or does it point to a deeper issue?",
            SemanticEdgeType.CHALLENGES_PREMISE_OF: "Investigate how '{source}' challenges the underlying premises or assumptions of '{target}'. What are the implications if these premises are indeed flawed?",
            SemanticEdgeType.GENERATES_PARADOX_FROM: "Explore the logical or conceptual paradox that arises from the interaction between '{source}' and '{target}'. What does this paradox reveal?",
            SemanticEdgeType.RESOLVES_TENSION_BETWEEN: "Elaborate on how '{target}' offers a resolution or synthesis for the tension inherent between '{source}' and potentially another related concept (implicit or explicit in the graph).", # Assuming target resolves tension involving source
            SemanticEdgeType.CAUSES: "Detail the causal mechanism by which '{source}' leads to or produces '{target}'. Consider direct and indirect effects.",
            SemanticEdgeType.ENABLES: "Explain how '{source}' creates the conditions or possibilities for '{target}' to emerge or function.",
            SemanticEdgeType.INFLUENCES: "Describe the nature of the influence '{source}' exerts on '{target}'. Is it shaping, triggering, or modifying?",
            SemanticEdgeType.AMPLIFIES: "Analyze how '{source}' amplifies or intensifies the effects, characteristics, or significance of '{target}'."
            # Add other mappings here if more types are defined in the enum and plan
        }

        for edge in graph.edges:
            source_node = node_map.get(edge.source)
            target_node = node_map.get(edge.target)
            semantic_type = edge.semantic_type

            if source_node and target_node and semantic_type in directive_map:
                instruction_template = directive_map[semantic_type]
                formatted_instruction = instruction_template.format(source=source_node.label, target=target_node.label)
                edge_directives.append(f"- {formatted_instruction}")

        if edge_directives:
            task_section.append("\n### Alchemical Directives (Based on Connections):")
            task_section.extend(edge_directives)
        # --- End Alchemical Edge Directives ---

        # Output format guidance
        task_section.append("\nYour synthesis should include:")
        task_section.append("1. A title that captures the essence of your synthesis")
        task_section.append("2. A concise summary of the synthesized concept (2-3 sentences)")
        task_section.append("3. A more detailed explanation of the synthesis (1-2 paragraphs)")
        task_section.append("4. Key implications or insights that emerge from this synthesis")
        
        sections.append("\n".join(task_section))
        
        # 6. Constraints and Guidance
        constraints = [
            "## CONSTRAINTS AND GUIDANCE",
            "- Ground your synthesis in the provided context and structure",
            "- Focus on novelty derived from the specific relationships in the graph",
            "- Avoid simply summarizing the input concepts",
            "- Your synthesis should reveal emergent properties not obvious from the individual concepts",
            "- Be concise and precise in your language"
        ]
        
        sections.append("\n".join(constraints))
        
        # Combine all sections into the final prompt
        final_prompt = "\n\n".join(sections)
        
        logger.debug(f"Constructed LLM prompt of length {len(final_prompt)}")
        return final_prompt

    async def synthesize(self, graph: GraphStructure) -> Tuple[Optional[SynthesisOutput], Optional[str]]:
        """
        Synthesize a new concept from the provided graph structure.
        
        Args:
            graph: The graph structure to synthesize from
            
        Returns:
            A tuple containing the synthesis result and an optional error message
        """
        logger.info(f"Starting synthesis process for graph with {len(graph.nodes)} nodes and {len(graph.edges)} edges")
        
        try:
            # 1. Analyze the graph
            analysis = self._analyze_graph(graph)
            logger.info(f"Graph analysis complete. Inferred intent: {analysis.get('inferred_intent', 'unknown')}")
            
            # 2. Plan the knowledge infrastructure queries
            query_plan = self._plan_ki_queries(graph, analysis)
            logger.info(f"KI query planning complete with {len(query_plan.get('kg_context_nodes', []))} context nodes and {len(query_plan.get('kg_interaction_checks', []))} interaction checks")
            
            # 3. Execute the knowledge infrastructure queries
            ki_context = await self._execute_ki_queries(query_plan)
            logger.info("KI query execution complete")
            
            # 4. Construct the LLM prompt
            prompt = self._construct_llm_prompt(graph, analysis, ki_context)
            logger.info(f"Constructed LLM prompt of length {len(prompt)}")
            
            # 5. Generate the synthesis text using the LLM
            synthesis_text = await self.llm_client.agenerate_text(prompt)
            logger.info(f"LLM synthesis text generated: {synthesis_text[:100]}...")
            
            # 6. Parse the LLM output
            parsed_output = self._parse_llm_output(synthesis_text)
            logger.info(f"Parsed LLM output: Name='{parsed_output['name']}', Desc='{parsed_output['description'][:50]}...'")
            
            # 7. Create the SynthesisOutput object
            synthesis_id = str(uuid.uuid4())
            created_at = datetime.now().isoformat()
            
            output = SynthesisOutput(
                id=synthesis_id,
                created_at=created_at,
                status="success",
                prompt=prompt,
                graph_structure=graph,
                parent_node_ids=[node.id for node in graph.nodes],
                analysis=analysis,
                **parsed_output
            )
            
            logger.info(f"Synthesis successful. Returning SynthesisOutput ID: {output.id}")
            return output, None
            
        # Handle potential errors during the main synthesis steps (analysis, KI queries, LLM call, parsing)
        except Exception as e:
            logger.exception(f"Error during synthesis process: {e}")
            error_message = f"An unexpected error occurred during synthesis: {e}"
            # Return None for output, but include the error message
            return None, error_message

    def _parse_llm_output(self, synthesis_text: str) -> Dict[str, str]:
        """
        Parses the raw LLM output text to extract structured fields like Name and Description.

        Assumes the prompt requested a structure like:
        Name: <Name of the synthesis>
        Description: <One-sentence description>

        <Main synthesis text>

        Falls back to heuristics if the structure is not found.

        Args:
            synthesis_text: The raw text output from the LLM.

        Returns:
            A dictionary containing 'name', 'description', and 'content'.
        """
        logger.debug("Parsing LLM output...")
        parsed_output = {
            "name": "Synthesized Concept", # Default name
            "description": "", # Default description
            "content": synthesis_text.strip() # Default content is the full text
        }
        lines = synthesis_text.strip().split('\n')
        name_found = False
        desc_found = False
        content_lines = []

        try:
            # Attempt to parse structured format
            if lines[0].lower().startswith("name:"):
                parsed_output["name"] = lines[0][len("name:"):].strip()
                name_found = True
            if len(lines) > 1 and lines[1].lower().startswith("description:"):
                parsed_output["description"] = lines[1][len("description:"):].strip()
                desc_found = True

            # Determine where the main content starts
            start_index = 0
            if name_found:
                start_index += 1
            if desc_found:
                start_index += 1
            # Skip potential empty line between header and body
            if start_index < len(lines) and not lines[start_index].strip():
                start_index += 1

            parsed_output["content"] = "\n".join(lines[start_index:]).strip()

            # Fallback heuristics if structured format failed
            if not name_found and parsed_output["content"]:
                # Use first line as name if it's reasonably short
                first_line = parsed_output["content"].split('\n')[0]
                if len(first_line) < 80: # Arbitrary length limit for a title
                    parsed_output["name"] = first_line
                    # Remove the first line from content if used as name
                    content_lines_temp = parsed_output["content"].split('\n')
                    if len(content_lines_temp) > 1:
                        parsed_output["content"] = "\n".join(content_lines_temp[1:]).strip()
                    else:
                        # If content was only the first line, description becomes empty
                        pass # Name is set, content remains as is if only one line

            if not desc_found:
                # Use the beginning of the content as description if name was derived differently
                if name_found or parsed_output["name"] != "Synthesized Concept":
                    # Take first ~150 chars of content as description, trying to end at a sentence.
                    potential_desc = parsed_output["content"][:150]
                    sentence_end = potential_desc.rfind('.')
                    if sentence_end > 50: # Ensure it's not too short
                        parsed_output["description"] = potential_desc[:sentence_end+1]
                    else:
                        parsed_output["description"] = potential_desc + '...'
                else: # If no name was found either, use a generic description
                    parsed_output["description"] = f"Synthesis based on input graph. Content: {parsed_output['content'][:50]}..."

            # If content became empty after parsing, use description or full text
            if not parsed_output["content"]:
                if parsed_output["description"]:
                    parsed_output["content"] = parsed_output["description"]
                else:
                     parsed_output["content"] = synthesis_text # Fallback to original full text

            # Ensure description is not longer than content
            if len(parsed_output["description"]) > len(parsed_output["content"]):
                 parsed_output["description"] = parsed_output["content"][:150] + '...' # Re-truncate description

        except Exception as e:
            logger.error(f"Error parsing LLM output: {e}. Falling back to defaults.", exc_info=True)
            # Reset to defaults in case parsing went wrong partially
            parsed_output = {
                "name": "Synthesized Concept",
                "description": f"Synthesis generated. Content: {synthesis_text[:50]}...",
                "content": synthesis_text.strip()
            }
        logger.debug(f"Parsed LLM Output: Name='{parsed_output['name']}', Desc='{parsed_output['description'][:50]}...'")
        return parsed_output

    # --- Placeholder methods for future implementation ---

    # def _generate_lineage(self, output: SynthesisOutput, graph: GraphStructure, analysis: GraphAnalysis, context: Dict) -> LineageReport:
    #     logger.info("Generating lineage report...")
    #     # Complex implementation involving tracing contributions based on graph, KI context, and potentially LLM reasoning.
    #     pass

    # --- Public Methods ---

    def create_synthesis(self, request: GraphStructure) -> SynthesisOutput:
        """Handles a synthesis request using nodes and edges, generates text, traces lineage, and stores results."""
        logger.info(f"Creating synthesis with {len(request.nodes)} nodes and {len(request.edges)} edges.")

        # Use the input GraphStructure directly
        graph_structure = request

        # Use the main synthesize method
        synthesis_output, error_message = self.synthesize(graph_structure)

        if error_message or not synthesis_output:
            logger.error(f"Synthesis process failed: {error_message}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Synthesis failed: {error_message}"
            )

        # TODO: Store the SynthesisOutput and potentially the LineageReport in DB
        # stored_synthesis = self._store_synthesis_results(synthesis_output, lineage_report) # Requires lineage & storage
        logger.warning("Placeholder: Storing synthesis result is not implemented.")
        stored_synthesis_id = synthesis_output.id # Use the generated ID for now

        # TODO: Generate and store Lineage Report
        # lineage_report = self.get_lineage_for_synthesis(stored_synthesis_id) # Assumes storage/retrieval

        # Return the SynthesisOutput directly, as SynthesisResponse is not defined
        return synthesis_output

    # Old method - to be deprecated or refactored if direct text generation is needed elsewhere
    def _generate_synthesis_text(self, nodes: List[NodeData], edges: List[EdgeData]) -> str:
        """Generates synthesis text using LLM based ONLY on nodes/edges (less context)."""
        logger.warning("Using legacy _generate_synthesis_text. Prefer the full synthesize() flow.")
        # Simple prompt construction
        prompt_parts = ["Synthesize the following concepts and their relationships:"]
        for node in nodes:
            prompt_parts.append(f"- Node: {node.label} (Type: {node.type.value}, KI_ID: {node.ki_id or 'N/A'})")
        for edge in edges:
            prompt_parts.append(f"- Relationship: {edge.source} --[{edge.semantic_type.value}]--> {edge.target}")
        prompt_parts.append("\nProvide a concise synthesis.")
        prompt = "\n".join(prompt_parts)

        try:
            # Use the injected LLM client
            return self.llm_client.generate_synthesis(prompt)
        except RuntimeError as e:
            logger.error(f"LLM generation failed in _generate_synthesis_text: {e}")
            return f"Error: {e}"

    def get_lineage_for_synthesis(self, synthesis_id: str) -> Optional[LineageReport]:
        """Retrieves the stored lineage report for a given synthesis ID."""
        logger.info(f"Retrieving lineage for synthesis ID: {synthesis_id}")
        stored_synthesis = self.kg_interface.get_synthesis_with_lineage(synthesis_id)
        if stored_synthesis and stored_synthesis.lineage_data:
            # Re-parse the dictionary back into the LineageReport model
            try:
                logger.debug(f"Parsing stored lineage data for {synthesis_id}")
                return LineageReport(**stored_synthesis.lineage_data)
            except Exception as e:
                logger.error(f"Error parsing stored lineage data for {synthesis_id}: {e}", exc_info=True)
                # Return None as lineage is corrupt/missing.
                return None # Indicate lineage data is present but invalid
        elif stored_synthesis:
            logger.warning(f"Synthesis {synthesis_id} found, but lineage data is missing.")
            return None
        else:
            logger.warning(f"Synthesis {synthesis_id} not found.")
            return None

# Testing code
if __name__ == "__main__":
    import asyncio
    import json
    import logging
    from app.models.ki_ontology import NodeType, SemanticEdgeType
    
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    
    # Mock classes for testing
    class MockKGInterface:
        async def get_node_context(self, ki_id: str) -> dict:
            print(f"[MOCK KG] Getting context for node {ki_id}")
            return {
                "summary": f"This is a mock summary for node {ki_id}",
                "relatedNodes": [
                    {"id": f"related_{ki_id}_1", "label": f"Related to {ki_id} 1", "relationship": "RELATED_TO"},
                    {"id": f"related_{ki_id}_2", "label": f"Related to {ki_id} 2", "relationship": "INFLUENCED_BY"}
                ],
                "relevantEdges": [
                    {"id": f"edge_{ki_id}_1", "source": ki_id, "target": f"related_{ki_id}_1", "semantic_label": "RELATED_TO"},
                    {"id": f"edge_{ki_id}_2", "source": ki_id, "target": f"related_{ki_id}_2", "semantic_label": "INFLUENCED_BY"}
                ]
            }
        
        async def find_known_interactions(self, source_ki_id: str, target_ki_id: str) -> list:
            print(f"[MOCK KG] Finding interactions between {source_ki_id} and {target_ki_id}")
            return [
                {"type": "INFLUENCES", "properties": {"rationale": "Mock rationale"}},
                {"type": "RELATES_TO", "properties": {"rationale": "Another mock rationale"}}
            ]
            
        def trace_influence_paths(self, node_ki_id: str, relationship_types: list, max_depth: int = 3) -> list:
            print(f"[MOCK KG] Tracing influence paths for {node_ki_id} with relationship types {relationship_types}")
            return [
                [
                    {"id": node_ki_id, "label": f"Start {node_ki_id}"},
                    {"id": f"influence_{node_ki_id}_1", "label": f"Influence 1 for {node_ki_id}"},
                    {"id": f"influence_{node_ki_id}_2", "label": f"Influence 2 for {node_ki_id}"}
                ]
            ]
    
    class MockVectorInterface:
        def find_similar_concepts(self, query_text: str, k: int = 5) -> list:
            print(f"[MOCK VECTOR] Finding similar concepts to: {query_text[:50]}...")
            return [
                {"ki_id": "similar1", "label": "Similar Concept 1", "similarity": 0.95, "description": "Description of similar concept 1"},
                {"ki_id": "similar2", "label": "Similar Concept 2", "similarity": 0.85, "description": "Description of similar concept 2"}
            ]
        
        def find_similar(self, query_text: str, n_results: int = 5, filter_metadata: dict = None) -> dict:
            print(f"[MOCK VECTOR] Finding similar items to: {query_text[:50]}...")
            return {
                "ids": [["similar1", "similar2"]],
                "distances": [[0.05, 0.15]],
                "metadatas": [[
                    {"label": "Similar Concept 1", "description": "Description of similar concept 1"},
                    {"label": "Similar Concept 2", "description": "Description of similar concept 2"}
                ]]
            }
    
    class MockLLMClient:
        async def generate_synthesis(self, prompt: str, model: str = "mock", max_tokens: int = 500, temperature: float = 0.7) -> str:
            print(f"[MOCK LLM] Generating synthesis with prompt length: {len(prompt)}")
            return f"This is a mock synthesis generated from a prompt of length {len(prompt)}."
    
    async def run_test():
        # Create sample graph
        sample_graph = {
            "nodes": [
                {
                    "id": "node1",
                    "ki_id": "concept:dialectics",
                    "label": "Dialectics",
                    "type": NodeType.CONCEPT,
                    "description": "A method of philosophical argument that involves contradiction and its resolution"
                },
                {
                    "id": "node2",
                    "ki_id": "concept:emergence",
                    "label": "Emergence",
                    "type": NodeType.CONCEPT,
                    "description": "The phenomenon where complex systems exhibit properties not found in their simpler components"
                },
                {
                    "id": "node3",
                    "ki_id": "concept:reductionism",
                    "label": "Reductionism",
                    "type": NodeType.CONCEPT,
                    "description": "The practice of analyzing complex phenomena in terms of their simpler constituents"
                }
            ],
            "edges": [
                {
                    "source": "node1",
                    "target": "node2",
                    "semantic_type": SemanticEdgeType.RELATES_TO
                },
                {
                    "source": "node3",
                    "target": "node2",
                    "semantic_type": SemanticEdgeType.CONTRADICTS_CLAIM
                }
            ]
        }
        
        # Initialize the SynthesisCore with mock interfaces
        core = SynthesisCore(
            kg_interface=MockKGInterface(),
            vector_interface=MockVectorInterface(),
            llm_client=MockLLMClient()
        )
        
        # Run the synthesis process
        try:
            result = await core.synthesize(sample_graph)
            
            # Print the prompt (or part of it)
            print("\n" + "="*50)
            print("GENERATED LLM PROMPT (first 500 chars):")
            print("="*50)
            print(result["prompt"][:500] + "...")
            print("="*50)
            print(f"Total prompt length: {len(result['prompt'])} chars")
            print("="*50)
            
            print("\nSYNTHESIS PROCESS COMPLETED SUCCESSFULLY!")
            
        except Exception as e:
            print(f"Error during synthesis process: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Run the async test
    asyncio.run(run_test()) 