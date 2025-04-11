import json
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Union

from neo4j import GraphDatabase, Driver
from neo4j.exceptions import Neo4jError
from fastapi.concurrency import run_in_threadpool

# Updated imports to use new models and config
from app.core.config import settings
from app.models.data_models import NodeData, NodeContext, RelatedNodeInfo, RelevantEdgeInfo
from app.models.ki_ontology import NodeType, RelationshipType

logger = logging.getLogger(__name__)

class KnowledgeGraphInterface(ABC):
    """Abstract base class for Knowledge Graph operations."""

    @abstractmethod
    def verify_connection(self):
        """Verifies the connection to the database is alive and working."""
        pass

    @abstractmethod
    def get_node_by_id(self, node_id: str) -> Optional[NodeData]:
        pass

    @abstractmethod
    def get_nodes_by_ids(self, node_ids: List[str]) -> List[NodeData]:
        pass

    @abstractmethod
    def get_related_nodes(self, node_id: str, relationship_types: List[str], target_labels: List[str]) -> List[NodeData]:
        pass

    @abstractmethod
    def find_thinkers_for_nodes(self, node_ids: List[str]) -> List[NodeData]:
        pass

    @abstractmethod
    def find_works_for_nodes(self, node_ids: List[str]) -> List[NodeData]:
        pass

    @abstractmethod
    def find_schools_for_nodes(self, node_ids: List[str]) -> List[NodeData]:
        pass

    @abstractmethod
    def find_epochs_for_nodes(self, node_ids: List[str]) -> List[NodeData]:
        pass

    @abstractmethod
    def find_concepts_by_relation(self, node_ids: List[str], relationship_types: List[str]) -> List[NodeData]:
        pass

    @abstractmethod
    def find_metaphors_symbols_for_nodes(self, node_ids: List[str]) -> Dict[str, List[Union[NodeData, NodeData]]]:
        pass

    @abstractmethod
    def add_synthesis_result(self, synthesis: NodeData):
        pass

    @abstractmethod
    def get_synthesis_with_lineage(self, synthesis_id: str) -> Optional[NodeData]:
        pass

    @abstractmethod
    def close(self):
        pass

    @abstractmethod
    async def get_node_type(self, node_ki_id: str) -> Optional[NodeType]:
        pass

    @abstractmethod
    def find_known_interactions(self, source_ki_id: str, target_ki_id: str) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_node_context(self, node_ki_id: str) -> Optional["NodeContext"]:
        pass

    @abstractmethod
    def search_concepts(self, query: str, limit: int = 10) -> List[NodeData]:
        pass

    @abstractmethod
    def find_related_nodes(self, node_ki_id: str, limit: int = 10) -> List[NodeData]:
        pass


