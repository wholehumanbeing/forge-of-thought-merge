import pytest
import pytest_asyncio
from httpx import AsyncClient
from uuid import uuid4

# Assuming your FastAPI app instance is named 'app' in 'backend.app.main'
# Adjust the import path if necessary
from backend.app.main import app 
from app.models.data_models import GraphStructure, NodeData, EdgeData
from app.models.ki_ontology import NodeType, SemanticEdgeType

# Helper function to create a minimal graph payload
def minimal_graph_payload() -> dict:
    """Creates a JSON-serializable dict for a minimal graph structure."""
    node1_id = str(uuid4())
    node2_id = str(uuid4())
    edge_id = str(uuid4())
    
    graph = GraphStructure(
        nodes=[
            NodeData(
                id=node1_id,
                type=NodeType.Concept,
                label="Concept A",
                data={
                    "description": "First concept",
                    "position": {"x": 100, "y": 100}
                },
                ki_id=None
            ),
            NodeData(
                id=node2_id,
                type=NodeType.Concept,
                label="Concept B",
                data={
                    "description": "Second concept",
                    "position": {"x": 300, "y": 100}
                },
                ki_id=None
            )
        ],
        edges=[
            EdgeData(
                id=edge_id,
                source=node1_id,
                target=node2_id,
                semantic_type=SemanticEdgeType.RELATES_TO, # Use a valid SemanticEdgeType
                data={}
            )
        ]
    )
    # Use .model_dump(mode='json') for Pydantic v2
    return graph.model_dump(mode='json')

@pytest_asyncio.fixture
async def async_client() -> AsyncClient:
    """Provides an async test client for the FastAPI app."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio
async def test_basic_synthesis(async_client: AsyncClient):
    """Tests the basic /api/v1/synthesis/ endpoint with a minimal graph."""
    body = minimal_graph_payload()
    
    # Ensure API keys are set in the environment for the test
    # This might require mocking the LLM client in a real test suite
    # For this exercise, we assume keys are available or the LLM call is handled/mocked
    
    print("\nSending synthesis request with body:", body)
    
    resp = await async_client.post("/api/v1/synthesis/", json=body)
    
    print("Received response status code:", resp.status_code)
    try:
        response_data = resp.json()
        print("Received response data:", response_data)
    except Exception as e:
        print(f"Failed to parse response JSON: {e}")
        print("Response text:", resp.text)
        response_data = None

    assert resp.status_code == 200
    assert response_data is not None
    assert "synthesis_node" in response_data
    assert response_data["synthesis_node"] is not None
    assert "id" in response_data["synthesis_node"]
    assert "label" in response_data["synthesis_node"]
    assert response_data["synthesis_node"]["type"] == NodeType.SYNTHESIS.value
    # Optionally check other fields like synthesis_output, lineage_report
    assert "synthesis_output" in response_data
    assert "lineage_report" in response_data 