# NOTE TO DEVELOPER: If your editor (like VS Code/Cursor with Pylance)
# shows errors like "Import 'chromadb' could not be resolved",
# ensure you have selected the correct Python Interpreter for this project.
# Use the Command Palette (Ctrl+Shift+P) and search for "Python: Select Interpreter",
# then choose the interpreter located inside your 'backend/.venv/' (or similar)
# virtual environment directory (e.g., ./backend/.venv/Scripts/python.exe).
# This allows the editor's language server to find packages installed in the venv.
# You must also have run `pip install chromadb chromadb-client` in the activated venv.

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, Union, Tuple

import chromadb
from chromadb.config import Settings as ChromaSDKSettings  # Import correct Settings class

import chromadb.utils.embedding_functions as embedding_functions
import logging
from app.core.config import settings # Import settings

# Remove LineageItem import since we're returning Dict instead
# from app.models.data_models import LineageItem
# Remove NodeType import since we won't be using it directly
# from app.models.ki_ontology import NodeType


logger = logging.getLogger(__name__)

class VectorDBInterface(ABC):
    """Abstract base class for Vector Database operations."""

    @abstractmethod
    def find_similar_concepts(self, query_text: str, k: int = 5) -> List[Dict[str, Any]]:
        """Finds k most similar concepts to the given text.
        
        Returns:
            List of dictionaries with at minimum 'ki_id', 'label', and 'similarity' keys.
        """
        pass

    @abstractmethod
    def find_similar(self, query_text: str, n_results: int = 5, filter_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Finds items similar to the query text in the vector database.
        
        This method directly exposes the raw vector search results in ChromaDB format,
        which can be useful for more advanced processing or when the full result structure
        is needed (e.g., for batch processing or custom distance calculations).
        
        Args:
            query_text: The text to find similar items for
            n_results: Maximum number of results to return
            filter_metadata: Optional metadata filter to apply to the search
            
        Returns:
            Dictionary with raw ChromaDB response format containing 'ids', 'distances',
            'metadatas', and other fields as returned by the underlying vector DB.
        """
        pass

    @abstractmethod
    def add_concept_embedding(self, concept_id: str, text_for_embedding: str, metadata: dict) -> bool:
        """Adds or updates an embedding for a concept in the vector database.
        
        Args:
            concept_id: Unique identifier for the concept
            text_for_embedding: Text to generate embedding from
            metadata: Additional metadata to store with the embedding
            
        Returns:
            bool: True if successful, False otherwise
        """
        pass

class ChromaVectorDB(VectorDBInterface):
    """ChromaDB implementation for the Vector Database Interface."""

    def __init__(self, collection_name: Optional[str] = None):
        self._client = None
        self._collection = None
        self._embedding_model = None
        # Use collection name from settings if not provided, else use provided name
        self.collection_name = collection_name if collection_name is not None else settings.CHROMA_DEFAULT_COLLECTION

        # Initialize SentenceTransformer model for when get_embedding is called directly
        try:
            model_name = settings.EMBEDDING_MODEL_NAME
            from sentence_transformers import SentenceTransformer
            self._embedding_model = SentenceTransformer(model_name)
            logger.info(f"Successfully loaded SentenceTransformer model: {model_name}")
        except Exception as e:
            logger.error(f"Failed to load SentenceTransformer model: {e}", exc_info=True)
            raise

        try:
            logger.info(f"Initializing ChromaDB HttpClient to connect to: http://{settings.CHROMA_SERVER_HOST}:{settings.CHROMA_SERVER_HTTP_PORT}")
            
            # For HttpClient, we use minimal settings as the server handles most configuration
            client_settings = ChromaSDKSettings()
            # Optional tenant/database settings if needed:
            # client_settings.chroma_default_tenant = "my_tenant"
            # client_settings.chroma_default_database = "my_database"

            self._client = chromadb.HttpClient(
                host=settings.CHROMA_SERVER_HOST,
                port=settings.CHROMA_SERVER_HTTP_PORT,
                settings=client_settings
            )
            
            # Check if server is reachable
            logger.info("Attempting to ping ChromaDB server...")
            self._client.heartbeat()
            logger.info("ChromaDB server is reachable.")

            # Setup embedding function
            chroma_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name=settings.EMBEDDING_MODEL_NAME
            )
            
            # Get or create collection
            logger.info(f"Getting or creating ChromaDB collection: '{self.collection_name}'")
            self._collection = self._client.get_or_create_collection(
                name=self.collection_name,
                embedding_function=chroma_ef
            )
            logger.info(f"ChromaDB collection '{self.collection_name}' via HttpClient is ready.")

        except ConnectionRefusedError:
            logger.error(f"Connection refused when trying to connect to ChromaDB server at http://{settings.CHROMA_SERVER_HOST}:{settings.CHROMA_SERVER_HTTP_PORT}. Is the server running?", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"An error occurred during ChromaDB HttpClient initialization: {e}", exc_info=True)
            raise

    def find_similar(self, query_text: str, n_results: int = 5, filter_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Direct method to find similar items in the ChromaDB collection and return the raw results.
        
        Args:
            query_text: The text to query for
            n_results: Maximum number of results to return
            filter_metadata: Optional filter to apply to the query
            
        Returns:
            Dictionary with ChromaDB response format containing 'ids', 'distances', 'metadatas', etc.
        """
        if not self._collection:
            logger.error("ChromaDB collection is not initialized. Cannot perform query.")
            return {"ids": [[]], "distances": [[]], "metadatas": [[]]}

        logger.debug(f"Querying ChromaDB collection '{self.collection_name}' for text: '{query_text[:50]}...', n={n_results}")

        try:
            results = self._collection.query(
                query_texts=[query_text],
                n_results=n_results,
                include=["metadatas", "distances"],
                where=filter_metadata
            )
            
            logger.debug(f"Raw ChromaDB query returned {len(results.get('ids', [[]])[0]) if results and results.get('ids') else 0} results")
            return results
            
        except Exception as e:
            logger.error(f"Error in direct ChromaDB query: {e}", exc_info=True)
            return {"ids": [[]], "distances": [[]], "metadatas": [[]]}

    def add_concept_embedding(self, concept_id: str, text_for_embedding: str, metadata: dict) -> bool:
        """Adds or updates a concept embedding in the ChromaDB collection.
        
        Args:
            concept_id: The unique identifier for the concept
            text_for_embedding: The text to generate an embedding from
            metadata: Additional metadata to store with the embedding
        
        Returns:
            bool: True if successful, False otherwise
        """
        if not self._collection:
            logger.error(f"Cannot add embedding for concept '{concept_id}': ChromaDB collection is not initialized.")
            return False
            
        try:
            # Ensure metadata has consistent naming with what find_similar_concepts expects
            enhanced_metadata = metadata.copy()
            # Add concept_id and concept_name keys for compatibility
            enhanced_metadata["concept_id"] = concept_id
            enhanced_metadata["ki_id"] = concept_id  # Ensure ki_id is always present
            if "label" in metadata and "concept_name" not in enhanced_metadata:
                enhanced_metadata["concept_name"] = metadata["label"]
                
            logger.debug(f"Adding/updating embedding for concept ID '{concept_id}'")
            
            # Using upsert to add or update based on ID
            self._collection.upsert(
                ids=[concept_id],
                documents=[text_for_embedding],
                metadatas=[enhanced_metadata]
            )
            logger.info(f"Successfully added/updated embedding for concept ID '{concept_id}'")
            return True
            
        except Exception as e:
            logger.error(f"Error adding/updating embedding for concept ID '{concept_id}': {e}", exc_info=True)
            return False

    def find_similar_concepts(self, query_text: str, k: int = 5) -> List[Dict[str, Any]]:
        if not self._collection:
            logger.error("ChromaDB collection is not initialized. Cannot perform query.")
            return []

        logger.debug(f"Querying ChromaDB collection '{self.collection_name}' for text: '{query_text[:50]}...', k={k}")

        try:
            results = self._collection.query(
                query_texts=[query_text],
                n_results=k,
                include=["metadatas", "distances"] # Assuming metadata contains id and name
            )
            logger.debug(f"Received {len(results.get('ids', [[]])[0]) if results else 0} results from ChromaDB query.")

            resonances = []
            # Check if results dictionary and essential keys exist and are not empty
            if results and results.get('ids') and results['ids'][0]:
                ids = results['ids'][0]
                # Safely get metadatas and distances, providing defaults
                metadatas = results.get('metadatas', [[]])[0] if results.get('metadatas') else [{}] * len(ids)
                distances = results.get('distances', [[]])[0] if results.get('distances') else [None] * len(ids)

                for i, item_id in enumerate(ids):
                    metadata = metadatas[i] if i < len(metadatas) else {}
                    distance = distances[i] if i < len(distances) else None
                    
                    # Ensure metadata is a dict
                    if not isinstance(metadata, dict):
                        logger.warning(f"Invalid metadata format for item ID {item_id}: {metadata}. Skipping.")
                        continue

                    # Support both naming conventions in metadata
                    concept_id = metadata.get('concept_id', metadata.get('ki_id', item_id))
                    concept_name = metadata.get('concept_name', metadata.get('label', 'Unknown Concept'))

                    # Calculate similarity score based on distance
                    similarity_score = self._calculate_similarity_from_distance(distance)

                    # Create a dictionary with standardized keys
                    resonances.append({
                        "ki_id": str(concept_id),
                        "label": str(concept_name),
                        "similarity": similarity_score,
                        "description": metadata.get('description', ''),
                        "metadata": metadata
                    })
                logger.info(f"Successfully processed {len(resonances)} semantic resonances from ChromaDB query.")
            return resonances
            
        except Exception as e:
            logger.error(f"Error in ChromaDB query for similar concepts: {e}", exc_info=True)
            return []
            
    def _calculate_similarity_from_distance(self, distance: Optional[float]) -> float:
        """
        Converts a distance value from ChromaDB to a similarity score.
        
        Args:
            distance: The distance value, typically between 0 and 2 for cosine distance
                     
        Returns:
            A similarity score between 0 and 1, where 1 is most similar
        """
        if distance is None:
            return 0.0
            
        # For cosine distance:
        # distance = 1 - similarity, so similarity = 1 - distance
        # Distance range depends on the exact distance metric used by the embedding space
        return max(0.0, min(1.0, 1.0 - distance))
        # max/min ensures value is within [0,1] even if distance calculation is weird

# Example usage (requires ChromaDB instance running)
# if __name__ == '__main__':
#     # Replace with actual config/secrets management
#     CHROMA_HOST = "localhost"
#     CHROMA_PORT = 8000
#     CHROMA_COLLECTION = "concepts" # Make sure this collection exists and has data
#
#     vector_db = ChromaVectorDB(host=CHROMA_HOST, port=CHROMA_PORT, collection_name=CHROMA_COLLECTION)
#
    # # Dummy data addition (if collection is empty)
    # try:
    #     if vector_db._collection and vector_db._collection.count() == 0:
    #         print("Adding dummy data to Chroma...")
    #         vector_db._collection.add(
    #             documents=["The idea of subjective experience", "The concept of logical deduction", "The principle of causality"],
    #             metadatas=[{"concept_id": "c1", "concept_name": "Qualia"}, {"concept_id": "c2", "concept_name": "Logic"}, {"concept_id": "c3", "concept_name": "Causality"}],
    #             ids=["id1", "id2", "id3"]
    #         )
    #         print("Dummy data added.")
    # except Exception as e:
    #     print(f"Error adding dummy data: {e}")
    #
    # # Example Query
    # query = "What is the nature of consciousness?"
    # print(f"\nFinding similar concepts for: '{query}'")
    # similar = vector_db.find_similar_concepts(query, k=3)
    #
    # if similar:
    #     print("\nFound Resonances:")
    #     for res in similar:
    #         # Update to match the dictionary fields
    #         print(f"  - {res['label']} (ID: {res['ki_id']}), Score: {res['similarity']:.4f}")
    # else:
    #     print("\nNo similar concepts found or error occurred.") 