import chromadb
from chromadb.config import Settings as ChromaSDKSettings
import os
import shutil # For reliably deleting the test directory
import logging

# Configure basic logging for this script
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration for this test script ---
TEST_CHROMA_PATH = "./chroma_data_temp_test" # Relative to where the script is run (backend/)
# --- ---

def main():
    logger.info("--- Starting ChromaDB Local Persistence Test ---")

    # --- START CODE BLOCK TO VERIFY/ADD ---
    logger.info("Checking for ChromaDB related environment variables:")
    chroma_env_vars = [
        "CHROMA_API_IMPL",
        "CHROMA_SERVER_HOST",
        "CHROMA_SERVER_HTTP_PORT",
        "CHROMA_SERVER_GRPC_PORT",
        "CHROMA_SERVER_CORS_ALLOW_ORIGINS",
        "CHROMA_DB_IMPL",
        "PERSIST_DIRECTORY",
        "CHROMA_SETTINGS_FILE"
    ]
    for var in chroma_env_vars:
        value = os.environ.get(var)
        if value:
            logger.info(f"Found ENV VAR: {var} = {value}")
        else:
            logger.info(f"ENV VAR not set: {var}")
    logger.info("--- Finished checking environment variables ---")
    # --- END CODE BLOCK TO VERIFY/ADD ---

    # 1. Ensure a clean state for the test path
    logger.info(f"Checking for existing test directory: {os.path.abspath(TEST_CHROMA_PATH)}")
    if os.path.exists(TEST_CHROMA_PATH):
        logger.info(f"Found existing test directory. Deleting it: {os.path.abspath(TEST_CHROMA_PATH)}")
        try:
            shutil.rmtree(TEST_CHROMA_PATH)
            logger.info(f"Successfully deleted: {os.path.abspath(TEST_CHROMA_PATH)}")
        except Exception as e:
            logger.error(f"Error deleting {os.path.abspath(TEST_CHROMA_PATH)}: {e}. Please delete it manually and retry.", exc_info=True)
            return
    else:
        logger.info(f"Test directory {os.path.abspath(TEST_CHROMA_PATH)} does not exist. Good.")

    # 2. Attempt to initialize PersistentClient
    logger.info(f"Attempting chromadb.PersistentClient initialization at: {os.path.abspath(TEST_CHROMA_PATH)}")
    try:
        # Explicit module existence check for debugging
        try:
            logger.info("Checking for chromadb module contents...")
            import inspect
            from chromadb.api import segment
            logger.info(f"ChromaDB API segment module: {segment}")
            if hasattr(segment, 'SegmentAPI'):
                logger.info("SegmentAPI class exists in the module")
            else:
                logger.info("WARNING: SegmentAPI class NOT found in the module")
        except ImportError as e:
            logger.error(f"ImportError checking module contents: {e}")
        except Exception as import_check_e:
            logger.error(f"Exception checking module contents: {import_check_e}")

        logger.info("Creating ChromaSDKSettings...")
        chroma_settings_for_test = ChromaSDKSettings()
        chroma_settings_for_test.is_persistent = True
        chroma_settings_for_test.persist_directory = TEST_CHROMA_PATH # Explicit
        
        # THE CRUCIAL LINE WE ARE TESTING
        logger.info("Setting chroma_api_impl...")
        # Original setting that was commented out:
        chroma_settings_for_test.chroma_api_impl = "chromadb.api.segment.SegmentAPI"
        
        # Previously tried FastAPI implementation that caused issues:
        # chroma_settings_for_test.chroma_api_impl = "chromadb.api.fastapi.FastAPI"
        logger.info(f"chroma_api_impl set to: {chroma_settings_for_test.chroma_api_impl}")
        
        # Ensure other server/client related settings are defaults or off
        chroma_settings_for_test.chroma_server_host = None
        chroma_settings_for_test.chroma_server_http_port = None

        logger.info(f"Using chroma_api_impl: {chroma_settings_for_test.chroma_api_impl} for PersistentClient initialization.")
        logger.info("About to initialize PersistentClient...")
        client = chromadb.PersistentClient(
            path=TEST_CHROMA_PATH, 
            settings=chroma_settings_for_test
        )
        logger.info("SUCCESS: chromadb.PersistentClient initialized successfully!")

        # 3. Test collection creation and usage
        collection_name = "my_test_collection"
        logger.info(f"Attempting to get or create collection: {collection_name}")
        collection = client.get_or_create_collection(name=collection_name)
        logger.info(f"SUCCESS: Collection '{collection.name}' obtained/created.")

        logger.info("Attempting to add a document...")
        collection.add(
            ids=["id1"],
            documents=["This is a test document"],
            metadatas=[{"source": "test"}]
        )
        logger.info("SUCCESS: Document added to collection.")
        item_count = collection.count()
        logger.info(f"Collection now has {item_count} item(s).")

        logger.info("Attempting to query the document...")
        results = collection.query(
            query_texts=["test document"],
            n_results=1
        )
        logger.info(f"SUCCESS: Query executed. Results: {results}")

    except RuntimeError as e:
        if "http-only client mode" in str(e):
            logger.error(f">>> TEST FAILED WITH THE SAME RUNTIME ERROR: {e}", exc_info=True)
        else:
            logger.error(f">>> TEST FAILED with a RuntimeError: {e}", exc_info=True)
    except Exception as e:
        logger.error(f">>> TEST FAILED with an unexpected error: {e}", exc_info=True)
    
    logger.info("--- ChromaDB Local Persistence Test Finished ---")

if __name__ == "__main__":
    main() 