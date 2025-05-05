from functools import lru_cache
import logging
from typing import Optional

from fastapi import HTTPException, status

from app.core.config import settings
from app.db.knowledge_graph_interface import Neo4jKnowledgeGraph, KnowledgeGraphInterface
from app.db.vector_db_interface import ChromaVectorDB, VectorDBInterface
from app.services.lineage_mapper import LineageMapper
from app.services.synthesis_core import SynthesisCore
from app.services.onboarding_service import OnboardingService
from app.services.llm_client import LLMClient, GeminiLLMClient

# Use lru_cache to create singletons for database interfaces and services
# This avoids reconnecting/reinstantiating on every request

logger = logging.getLogger(__name__)

# --- Singleton Instance Holders ---
# Use Optional typing and initialize to None
# REMOVED: _kg_interface_instance: Optional[Neo4jKnowledgeGraph] = None
# _vector_db_interface_instance: Optional[VectorDBInterface] = None
_onboarding_service_instance: Optional[OnboardingService] = None

# Global instances to reuse connections
# _graph_db_instance: Optional[GraphDBInterface] = None
# _vector_db_instance: Optional[VectorDBInterface] = None

# --- Dependency Getters ---

# REMOVED: lru_cache from get_settings temporarily
def get_settings():
    return settings

# MODIFIED get_kg_interface for debugging
def get_kg_interface() -> KnowledgeGraphInterface:
    """
    Dependency function to get an instance of Neo4jKnowledgeGraph.
    Includes robust error handling for instantiation debugging.
    """
    logger.debug("Attempting to get KG interface instance...")
    try:
        # Directly instantiate here. Neo4jKnowledgeGraph uses settings internally.
        instance = Neo4jKnowledgeGraph()
        
        # Actively verify the connection works by executing a simple query
        instance.verify_connection() # Will raise ConnectionError if it fails
        
        # Additional check if instance has the expected interface methods
        if not hasattr(instance, 'close'): # Check for a known method
             logger.error("Neo4jKnowledgeGraph instance created but seems invalid (missing 'close' method?).")
             raise HTTPException(status_code=500, detail="Knowledge Graph configuration error (instance invalid)")

        logger.debug("Successfully created and verified Neo4jKnowledgeGraph instance.")
        return instance
    except ConnectionError as e:
        # Log connection-specific errors with critical priority
        logger.critical(f"CRITICAL: Neo4j connection verification failed: {e}", exc_info=True)
        # Raise HTTPException so FastAPI knows dependency failed
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not verify Neo4j connection: {e}"
        )
    except Exception as e:
        # Log the *specific* error during instantiation
        logger.critical(f"CRITICAL: Failed to instantiate Neo4jKnowledgeGraph: {e}", exc_info=True)
        # Raise HTTPException so FastAPI knows dependency failed
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not initialize Knowledge Graph interface: {e}"
        )

@lru_cache()
def get_vector_db_interface() -> Optional[VectorDBInterface]:
    """Provides an instance of the VectorDBInterface."""
    # --- TEMPORARY BYPASS ---
    # TODO: Fix ChromaDB PersistentClient initialization issue
    logger.warning("TEMPORARY BYPASS: VectorDBInterface is disabled.")
    return None
    # --- END TEMPORARY BYPASS ---

    # Original code commented out:
    # global _vector_db_instance
    # if _vector_db_instance is None:
    #     try:
    #         # Initialize your VectorDBInterface implementation here
    #         # Example using a specific implementation like ChromaVectorDB:
    #         _vector_db_instance = ChromaVectorDB(
    #             collection_name=settings.CHROMA_COLLECTION
    #             # path=settings.CHROMA_PATH # Ensure path/settings are correct
    #         )
    #         logger.info("VectorDB instance created and assigned.")
    #     except Exception as e:
    #         logger.exception(f"Failed to initialize VectorDBInterface: {e}")
    #         # Depending on requirements, might return None or raise the exception
    #         # If the vector DB is critical for startup, raising might be appropriate.
    #         return None # Or raise?
    # return _vector_db_instance

