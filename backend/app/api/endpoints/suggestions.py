from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.models.ki_ontology import SemanticEdgeType, NodeType
from app.services.suggestion_service import SuggestionService
from app.api.dependencies import get_kg_interface, get_vector_db_interface

router = APIRouter()

class EdgeSuggestionRequest(BaseModel):
    source_type: NodeType
    target_type: NodeType
    source_label: Optional[str] = None
    target_label: Optional[str] = None
    source_ki_id: Optional[str] = None
    target_ki_id: Optional[str] = None

@router.post("/edges", response_model=List[SemanticEdgeType])
async def suggest_edge_types_api(
    request: EdgeSuggestionRequest,
    kg_interface = Depends(get_kg_interface),
    vector_interface = Depends(get_vector_db_interface)
):
    """
    Suggests potential SemanticEdgeTypes between two nodes based on their types,
    labels, and optionally their Knowledge Infrastructure IDs (ki_ids).

    If ki_ids are provided, uses knowledge graph structural data and vector DB
    semantic similarity. If ki_ids are absent, relies primarily on node type
    heuristics and potentially label information.
    """
    suggestion_service = SuggestionService(
        kg_interface=kg_interface,
        vector_interface=vector_interface
    )

    source_node_type = request.source_type
    target_node_type = request.target_type

    suggested_edges = await suggestion_service.suggest_edge_types(
        source_type=source_node_type,
        target_type=target_node_type,
        source_label=request.source_label,
        target_label=request.target_label,
        source_ki_id=request.source_ki_id,
        target_ki_id=request.target_ki_id,
        limit=5
    )

    return suggested_edges 