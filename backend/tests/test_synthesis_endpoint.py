import pytest
from httpx import AsyncClient
from fastapi import status
import uuid

# Assuming your FastAPI app instance is accessible for testing
# If it's created in main.py or similar, adjust the import
# from app.main import app # Adjust this import based on your project structure
# For now, let's assume a fixture provides the client

from app.models.data_models import GraphStructure, NodeData, EdgeData
from app.models.ki_ontology import NodeType, SemanticEdgeType

# Sample data for testing
def create_sample_graph() -> GraphStructure:
    node1_id = str(uuid.uuid4())
    node2_id = str(uuid.uuid4())
    edge1_id = str(uuid.uuid4())

    nodes = [
        NodeData(
            id=node1_id,
            type=NodeType.Concept,
            label="Concept A",
            data={"description": "First concept"}
        ),
        NodeData(
            id=node2_id,
            type=NodeType.Concept,
            label="Concept B",
            data={"description": "Second concept"}
        ),
    ]
    edges = [
        EdgeData(
            id=edge1_id,
            source=node1_id,
            target=node2_id,
            semantic_type=SemanticEdgeType.RELATES_TO # Use a valid enum member
        )
    ]
    return GraphStructure(nodes=nodes, edges=edges)

@pytest.mark.asyncio
async def test_synthesis_endpoint_success(async_client: AsyncClient): # Assuming an async_client fixture exists
    """Test the POST /api/v1/synthesis/ endpoint for a successful case."""
    sample_graph = create_sample_graph()

    response = await async_client.post("/api/v1/synthesis/", json=sample_graph.model_dump())

    assert response.status_code == status.HTTP_200_OK

    response_data = response.json()

    # Assert that the main keys are present
    assert "synthesis_node" in response_data
    assert "synthesis_output" in response_data
    assert "lineage_report" in response_data

    # Assert properties of the synthesis_node
    synthesis_node = response_data["synthesis_node"]
    assert isinstance(synthesis_node, dict)
    assert "id" in synthesis_node
    assert "type" in synthesis_node
    assert synthesis_node["type"] == NodeType.SYNTHESIS.value # Check against the enum value
    assert "label" in synthesis_node
    assert "data" in synthesis_node
    assert isinstance(synthesis_node["data"], dict)
    assert "description" in synthesis_node["data"]

    # Assert properties of the synthesis_output
    synthesis_output = response_data["synthesis_output"]
    assert isinstance(synthesis_output, dict)
    assert "id" in synthesis_output
    assert synthesis_output["id"] == synthesis_node["id"] # IDs should match
    assert "description" in synthesis_output
    assert synthesis_output["description"] == synthesis_node["data"]["description"] # Descriptions should match

    # Assert basic properties of the lineage_report
    lineage_report = response_data["lineage_report"]
    assert isinstance(lineage_report, dict)
    # Add more specific lineage checks if necessary, e.g.:
    assert "synthesized_concept_id" in lineage_report
    assert lineage_report["synthesized_concept_id"] == synthesis_node["id"]

# You might want to add more tests:
# - Test with different graph structures
# - Test error cases (e.g., invalid input graph)
# - Test scenarios where synthesis might fail internally 