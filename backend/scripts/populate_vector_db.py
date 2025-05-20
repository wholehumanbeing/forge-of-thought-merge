import os
import sys
import json
import logging
from dotenv import load_dotenv

# Configure logging - increase to DEBUG level
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(name)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the backend directory to the Python path
# This allows importing modules from 'app' when running the script from the workspace root
workspace_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
backend_path = os.path.join(workspace_root, 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

try:
    from app.db.vector_db_interface import VectorDBInterface, ChromaVectorDB
    from app.core.config import settings
except ImportError as e:
    logger.error(f"Error importing modules: {e}")
    logger.error("Please ensure the script is run from the workspace root or adjust the path.")
    sys.exit(1)

# Define the path to the data file relative to this script's location
DATA_FILE_PATH = os.path.join(os.path.dirname(__file__), "../data/seed_concepts_llm_generated.json")

def populate_vector_database_from_json(data_file: str):
    """
    Loads concepts from a JSON file and populates the Vector DB
    with their embeddings.
    """
    logger.info("Starting Vector DB population process from JSON...")

    # Load environment variables from .env file in the workspace root
    # Needed for potential API keys used by SentenceTransformer or future extensions
    dotenv_path = os.path.join(workspace_root, '.env')
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path=dotenv_path)
        logger.info(f"Loaded environment variables from: {dotenv_path}")
    else:
        logger.warning(f"Environment file not found at: {dotenv_path}. Proceeding without it.")

    vdb_interface = None

    try:
        # Load data from JSON file
        logger.info(f"Loading data from: {data_file}")
        try:
            with open(data_file, 'r', encoding='utf-8') as f:
                concepts_data = json.load(f)
            logger.info(f"Successfully loaded {len(concepts_data)} items from JSON.")
        except FileNotFoundError:
            logger.error(f"Data file not found: {data_file}")
            return
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding JSON from {data_file}: {e}")
            return
        except Exception as e:
            logger.error(f"An unexpected error occurred loading {data_file}: {e}")
            return

        # Initialize Vector DB Interface
        logger.info("Initializing Vector DB Interface (ChromaDB)...")
        # Ensure collection name matches the one used elsewhere (e.g., from settings)
        collection_name = getattr(settings, 'CHROMA_DEFAULT_COLLECTION', 'concepts')

        try:
            # Instantiate the concrete ChromaVectorDB class, passing only collection_name
            vdb_interface = ChromaVectorDB(
                collection_name=collection_name
            )
            
            # Add diagnostics about the client
            logger.debug(f"ChromaDB Client Type: {type(vdb_interface._client)}")
            logger.debug(f"ChromaDB Client API Impl: {vdb_interface._client._settings.chroma_api_impl if hasattr(vdb_interface._client, '_settings') else 'unknown'}")
            logger.debug(f"ChromaDB Collection Type: {type(vdb_interface._collection)}")
            
            # Check if the collection was successfully initialized within the constructor
            if not vdb_interface._collection: # Access internal state cautiously or rely on logs/exceptions from init
                 logger.error("ChromaDB collection could not be initialized. Aborting.")
                 return
            else:
                 logger.info(f"ChromaDB interface initialized. Collection: '{vdb_interface._collection.name}' ready.")
                 # Note: Accessing _collection directly is not ideal OOP, but necessary if no public getter exists.
                 # Consider adding a `get_collection()` method to ChromaVectorDB if needed frequently outside.

        except Exception as e:
            logger.error(f"Failed to initialize ChromaVectorDB: {e}", exc_info=True)
            return

        # Prepare data for batch upsert
        ids_to_upsert = []
        documents_to_upsert = []
        metadatas_to_upsert = []
        processed_count = 0
        skipped_count = 0

        logger.info(f"Processing {len(concepts_data)} concepts for embedding...")
        for item in concepts_data:
            try:
                ki_id = item.get('id')
                node_type = item.get('type')
                properties = item.get('properties', {})
                name = properties.get('name')
                description = properties.get('description', '')

                if not ki_id or not node_type or not name:
                    logger.warning(f"Skipping item due to missing id, type, or name: {item}")
                    skipped_count += 1
                    continue

                # Construct text for embedding
                text_to_embed = f"{name}. {description}".strip()
                if not text_to_embed or text_to_embed == '.':
                     logger.warning(f"Skipping item {ki_id} due to empty text for embedding.")
                     skipped_count += 1
                     continue

                # Embedding generation is now handled by ChromaDB during upsert
                # embedding = vdb_interface.embedding_model.encode(text_to_embed).tolist() # REMOVE THIS LINE

                # Prepare metadata
                metadata = {
                    "ki_id": ki_id, # Keep ki_id for consistency if used elsewhere
                    "node_type": node_type,
                    "name": name,
                    "description": description # Add description to metadata
                }
                if 'domain' in properties:
                    metadata['domain'] = properties['domain']
                # Add any other relevant properties if needed

                # Add to batch lists
                ids_to_upsert.append(ki_id)
                # embeddings_to_upsert.append(embedding) # REMOVE THIS LINE
                documents_to_upsert.append(text_to_embed) # Add the document text instead of embedding
                metadatas_to_upsert.append(metadata)
                processed_count += 1
                # logger.debug(f"Prepared embedding for: {ki_id}") # Use debug level for per-item success

            except Exception as e:
                logger.error(f"Error processing item {item.get('id', 'N/A')}: {e}", exc_info=True)
                skipped_count += 1

        # Perform batch upsert
        if ids_to_upsert:
            logger.info(f"Upserting {len(ids_to_upsert)} documents into ChromaDB (embeddings will be generated by DB)..")
            try:
                # Upsert using documents; ChromaDB's configured embedding function will handle embedding generation
                vdb_interface._collection.upsert( # Use the collection object obtained during init
                    ids=ids_to_upsert,
                    documents=documents_to_upsert, # Pass documents, not pre-computed embeddings
                    metadatas=metadatas_to_upsert
                )
                logger.info(f"Successfully upserted {len(ids_to_upsert)} documents.")
            except Exception as e:
                 logger.error(f"Error during batch upsert to ChromaDB: {e}", exc_info=True)
                 # Optionally, implement retry logic or handle partial failures if needed
        else:
            logger.info("No valid embeddings generated to upsert.")

        logger.info(f"Population summary:")
        logger.info(f"  Processed and prepared for upsert: {processed_count}")
        logger.info(f"  Skipped due to missing data or errors: {skipped_count}")
        logger.info(f"  Successfully upserted: {len(ids_to_upsert) if ids_to_upsert else 0}")

    except Exception as e:
        logger.error(f"An critical error occurred during the population process: {e}", exc_info=True)
    finally:
        # ChromaDB client doesn't typically require explicit close for PersistentClient based on http client
        # vdb_interface cleanup might happen in its destructor if needed, but usually not required here.
        logger.info("Vector DB population process finished.")

if __name__ == "__main__":
    # Ensure the data file path is correct relative to the script execution location
    populate_vector_database_from_json(DATA_FILE_PATH) 