class Neo4jKnowledgeGraph(KnowledgeGraphInterface):
    """Provides an interface for interacting with the Neo4j Knowledge Graph.

    Handles connection management, query execution, and data mapping to/from
    Pydantic models defined in data_models.py and ki_ontology.py.
    Uses ki_id as the primary identifier for nodes in the graph.
    """

    _driver: Optional[Driver] = None

    def __init__(self):
        """Initialize the Neo4jKnowledgeGraph instance.
        
        Sets up the Neo4j driver connection without directly raising connection errors,
        allowing for graceful fallback to non-database operations.
        """
        logger.info("Initializing Neo4jKnowledgeGraph instance...")
        try:
            # Initialize the driver using the class method
            self._driver = self.get_driver()
            logger.info("Neo4j driver initialized successfully")
        except Exception as e:
            logger.warning(f"Neo4j driver initialization deferred: {e}")
            # Don't raise error - let verify_connection handle that when actually needed
            self._driver = None

    @classmethod
    def get_driver(cls) -> Driver:
        """Initializes and returns the Neo4j Driver instance."""
        if cls._driver is None:
            try:
                # Set a shorter timeout for connection
                cls._driver = GraphDatabase.driver(
                    settings.NEO4J_URI,
                    auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
                    connection_timeout=5  # 5 seconds timeout to prevent hanging
                )
                # Verify connectivity on first initialization
                try:
                    cls._driver.verify_connectivity()
                    logger.info(f"Successfully connected to Neo4j at {settings.NEO4J_URI}")
                except Exception as e:
                    logger.error(f"Failed to verify Neo4j connectivity: {e}")
                    cls._driver = None
                    raise ConnectionError(f"Neo4j connectivity verification failed: {e}")
            except Neo4jError as e:
                logger.error(f"Failed to connect to Neo4j at {settings.NEO4J_URI}: {e}", exc_info=True)
                cls._driver = None
                raise ConnectionError(f"Failed to connect to Neo4j: {e}")
            except Exception as e:
                logger.error(f"An unexpected error occurred during Neo4j driver initialization: {e}", exc_info=True)
                cls._driver = None
                raise ConnectionError(f"Unexpected error connecting to Neo4j: {e}")
        return cls._driver

    @classmethod
    def close_driver(cls):
        """Closes the Neo4j driver connection if it exists."""
        if cls._driver:
            logger.info("Closing Neo4j driver.")
            cls._driver.close()
            cls._driver = None
        else:
            logger.warning("Attempted to close Neo4j driver, but it was not initialized.")

    def verify_connection(self):
        """Verifies the Neo4j connection is alive with an explicit database query.
        
        Returns:
            bool: True if connection is verified
            
        Raises:
            ConnectionError: If connection verification fails
        """
        # Initialize the driver if not already initialized
        if not self._driver:
            try:
                self._driver = self.get_driver()
            except Exception as e:
                raise ConnectionError(f"Failed to initialize Neo4j driver: {e}")
                
        try:
            # Run a simple query to verify connection
            with self._driver.session(database=settings.NEO4J_DATABASE if hasattr(settings, 'NEO4J_DATABASE') else 'neo4j') as session:
                session.run("RETURN 1").consume()
            logger.info("Neo4j connection verified successfully.")
            return True
        except Exception as e:
            logger.error(f"Neo4j connection verification failed: {e}", exc_info=True)
            raise ConnectionError(f"Neo4j connection verification failed: {e}") from e

    def _execute_query(self, query: str, parameters: Optional[Dict[str, Any]] = None, write: bool = False) -> List[Dict[str, Any]]:
        """Executes a Cypher query using a managed session.

        Args:
            query: The Cypher query string.
            parameters: Dictionary of query parameters.
            write: Set to True for write operations (uses execute_write).

        Returns:
            A list of result records as dictionaries for read queries,
            or an empty list for write queries.

        Raises:
            Neo4jError: If a database error occurs during query execution.
        """
        driver = self.get_driver()
        try:
            with driver.session() as session:
                if write:
                    # write_transaction automatically handles retries on transient errors
                    session.execute_write(lambda tx: tx.run(query, parameters or {}).consume())
                    logger.debug(f"Executed write query: {query[:100]}... | Params: {parameters}")
                    return [] # No data returned for writes
                else:
                    # read_transaction automatically handles retries on transient errors
                    result = session.execute_read(lambda tx: list(tx.run(query, parameters or {})))
                    logger.debug(f"Executed read query: {query[:100]}... | Params: {parameters} | Results: {len(result)}")
                    return [record.data() for record in result]
        except Neo4jError as e:
            logger.error(f"Neo4j error executing {'write' if write else 'read'} query: {query[:100]}... | Params: {parameters} | Error: {e}", exc_info=True)
            raise # Re-raise Neo4j errors to be handled by the caller
        except Exception as e:
            logger.error(f"Unexpected error during query execution: {query[:100]}... | Params: {parameters} | Error: {e}", exc_info=True)
            raise # Re-raise unexpected errors

    def _map_record_to_nodedata(self, record: Dict[str, Any], node_alias: str = 'n') -> Optional[NodeData]:
        """Maps a Neo4j record containing a node to a NodeData Pydantic model.

        Args:
            record: The result record dictionary.
            node_alias: The alias used for the node in the Cypher query (e.g., 'n').

        Returns:
            A NodeData object or None if mapping fails.
        """
        if node_alias not in record or record[node_alias] is None:
            logger.warning(f"Node alias '{node_alias}' not found in record or is None: {record}")
            return None

        try:
            node_props = dict(record[node_alias]) # Get node properties
            node_labels = list(record[f'{node_alias}_labels']) # Get node labels (assuming returned separately)

            # Determine NodeType: Find the first label that matches a NodeType value
            node_type = NodeType.CONCEPT # Default or fallback
            for label in node_labels:
                try:
                    node_type = NodeType(label)
                    break # Use the first valid NodeType found
                except ValueError:
                    continue # Ignore labels not in NodeType enum

            ki_id = node_props.pop('ki_id', None)
            if not ki_id:
                # Fallback: Try 'id' or Neo4j's elementId if ki_id is missing
                ki_id = node_props.pop('id', None)
                if not ki_id:
                    ki_id = record.get(f'{node_alias}_elementId') # Assuming elementId is returned
                    if not ki_id:
                         logger.warning(f"Node data missing 'ki_id', 'id', and elementId. Cannot create NodeData for node properties: {node_props}")
                         return None # Cannot proceed without an ID
                    logger.debug(f"Node missing 'ki_id'/'id', using elementId '{ki_id}' as fallback.")
                else:
                    logger.debug(f"Node missing 'ki_id', using 'id' property '{ki_id}' as fallback.")

            label = node_props.pop('name', 'Unknown Label') # Use 'name' as default label, remove from data
            if label == 'Unknown Label' and 'title' in node_props:
                label = node_props.pop('title', 'Unknown Label') # Try 'title' for Works

            # Remaining properties go into the data field
            data_payload = node_props

            return NodeData(
                id=str(ki_id), # Ensure ID is a string
                type=node_type,
                label=label,
                data=data_payload,
                ki_id=str(ki_id) # Explicitly set ki_id if it's the primary ID used
            )
        except Exception as e:
            logger.error(f"Error mapping record to NodeData: {record} | Error: {e}", exc_info=True)
            return None

    # --- Core Methods --- #

    def get_node_context(self, node_ki_id: str) -> Optional["NodeContext"]:
        """Retrieves comprehensive contextual information about a node based on its ki_id.
        
        This includes:
        1. The node's basic properties (name, description, type, etc.)
        2. Related nodes (e.g., Thinkers via DISCUSSED_BY, Works via DEFINES, Concepts via RELATED_TO)
        3. Relevant edges/relationships connecting to this node
        
        Args:
            node_ki_id: The Knowledge Infrastructure ID of the node.
            
        Returns:
            A NodeContext object containing detailed information about the node and its context,
            or None if the node is not found.
        """
        logger.info(f"Getting comprehensive node context for ki_id: {node_ki_id}")
        
        # First, check if the node exists and get its basic properties
        node_query = """
        MATCH (n {ki_id: $ki_id})
        RETURN n, labels(n) AS n_labels, elementId(n) as n_elementId
        LIMIT 1
        """
        
        node_records = self._execute_query(node_query, {"ki_id": node_ki_id})
        if not node_records:
            logger.warning(f"Node with ki_id {node_ki_id} not found.")
            return None
            
        # Map the node to get basic properties
        node_data = self._map_record_to_nodedata(node_records[0], node_alias='n')
        if not node_data:
            logger.error(f"Failed to map record for node with ki_id {node_ki_id}: {node_records[0]}")
            return None
        
        # Extract summary/description from the mapped node data
        summary = node_data.data.get("description", None)
        
        # Now find related nodes with their relationship types (limited to 10)
        related_nodes_query = """
        MATCH (n {ki_id: $ki_id})-[r]-(related)
        WHERE related.ki_id IS NOT NULL
        RETURN 
            related, 
            labels(related) AS related_labels, 
            elementId(related) AS related_elementId,
            type(r) AS relationship_type
        LIMIT 10
        """
        
        related_nodes_records = self._execute_query(related_nodes_query, {"ki_id": node_ki_id})
        
        # Process related nodes
        related_nodes = []
        for record in related_nodes_records:
            related_node = self._map_record_to_nodedata(record, node_alias='related')
            if related_node:
                # Create a RelatedNodeInfo object
                related_node_info = {
                    "id": related_node.id,
                    "label": related_node.label,
                    "type": related_node.type,
                    "relationship": record.get("relationship_type")
                }
                related_nodes.append(related_node_info)
        
        # Find relevant edges (paths) between this node and its neighbors (limited to 10)
        # This gets more context about how nodes are connected
        edges_query = """
        MATCH (n {ki_id: $ki_id})-[r]-(neighbor)
        WHERE neighbor.ki_id IS NOT NULL
        RETURN 
            elementId(r) AS edge_id,
            n.ki_id AS source_id,
            neighbor.ki_id AS target_id,
            type(r) AS relationship_type
        LIMIT 10
        """
        
        edges_records = self._execute_query(edges_query, {"ki_id": node_ki_id})
        
        # Process edges
        relevant_edges = []
        for record in edges_records:
            # Create a RelevantEdgeInfo object
            edge_info = {
                "id": record.get("edge_id", f"edge_{len(relevant_edges)}"),
                "source": record.get("source_id"),
                "target": record.get("target_id"),
                "semantic_label": record.get("relationship_type")
            }
            relevant_edges.append(edge_info)
        
        # Create and return the NodeContext object
        return NodeContext(
            summary=summary,
            relatedNodes=[RelatedNodeInfo(**node) for node in related_nodes],
            relevantEdges=[RelevantEdgeInfo(**edge) for edge in relevant_edges]
        )

    def search_concepts(self, query: str, limit: int = 10) -> List[NodeData]:
        """Searches for Concept nodes by name or description (case-insensitive CONTAINS).

        Args:
            query: The search term.
            limit: Maximum number of results to return.

        Returns:
            A list of NodeData objects representing the found concepts.
        """
        logger.info(f"Searching concepts for query: '{query}' with limit: {limit}")
        # TODO: Consider using a full-text index for better performance if available
        # Example query assumes 'name' and potentially 'description' properties
        cypher_query = """
        MATCH (n:CONCEPT)
        WHERE (toLower(n.name) CONTAINS toLower($query))
           OR (n.description IS NOT NULL AND toLower(n.description) CONTAINS toLower($query))
        RETURN n, labels(n) AS n_labels, elementId(n) as n_elementId
        LIMIT $limit
        """
        parameters = {"query": query, "limit": limit}
        
        try:
            records = self._execute_query(cypher_query, parameters)
        except Neo4jError as e:
            logger.error(f"Neo4j error during concept search for query '{query}': {e}", exc_info=True)
            return [] # Return empty list on database error
        except Exception as e:
            logger.error(f"Unexpected error during concept search for query '{query}': {e}", exc_info=True)
            return [] # Return empty list on unexpected error

        nodes = []
        for record in records:
            mapped_node = self._map_record_to_nodedata(record, node_alias='n')
            if mapped_node:
                nodes.append(mapped_node)
        logger.info(f"Concept search for '{query}' found {len(nodes)} results.")
        return nodes

    def find_related_nodes(
        self,
        node_ki_id: str,
        relationship_types: Optional[List[RelationshipType]] = None,
        neighbor_types: Optional[List[NodeType]] = None,
        limit: int = 5
    ) -> List[NodeData]:
        """Finds related nodes connected by specific relationships and/or of specific types.

        Args:
            node_ki_id: The ki_id of the starting node.
            relationship_types: Optional list of RelationshipType enums to filter connections.
            neighbor_types: Optional list of NodeType enums to filter neighbors.
            limit: Maximum number of related nodes to return.

        Returns:
            A list of NodeData objects for the related neighbors.
        """
        logger.info(f"Finding related nodes for ki_id: {node_ki_id} (rels: {relationship_types}, types: {neighbor_types}, limit: {limit})")

        rel_type_str = ""
        if relationship_types:
            # Convert enum values to strings for the query
            rel_type_values = [rel.value for rel in relationship_types]
            rel_type_str = "r:" + "|".join(rel_type_values)

        match_clause = f"MATCH (start {{ki_id: $ki_id}})-[{rel_type_str}]-(neighbor)"

        where_clauses = ["start <> neighbor"] # Prevent matching the start node itself
        parameters = {"ki_id": node_ki_id, "limit": limit}

        if neighbor_types:
            neighbor_labels = [ntype.value for ntype in neighbor_types]
            # Check if any label on the neighbor node matches the provided types
            where_clauses.append("any(label IN labels(neighbor) WHERE label IN $neighbor_labels)")
            parameters["neighbor_labels"] = neighbor_labels

        query = f"""
        {match_clause}
        WHERE {' AND '.join(where_clauses)}
        RETURN DISTINCT neighbor AS n, labels(neighbor) AS n_labels, elementId(neighbor) AS n_elementId
        LIMIT $limit
        """

        records = self._execute_query(query, parameters)
        nodes = []
        for record in records:
            mapped_node = self._map_record_to_nodedata(record, node_alias='n')
            if mapped_node:
                nodes.append(mapped_node)
        logger.info(f"Found {len(nodes)} related nodes for ki_id: {node_ki_id}.")
        return nodes

    async def find_known_interactions(self, source_ki_id: str, target_ki_id: str) -> List[Dict[str, Any]]:
        """
        Checks if there are any existing relationships between two nodes.

        Uses run_in_threadpool as the underlying driver method is synchronous.

        Args:
            source_ki_id: The ki_id of the source node.
            target_ki_id: The ki_id of the target node.

        Returns:
            A list of dictionaries, each representing a relationship type found
            (e.g., [{'type': 'INFLUENCED_BY'}]), or an empty list if no direct
            relationships exist or an error occurs.
        """
        logger.debug(f"Finding known interactions between ki_id: {source_ki_id} and ki_id: {target_ki_id}")
        # This query finds any direct relationship in either direction
        query = """
        MATCH (a {ki_id: $source_id})-[r]-(b {ki_id: $target_id})
        RETURN DISTINCT type(r) as type
        """
        parameters = {"source_id": source_ki_id, "target_id": target_ki_id}

        try:
            # Use run_in_threadpool to execute the blocking _execute_query
            records = await run_in_threadpool(self._execute_query, query=query, parameters=parameters)
            # Result format is [{'type': 'REL_TYPE_1'}, {'type': 'REL_TYPE_2'}, ...]
            interaction_types = [record for record in records if 'type' in record]
            logger.debug(f"Found {len(interaction_types)} interaction types between {source_ki_id} and {target_ki_id}: {interaction_types}")
            return interaction_types
        except Neo4jError as e:
            logger.error(f"Neo4j error finding interactions between {source_ki_id} and {target_ki_id}: {e}", exc_info=True)
            return []
        except Exception as e:
            logger.error(f"Unexpected error finding interactions between {source_ki_id} and {target_ki_id}: {e}", exc_info=True)
            return []

    def trace_influence_paths(self, node_ki_id: str, relationship_types: List[RelationshipType], max_depth: int = 3) -> List[NodeData]:
        """Traces paths backwards from a node following specified relationship types.

        Useful for finding ancestors, influences, or sources based on relationships
        like INFLUENCED_BY, DERIVED_FROM, BASED_ON_AXIOM.

        Args:
            node_ki_id: The ki_id of the starting node.
            relationship_types: List of RelationshipType enums defining the path.
            max_depth: Maximum path length (number of relationships) to trace.

        Returns:
            A list of unique ancestor NodeData objects found through the paths.
        """
        logger.info(f"Tracing influence paths for ki_id: {node_ki_id} (rels: {relationship_types}, depth: {max_depth})")
        if not relationship_types:
            logger.warning("trace_influence_paths called with no relationship types.")
            return []

        rel_type_values = [rel.value for rel in relationship_types]
        rel_pattern = "|".join([f"`{r}`" for r in rel_type_values]) # Escape potentially special chars

        query = f"""
        MATCH path = (start {{ki_id: $ki_id}})<-[:{rel_pattern}*1..{max_depth}]-(ancestor)
        WHERE start <> ancestor // Ensure we don't return the start node
        RETURN DISTINCT ancestor AS n, labels(ancestor) AS n_labels, elementId(ancestor) AS n_elementId
        """
        # Note: The above query finds distinct ancestors. To get full paths, change RETURN path.

        parameters = {"ki_id": node_ki_id}
        records = self._execute_query(query, parameters)
        nodes = []
        for record in records:
            mapped_node = self._map_record_to_nodedata(record, node_alias='n')
            if mapped_node:
                nodes.append(mapped_node)
        logger.info(f"Found {len(nodes)} distinct ancestors for ki_id: {node_ki_id} via influence path trace.")
        return nodes

    def get_nodes_by_filter(
        self,
        node_type: Optional[NodeType] = None,
        properties: Optional[Dict[str, Any]] = None,
        limit: int = 20
    ) -> List[NodeData]:
        """Generic function to find nodes by type and/or properties.

        Args:
            node_type: Optional NodeType to filter by.
            properties: Optional dictionary of property key-value pairs to filter by.
            limit: Maximum number of nodes to return.

        Returns:
            A list of matching NodeData objects.
        """
        logger.info(f"Getting nodes by filter (type: {node_type}, props: {properties}, limit: {limit})")
        parameters = {"limit": limit}
        where_clauses = []

        label_filter = f":`{node_type.value}`" if node_type else ""
        match_clause = f"MATCH (n{label_filter})"

        if properties:
            prop_keys = []
            for i, (key, value) in enumerate(properties.items()):
                param_name = f"prop_val_{i}"
                where_clauses.append(f"n.`{key}` = ${param_name}") # Escape property key
                parameters[param_name] = value
                prop_keys.append(key)
            logger.debug(f"Filtering by properties: {prop_keys}")

        where_string = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        query = f"""
        {match_clause}
        {where_string}
        RETURN n, labels(n) AS n_labels, elementId(n) AS n_elementId
        LIMIT $limit
        """

        records = self._execute_query(query, parameters)
        nodes = []
        for record in records:
            mapped_node = self._map_record_to_nodedata(record, node_alias='n')
            if mapped_node:
                nodes.append(mapped_node)
        logger.info(f"Found {len(nodes)} nodes matching filter.")
        return nodes

    def get_node_by_id(self, node_id: str) -> Optional[NodeData]:
        """Retrieves a node by its ID string.

        Args:
            node_id: ID string to look up.

        Returns:
            Optional[NodeData]: The found node data or None if not found.
        """
        try:
            # Try getting the Neo4j driver; if it fails, log and return None gracefully
            try:
                _ = self.get_driver()
            except Exception as e:
                logger.error(f"Unable to initialize Neo4j driver: {e}")
                # Instead of raising an error, we'll return None
                return None
                
            # Attempt to query by matching any node with this id or name property
            query = """
            MATCH (n) 
            WHERE n.id = $node_id OR n.name = $node_id OR n.ki_id = $node_id
            RETURN n, labels(n) as n_labels
            LIMIT 1
            """
            
            try:
                records = self._execute_query(query, {"node_id": node_id})
            except Exception as e:
                logger.error(f"Error executing query for node ID {node_id}: {e}")
                return None
                
            if records and len(records) > 0:
                try:
                    mapped_node = self._map_record_to_nodedata(records[0])
                    return mapped_node
                except Exception as mapping_error:
                    logger.error(f"Error mapping node data for ID {node_id}: {mapping_error}")
                    return None
            else:
                logger.info(f"No node found with ID {node_id}")
                return None
                
        except Exception as e:
            logger.error(f"Unexpected error in get_node_by_id for ID {node_id}: {str(e)}")
            return None

    def get_nodes_by_ids(self, node_ids: List[str]) -> List[NodeData]:
        if not node_ids:
            return []
        query = "MATCH (n) WHERE n.id IN $node_ids RETURN n"
        records = self._execute_query(query, {"node_ids": node_ids})
        nodes = []
        for record in records:
            mapped_node = self._map_record_to_nodedata(record)
            if mapped_node:
                nodes.append(mapped_node)
            else:
                logger.error(f"Failed to map record during get_nodes_by_ids: {record}")
        if len(nodes) != len(node_ids):
             logger.warning(f"Requested {len(node_ids)} nodes, but found/mapped {len(nodes)}. Missing IDs: {set(node_ids) - {n.id for n in nodes}}")
        return nodes

    def get_related_nodes(self, node_id: str, relationship_types: List[str], target_labels: List[str]) -> List[NodeData]:
        # Build the relationship pattern string (e.g., ":REL1|:REL2")
        rel_pattern = "|:".join(relationship_types)
        # Build the target label pattern string (e.g., ":Label1|:Label2")
        label_pattern = ":".join(target_labels)

        # Note: Parameterizing relationship types and labels directly in Cypher is complex/not standard.
        # Be cautious about query injection if types/labels come from untrusted sources.
        # Using a list of IDs is safer.
        query = f"""
        MATCH (start {{id: $node_id}})-[:{rel_pattern}]->(end:{label_pattern})
        RETURN DISTINCT end AS n
        """
        records = self._execute_query(query, {"node_id": node_id})
        return [self._map_record_to_nodedata(record, node_alias='n') for record in records]

    def find_thinkers_for_nodes(self, node_ids: List[str]) -> List[NodeData]:
        if not node_ids: return []
        query = """
        MATCH (t:Thinker)-[]-(n)
        WHERE n.id IN $node_ids
        RETURN DISTINCT t
        """
        records = self._execute_query(query, {"node_ids": node_ids})
        # Assumes Thinker nodes have 'id' and 'name' properties
        return [NodeData(id=rec['t'].get('id'), name=rec['t'].get('name')) for rec in records]

    def find_works_for_nodes(self, node_ids: List[str]) -> List[NodeData]:
        if not node_ids: return []
        query = """
        MATCH (w:Work)-[]-(n)
        WHERE n.id IN $node_ids
        RETURN DISTINCT w
        """
        records = self._execute_query(query, {"node_ids": node_ids})
         # Assumes Work nodes have 'id' and 'title' properties
        return [NodeData(id=rec['w'].get('id'), title=rec['w'].get('title')) for rec in records]

    def find_schools_for_nodes(self, node_ids: List[str]) -> List[NodeData]:
        if not node_ids: return []
        query = """
        MATCH (s:SchoolOfThought)-[]-(n) // Consider specific relationships like MEMBER_OF, INFLUENCED
        WHERE n.id IN $node_ids
        RETURN DISTINCT s
        """
        records = self._execute_query(query, {"node_ids": node_ids})
        return [NodeData(id=rec['s'].get('id'), name=rec['s'].get('name')) for rec in records]

    def find_epochs_for_nodes(self, node_ids: List[str]) -> List[NodeData]:
        if not node_ids: return []
        query = """
        MATCH (e:Epoch)-[]-(n) // Consider specific relationships like OCCURRED_IN, PART_OF
        WHERE n.id IN $node_ids
        RETURN DISTINCT e
        """
        records = self._execute_query(query, {"node_ids": node_ids})
        return [NodeData(id=rec['e'].get('id'), name=rec['e'].get('name')) for rec in records]

    def find_concepts_by_relation(self, node_ids: List[str], relationship_types: List[str]) -> List[NodeData]:
        if not node_ids or not relationship_types: return []
        rel_pattern = "|:".join(relationship_types)
        query = f"""
        MATCH (c:Concept)-[:{rel_pattern}]-(n) // Assuming concepts relate TO the parents
        WHERE n.id IN $node_ids
        RETURN DISTINCT c
        UNION // Also check if parents relate TO concepts
        MATCH (n)-[:{rel_pattern}]->(c:Concept)
        WHERE n.id IN $node_ids
        RETURN DISTINCT c
        """
        records = self._execute_query(query, {"node_ids": node_ids})
        return [NodeData(id=rec['c'].get('id'), name=rec['c'].get('name'), description=rec['c'].get('description')) for rec in records]

    def find_metaphors_symbols_for_nodes(self, node_ids: List[str]) -> Dict[str, List[Union[NodeData, NodeData]]]:
         if not node_ids: return {"metaphors": [], "symbols": []}
         # Find related metaphors
         metaphor_query = """
         MATCH (m:CoreMetaphor)-[:ASSOCIATED_WITH]-(n) // Assuming ASSOCIATED_WITH relationship
         WHERE n.id IN $node_ids
         RETURN DISTINCT m
         """
         metaphor_records = self._execute_query(metaphor_query, {"node_ids": node_ids})
         metaphors = [NodeData(id=rec['m'].get('id'), name=rec['m'].get('name'), description=rec['m'].get('description')) for rec in metaphor_records]

         # Find related symbols
         symbol_query = """
         MATCH (s:Symbol)-[:ASSOCIATED_WITH]-(n) // Assuming ASSOCIATED_WITH relationship
         WHERE n.id IN $node_ids
         RETURN DISTINCT s
         """
         symbol_records = self._execute_query(symbol_query, {"node_ids": node_ids})
         symbols = [NodeData(id=rec['s'].get('id'), name=rec['s'].get('name'), meaning=rec['s'].get('meaning')) for rec in symbol_records]

         return {"metaphors": metaphors, "symbols": symbols}

    def add_synthesis_result(self, synthesis: NodeData):
        logger.info(f"Adding/Updating synthesis result with ID: {synthesis.id}")
        lineage_data_json = None
        try:
            if synthesis.lineage_data:
                lineage_data_json = json.dumps(synthesis.lineage_data)
        except TypeError as e:
            logger.error(f"Failed to serialize lineage data to JSON for synthesis {synthesis.id}: {e}", exc_info=True)
            # Decide how to handle: store null, store error marker, or raise?
            # Storing null for now.
            lineage_data_json = None

        query = """
        MERGE (s:Synthesis {id: $id})
        ON CREATE SET
            s.synthesis_text = $synthesis_text,
            s.parent_node_ids = $parent_node_ids,
            s.timestamp = $timestamp,
            s.lineage_data = $lineage_data_json
        ON MATCH SET
            s.synthesis_text = $synthesis_text,
            s.parent_node_ids = $parent_node_ids,
            s.timestamp = $timestamp,
            s.lineage_data = $lineage_data_json
        """
        parameters = {
            "id": synthesis.id,
            "synthesis_text": synthesis.synthesis_text,
            "parent_node_ids": synthesis.parent_node_ids,
            "timestamp": synthesis.timestamp, # Or use datetime() function in Cypher
            "lineage_data_json": lineage_data_json
        }
        self._execute_query(query, parameters, write=True)

        # Optional: Create relationships to parent nodes if they don't exist
        if synthesis.parent_node_ids:
            rel_query = """
            MATCH (s:Synthesis {id: $synthesis_id})
            MATCH (p) WHERE p.id IN $parent_ids
            MERGE (s)-[:DERIVED_FROM]->(p)
            """
            self._execute_query(rel_query, {"synthesis_id": synthesis.id, "parent_ids": synthesis.parent_node_ids}, write=True)


    def get_synthesis_with_lineage(self, synthesis_id: str) -> Optional[NodeData]:
        logger.info(f"Retrieving synthesis with lineage for ID: {synthesis_id}")
        query = "MATCH (s:Synthesis {id: $synthesis_id}) RETURN s"
        records = self._execute_query(query, {"synthesis_id": synthesis_id})
        if records:
            s_data = records[0].get('s')
            if not s_data:
                 logger.error(f"Query for synthesis ID {synthesis_id} returned record, but 's' key is missing: {records[0]}")
                 return None

            lineage_data = None
            raw_lineage_json = s_data.get('lineage_data')
            if raw_lineage_json:
                try:
                    lineage_data = json.loads(raw_lineage_json)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to decode lineage data JSON for synthesis {synthesis_id}: {e}. Data: {raw_lineage_json[:100]}...", exc_info=True)
                    lineage_data = {"error": "Failed to decode stored lineage data", "details": str(e)}
            else:
                 logger.info(f"Synthesis {synthesis_id} found, but has no stored lineage_data.")

            try:
                # Attempt to create the Pydantic model
                return NodeData(
                    id=s_data.get('id'),
                    synthesis_text=s_data.get('synthesis_text'),
                    parent_node_ids=s_data.get('parent_node_ids', []),
                    timestamp=str(s_data.get('timestamp')), # Ensure conversion
                    lineage_data=lineage_data
                )
            except Exception as e: # Catch potential Pydantic validation errors or others
                logger.error(f"Failed to instantiate NodeData model for ID {synthesis_id} from data: {s_data}. Error: {e}", exc_info=True)
                return None # Failed to create the model object
        else:
            logger.info(f"Synthesis with ID {synthesis_id} not found in the graph.")
            return None

    def close(self):
        self.close_driver()

    async def get_node_type(self, node_ki_id: str) -> Optional[NodeType]:
        """
        Retrieves the NodeType of a node based on its ki_id.

        Uses run_in_threadpool as the underlying driver method is synchronous.

        Args:
            node_ki_id: The Knowledge Infrastructure ID of the node.

        Returns:
            The NodeType enum member if a matching label is found, otherwise None.
        """
        logger.debug(f"Getting node type for ki_id: {node_ki_id}")
        
        query = """
        MATCH (n {ki_id: $ki_id})
        RETURN labels(n) AS labels
        LIMIT 1
        """
        parameters = {"ki_id": node_ki_id}
        
        try:
            # Use run_in_threadpool to execute the blocking _execute_query
            records = await run_in_threadpool(self._execute_query, query=query, parameters=parameters)
            
            if not records:
                logger.warning(f"Node with ki_id {node_ki_id} not found.")
                return None
                
            # Extract the labels from the result
            node_labels = records[0].get("labels", [])
            
            # Find the first label that matches a NodeType value
            for label in node_labels:
                try:
                    return NodeType(label)
                except ValueError:
                    continue  # Not a recognized NodeType, try next label
                    
            # If no matching NodeType found, log warning and return None
            logger.warning(f"No recognized NodeType found in labels {node_labels} for node {node_ki_id}")
            return None
            
        except Exception as e:
            logger.error(f"Error getting node type for ki_id {node_ki_id}: {e}", exc_info=True)
            return None

