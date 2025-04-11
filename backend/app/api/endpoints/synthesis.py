from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
import logging # Added logging

from app.models.data_models import GraphStructure, SynthesisResult, SynthesisOutput, LineageReport
from app.services.synthesis_core import SynthesisCore
from app.services.lineage_mapper import LineageMapper # Added LineageMapper
# We need a way to get the configured instances
# This usually involves a dependency injection mechanism
# Assume these exist in dependencies.py
from app.api.dependencies import get_synthesis_core, get_lineage_mapper

# logger = logging.getLogger(__name__) # Added logger
logger = logging.getLogger(__name__) # Added logger

router = APIRouter(
    prefix="/synthesis",
    tags=["synthesis"],
)

# Refactor the POST endpoint
# @router.post("/", response_model=SynthesisResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SynthesisResult, status_code=status.HTTP_200_OK)
async def orchestrate_synthesis_and_lineage(
    # request: SynthesisRequest,
    graph_input: GraphStructure, # Changed request body model
    synthesis_core: SynthesisCore = Depends(get_synthesis_core),
    lineage_mapper: LineageMapper = Depends(get_lineage_mapper) # Added LineageMapper dependency
):
    """
    Orchestrates the knowledge synthesis and lineage tracing process.

    Accepts a graph structure representing the user's input, triggers the
    synthesis core to generate a new concept/insight, traces its lineage
    using the lineage mapper, and returns the combined result.
    """
    synthesis_output: Optional[SynthesisOutput] = None
    lineage_report: Optional[LineageReport] = None
    error_message: Optional[str] = None

    # --- Step 1: Perform Synthesis ---
    try:
        logger.info(f"Received synthesis request with {len(graph_input.nodes)} nodes, {len(graph_input.edges)} edges.")
        # response = synthesis_core.create_synthesis(request)
        synthesis_output, error_message = await synthesis_core.synthesize(graph=graph_input)

        if error_message or not synthesis_output:
            logger.error(f"Synthesis Core failed: {error_message}")
            # Determine appropriate status code based on error type if possible
            # For now, use 500 for core synthesis failure
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Synthesis generation failed: {error_message}"
            )
        logger.info(f"Synthesis Core successful. Output ID: {synthesis_output.id}")

    # Handle specific exceptions from Synthesis Core if needed
    # except SomeSynthesisCoreError as e:
    #     raise HTTPException(status_code=4xx/5xx, detail=str(e))
    except HTTPException as http_exc:
         raise http_exc # Re-raise HTTPException if already handled (e.g., from create_synthesis call inside core)
    except Exception as e:
        logger.exception("An unexpected error occurred during the synthesis step.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during synthesis generation."
        )

    # --- Step 2: Trace Lineage --- 
    try:
        logger.info(f"Tracing lineage for synthesis output: {synthesis_output.id}")
        lineage_report = await lineage_mapper.trace_lineage(
            synthesis_output=synthesis_output,
            generating_graph=graph_input
        )
        # Check if lineage_report is None
        if lineage_report is None:
            logger.warning(f"Lineage Mapper returned None for synthesis ID: {synthesis_output.id}. Creating default empty LineageReport.")
            lineage_report = LineageReport()  # Create default empty LineageReport

        logger.info(f"Lineage Mapper successful for synthesis output: {synthesis_output.id}")

    # Handle specific exceptions from Lineage Mapper if needed
    # except SomeLineageMapperError as e:
    #     raise HTTPException(status_code=4xx/5xx, detail=str(e))
    except Exception as e:
        logger.exception(f"An unexpected error occurred during the lineage tracing step for synthesis ID: {synthesis_output.id}.")
        # Consider returning a partial response (just synthesis_output) or failing completely.
        # Failing completely for now:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during lineage tracing."
        )

    # --- Step 3: Combine and Return Result ---
    # Check if lineage_report is the correct type
    if not isinstance(lineage_report, LineageReport):
        logger.error(f"Type mismatch for lineage_report: expected LineageReport but got {type(lineage_report)}. Creating default empty LineageReport.")
        lineage_report = LineageReport()  # Create default empty LineageReport

    synthesis_result = SynthesisResult(
        synthesis_output=synthesis_output,
        lineage_report=lineage_report
    )

    return synthesis_result


# Keeping the separate lineage endpoint for now, though it might be redundant
@router.get("/{synthesis_id}/lineage", response_model=LineageReport)
def get_synthesis_lineage(
    synthesis_id: str,
    synthesis_core: SynthesisCore = Depends(get_synthesis_core)
):
    """
    Retrieves the detailed lineage report for a specific synthesis.
    """
    lineage = synthesis_core.get_lineage_for_synthesis(synthesis_id)
    if lineage is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Synthesis or lineage not found for ID: {synthesis_id}"
        )
    # If get_lineage_for_synthesis might return the raw dict on parse error:
    if isinstance(lineage, dict) and lineage.get('error'):
         raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load lineage data for synthesis ID: {synthesis_id}. Error: {lineage.get('error')}"
        )
    # Ensure it's the correct Pydantic model before returning
    if not isinstance(lineage, LineageReport):
         raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid lineage data format retrieved for synthesis ID: {synthesis_id}."
        )

    return lineage 