@lru_cache()
def get_lineage_mapper() -> LineageMapper:
    """Provides a singleton instance of the Lineage Mapper."""
    return LineageMapper(
        kg_interface=get_kg_interface(),
        # vector_db_interface=get_vector_db_interface() # Removed this line
    )

@lru_cache()
def get_llm_client() -> LLMClient:
    """Provides a singleton instance of the LLM Client based on available API keys."""
    if settings.GEMINI_API_KEY:
        logger.info("Attempting to initialize GeminiLLMClient.")
        try:
            # Use GeminiLLMClient from llm_client.py directly
            return GeminiLLMClient()
        except Exception as e:
            logger.error(f"Failed to initialize GeminiLLMClient: {e}", exc_info=True)
            # Raise an exception since we want to use Gemini, not fall back to OpenAI
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Gemini LLM client configuration error: {str(e)}"
            )

    # Raise an exception if no API key is available
    logger.error("No valid LLM API key found. GEMINI_API_KEY environment variable is required.")
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="LLM service is not configured. Please set GEMINI_API_KEY."
    )

@lru_cache()
def get_synthesis_core() -> SynthesisCore:
    """Provides a singleton instance of the Synthesis Core."""
    # Modified to pass correct arguments
    return SynthesisCore(
        kg_interface=get_kg_interface(),
        vector_interface=get_vector_db_interface(), # Pass the vector interface
        llm_client=get_llm_client() # Pass the LLM client
        # lineage_mapper argument removed
    )

def get_onboarding_service() -> OnboardingService:
    """Provides an instance of the OnboardingService."""
    global _onboarding_service_instance
    if _onboarding_service_instance is None:
        # Inject dependencies if OnboardingService requires them in its __init__
        # For now, assuming it doesn't need specific instances passed at creation
        _onboarding_service_instance = OnboardingService()
    # Alternatively, just return OnboardingService() if no state needed
    # return OnboardingService()
    return _onboarding_service_instance

# --- Cleanup Function ---
# MODIFIED: No longer relies on global variable
# We might need a different approach to cleanup if we stick with direct instantiation per request,
# or re-introduce a managed singleton later. For now, this cleanup function
# won't work as intended without the global. Let's comment it out or adapt later.
logger.warning("close_kg_connection logic needs review due to dependency changes.")
# global _kg_interface_instance # Removed
# if _kg_interface_instance is not None:
#     try:
#         _kg_interface_instance.close()
#         logger.info("Neo4jKnowledgeGraph instance connection closed successfully.")
#     except Exception as e:
#         logger.error(f"Error closing Neo4jKnowledgeGraph connection: {e}")
#     finally:
#          _kg_interface_instance = None # Ensure instance is reset
# else:
#     logger.info("No active Neo4jKnowledgeGraph instance to close (due to direct instantiation).")

# Placeholder for closing other connections
# def close_vector_db_connection():
#     """
#     Closes the Vector DB connection if the instance exists.
#     """
#     global _vector_db_interface_instance
#     if _vector_db_interface_instance is not None:
#         try:
#             _vector_db_interface_instance.close() # Assuming a close method exists
#             logger.info("VectorDBInterface instance connection closed successfully.")
#         except Exception as e:
#             logger.error(f"Error closing VectorDBInterface connection: {e}")
#         finally:
#             _vector_db_interface_instance = None
#     else:
#         logger.info("No active VectorDBInterface instance to close.")

def close_kg_connection():
    """
    Closes the Neo4j driver connection if the Neo4jKnowledgeGraph instance exists.
    Intended to be called during application shutdown.
    """
    # MODIFIED: No longer relies on global variable
    # This function relies on the class method Neo4jKnowledgeGraph.close_driver()
    # which handles the singleton driver instance correctly.
    # However, calling it here might be redundant if managed elsewhere (e.g., lifespan events).
    logger.debug("Attempting to close Neo4j driver via class method.")
    try:
        # Call the class method directly, which manages the shared driver
        Neo4jKnowledgeGraph.close_driver()
        logger.info("Neo4j driver closed successfully via class method.")
    except Exception as e:
        logger.error(f"Error closing Neo4j driver via class method: {e}", exc_info=True) 