# Example usage - can be run if script is executed directly
# Make sure .env file is present or environment variables are set
if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    logger.info("Running Neo4jKnowledgeGraph example usage...")

    kg_interface = Neo4jKnowledgeGraph()

    try:
        # --- Example 1: Get Node Context ---
        print("\n--- Example 1: Get Node Context ---")
        # Replace 'ki_id_of_existing_node' with an actual ki_id from your graph
        example_ki_id = "concept:plato_theory_of_forms" # Example ki_id format
        node_context = kg_interface.get_node_context(example_ki_id)
        if node_context:
            print(f"Found node context for {example_ki_id}:")
            print(node_context.model_dump_json(indent=2))
        else:
            print(f"Node context for {example_ki_id} not found.")

        # --- Example 2: Search Concepts ---
        print("\n--- Example 2: Search Concepts ---")
        search_term = "form"
        found_concepts = kg_interface.search_concepts(search_term, limit=5)
        print(f"Found {len(found_concepts)} concepts matching '{search_term}':")
        for concept in found_concepts:
            print(f"- {concept.label} (ID: {concept.id}, Type: {concept.type.value})")

        # --- Example 3: Find Related Nodes ---
        print("\n--- Example 3: Find Related Nodes ---")
        # Find nodes related to 'Plato' (assuming ki_id is 'thinker:plato')
        plato_ki_id = "thinker:plato"
        # Find 'Works' 'AUTHORED_BY' Plato
        related_works = kg_interface.find_related_nodes(
            plato_ki_id,
            relationship_types=[RelationshipType.HAS_AUTHOR], # Assuming relationship is Thinker <-[:HAS_AUTHOR]- Work
            neighbor_types=[NodeType.WORK],
            limit=3
        )
        # Note: Need to adjust RelationshipType.HAS_AUTHOR direction or query if needed
        print(f"Found {len(related_works)} works related to {plato_ki_id} (limit 3):")
        for work in related_works:
            print(f"- {work.label} (ID: {work.id})")

        # --- Example 4: Find Known Interactions ---
        print("\n--- Example 4: Find Known Interactions ---")
        # Check interaction between Plato and Aristotle (replace with actual ki_ids)
        aristotle_ki_id = "thinker:aristotle"
        interactions = kg_interface.find_known_interactions(plato_ki_id, aristotle_ki_id)
        if interactions:
            print(f"Found interactions between {plato_ki_id} and {aristotle_ki_id}:")
            for inter in interactions:
                print(f"- Type: {inter['type']}, Properties: {inter['properties']}")
        else:
            print(f"No direct interactions found between {plato_ki_id} and {aristotle_ki_id}.")

        # --- Example 5: Trace Influence Paths ---
        print("\n--- Example 5: Trace Influence Paths ---")
        # Trace who influenced Aristotle
        influence_rels = [RelationshipType.INFLUENCED_BY] # Add others like DERIVED_FROM if needed
        influencers = kg_interface.trace_influence_paths(aristotle_ki_id, influence_rels, max_depth=2)
        print(f"Found {len(influencers)} potential influencers (depth 2) for {aristotle_ki_id}:")
        for inf in influencers:
            print(f"- {inf.label} (ID: {inf.id}, Type: {inf.type.value})")

        # --- Example 6: Get Nodes by Filter ---
        print("\n--- Example 6: Get Nodes by Filter ---")
        # Find all 'Thinker' nodes
        all_thinkers = kg_interface.get_nodes_by_filter(node_type=NodeType.THINKER, limit=5)
        print(f"Found {len(all_thinkers)} thinkers (limit 5):")
        for thinker in all_thinkers:
            print(f"- {thinker.label} (ID: {thinker.id})")

        # Find nodes with a specific property (adjust property/value)
        # specific_nodes = kg_interface.get_nodes_by_filter(properties={"century": 19}, limit=5)
        # print(f"\nFound {len(specific_nodes)} nodes with property 'century=19' (limit 5):")
        # for node in specific_nodes:
        #     print(f"- {node.label} (ID: {node.id}, Type: {node.type.value})")


    except Neo4jError as db_error:
        logger.error(f"Database error during example execution: {db_error}", exc_info=True)
        print(f"\nA database error occurred: {db_error}")
    except Exception as e:
        logger.error(f"An unexpected error occurred during example execution: {e}", exc_info=True)
        print(f"\nAn unexpected error occurred: {e}")
    finally:
        # Close the driver connection when the application shuts down
        # In a real application, this might be handled in shutdown events (FastAPI, etc.)
        kg_interface.close()
        print("\nNeo4j connection closed.") 