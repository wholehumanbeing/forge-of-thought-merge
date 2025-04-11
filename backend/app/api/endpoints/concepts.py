from fastapi import APIRouter, Depends, Query, HTTPException, Path
from typing import List, Optional, Dict, Any
import logging

# Import the specific Neo4j implementation and the correct dependency function
from app.db.knowledge_graph_interface import Neo4jKnowledgeGraph
from app.api.dependencies import get_kg_interface
# Import the new response models
from app.models.data_models import NodeData, NodeContext

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/search", response_model=List[NodeData])
def search_concepts_endpoint(
    query: str = Query(..., min_length=1, description="The search term to query concept names/labels."),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results to return."),
    # Use the corrected dependency getter, which now returns Neo4jKnowledgeGraph
    kg_interface: Neo4jKnowledgeGraph = Depends(get_kg_interface)
):
    """
    Search for concepts (and potentially other node types) in the knowledge graph by label.
    Performs a case-insensitive search (exact mechanism depends on KG implementation).
    Returns nodes matching the query.
    """
    logger.info(f"Received search query: '{query}', limit: {limit}") # Log received query and limit

    if not query:
        logger.warning("Search query is empty.")
        raise HTTPException(status_code=400, detail="Query term cannot be empty.")

    try:
        # Log before calling the KG interface
        logger.info(f"Calling KG search with query: '{query}', limit: {limit}")
        # Assuming search_concepts now returns List[NodeData] or compatible dicts
        # Ensure the KG method aligns with returning NodeData structure
        results: List[NodeData] = kg_interface.search_concepts(query=query, limit=limit)
        # Log the raw results from the KG interface
        logger.info(f"Raw KG results for query '{query}': {results}")

        logger.info(f"Found {len(results)} nodes for query '{query}'")
        # Log the final results being returned
        logger.info(f"Returning final results: {results}")
        # FastAPI will automatically convert Pydantic models to JSON
        return results
    except ConnectionError as ce:
        # This might be raised during connection attempts within the method if driver fails
        logger.error(f"Database connection error during concept search for query '{query}': {ce}")
        raise HTTPException(status_code=503, detail="Database connection error.")
    except Exception as e:
        # Catch unexpected errors during the search execution
        logger.exception(f"An unexpected error occurred during node search for query '{query}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error during node search.")

# Add new context endpoint
@router.get("/{node_ki_id}/context", response_model=NodeContext, summary="Get Node Context by KI ID")
async def get_node_context(
    node_ki_id: str = Path(..., description="The Knowledge Infrastructure ID (ki_id) of the node.",
                           regex=r"^[a-zA-Z0-9_]+:[a-zA-Z0-9_.-]+$"),
    kg_interface: Neo4jKnowledgeGraph = Depends(get_kg_interface)
):
    """
    Retrieve detailed context for a specific node using its KI ID.

    This includes:
    - The node's summary or description
    - Related nodes (e.g., Thinkers, Works, Concepts) connected to this node
    - Relevant edges showing relationships with other nodes

    Used by the Inspector Panel and Suggestion Service.
    """
    try:
        logger.info(f"Fetching detailed context for node KI ID: {node_ki_id}")
        
        context_data = kg_interface.get_node_context(node_ki_id=node_ki_id)

        if context_data is None:
            logger.warning(f"Node context not found for KI ID: {node_ki_id}")
            raise HTTPException(status_code=404, detail=f"Node context not found for KI ID: {node_ki_id}")

        logger.info(f"Successfully fetched detailed context for KI ID: {node_ki_id}")
        return context_data

    except ConnectionError as ce:
        logger.error(f"Database connection error fetching context for {node_ki_id}: {ce}")
        raise HTTPException(status_code=503, detail="Database connection error.")
    except Exception as e:
        logger.exception(f"An unexpected error occurred fetching context for {node_ki_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching node context.")

# Example placeholder for adding a concept (if needed later)
# @router.post("/", response_model=ConceptInfo, status_code=201)

# Placeholder for getting a specific concept by ID
# @router.get("/{concept_id}", response_model=ConceptInfo)
# async def get_concept(
#     concept_id: str,
#     kg_interface: KGInterface = Depends(get_kg_interface)
# ):
#     pass 