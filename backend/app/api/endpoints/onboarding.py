import logging
import random
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
import uuid # For generating frontend IDs if ki_id is missing
from pydantic import BaseModel  # Add this import

# Import necessary models and dependencies
from app.models.onboarding import ArchetypeSelectionRequest # Keep request model
from app.models.data_models import NodeData # Use NodeData for response
from app.models.ki_ontology import NodeType # To assign a default type if needed
from app.db.knowledge_graph_interface import KnowledgeGraphInterface # Ensure this is imported
from app.api import dependencies as deps
from app.models.data_models import NodeData as SchemaNodeData # Corrected import path
from app.services.onboarding_service import OnboardingService # Ensure this import is present

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Add an OPTIONS endpoint for CORS preflight requests
@router.options("/select-archetype")
async def options_select_archetype():
    """
    Handle OPTIONS requests for CORS preflight.
    """
    return {"message": "OK"}

# --- Define Seed Concepts Mapping (Using Placeholder KI IDs) ---
# TODO: Replace these placeholders with actual KI IDs from your Knowledge Infrastructure
ARCHETYPE_SEED_KI_IDS: Dict[str, List[str]] = {
    "alchemist": ["ki:concept:transformation_01", "ki:concept:essence_base", "ki:catalyst:generic"],
    "weaver": ["ki:concept:connection_theory", "ki:pattern:fractal", "ki:narrative:hero_journey"],
    "trickster": ["ki:concept:paradox_zeno", "ki:phenomenon:illusion_optical", "ki:event:disruption_tech"],
    "explorer": ["ki:concept:unknown_frontier", "ki:process:discovery_scientific", "ki:boundary:limit"],
    "sage": ["ki:concept:wisdom_sophia", "ki:tradition:stoicism", "ki:insight:epiphany"],
    "synthesist": ["ki:concept:harmony_music", "ki:process:integration_systems", "ki:phenomenon:emergence_life"],
}

# Fallback data in case database connection fails
FALLBACK_ARCHETYPE_NODES = {
    "alchemist": [
        {"id": "1", "label": "Transformation", "description": "The process of change from one form to another", "type": NodeType.CONCEPT},
        {"id": "2", "label": "Essence", "description": "The fundamental nature or quality of something", "type": NodeType.CONCEPT},
        {"id": "3", "label": "Catalyst", "description": "Something that precipitates a process or event", "type": NodeType.CONCEPT},
    ],
    "weaver": [
        {"id": "4", "label": "Connection Theory", "description": "Framework for understanding relationships between entities", "type": NodeType.CONCEPT},
        {"id": "5", "label": "Fractal Pattern", "description": "Self-similar patterns that repeat at different scales", "type": NodeType.PATTERN},
        {"id": "6", "label": "Hero's Journey", "description": "Common narrative structure in storytelling", "type": NodeType.NARRATIVE},
    ],
    "trickster": [
        {"id": "7", "label": "Zeno's Paradox", "description": "Philosophical problems of infinite divisibility", "type": NodeType.PARADOX},
        {"id": "8", "label": "Optical Illusion", "description": "Visual perception that differs from reality", "type": NodeType.CONCEPT},
        {"id": "9", "label": "Technological Disruption", "description": "Innovation that transforms existing markets", "type": NodeType.CONCEPT},
    ],
    "explorer": [
        {"id": "10", "label": "Unknown Frontier", "description": "Unexplored areas at the edge of knowledge", "type": NodeType.CONCEPT},
        {"id": "11", "label": "Scientific Discovery", "description": "Process of observing and understanding natural phenomena", "type": NodeType.CONCEPT},
        {"id": "12", "label": "Boundaries", "description": "Limits that define the scope of a domain", "type": NodeType.CONCEPT},
    ],
    "sage": [
        {"id": "13", "label": "Wisdom", "description": "Deep understanding and good judgment", "type": NodeType.CONCEPT},
        {"id": "14", "label": "Stoicism", "description": "Philosophy emphasizing virtue and control over emotions", "type": NodeType.CONCEPT},
        {"id": "15", "label": "Epiphany", "description": "Sudden realization or insight", "type": NodeType.CONCEPT},
    ],
    "synthesist": [
        {"id": "16", "label": "Harmony", "description": "Pleasing arrangement of parts in relation to each other", "type": NodeType.CONCEPT},
        {"id": "17", "label": "Systems Integration", "description": "Process of combining subsystems into one functioning system", "type": NodeType.CONCEPT},
        {"id": "18", "label": "Emergence", "description": "Properties arising from complex systems not found in their components", "type": NodeType.CONCEPT},
    ],
}

# Helper to convert KG Node to NodeData, adding position - REMOVED AS UNUSED
# def map_kg_node_to_node_data(kg_node: Optional[KGNode], ki_id: str, position: Dict[str, float]) -> NodeData:
#    ...

# Define the response model
class SeedConceptsResponse(BaseModel):
    seed_concepts: List[SchemaNodeData]

@router.post("/select-archetype", response_model=SeedConceptsResponse)
async def select_archetype(
    archetype_data: ArchetypeSelectionRequest,
    kg_interface: KnowledgeGraphInterface = Depends(deps.get_kg_interface),
    onboarding_service: OnboardingService = Depends(deps.get_onboarding_service),
) -> SeedConceptsResponse:
    """
    Select an archetype and generate initial seed concepts based on it.
    """
    try:
        final_seed_nodes = await onboarding_service.process_archetype_selection(
            kg_interface=kg_interface,
            archetype_data=archetype_data
        )
        # Wrap the result in the new response model
        return SeedConceptsResponse(seed_concepts=final_seed_nodes)
    except Exception as e:
        # Log the exception details for debugging
        # Consider using a more specific exception type if possible
        print(f"Error in select_archetype: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 