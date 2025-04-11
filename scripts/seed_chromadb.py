# scripts/seed_chromadb.py
import os
import json
import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv
import logging
from pathlib import Path # Added for easier path handling

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()

CHROMADB_PATH = os.getenv("CHROMADB_PATH", "./chroma_data")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2") # Match model in vector_db_interface.py
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "knowledge_elements") # Use a consistent collection name

# Define path relative to the script location or use absolute path
SEED_DATA_PATH = Path("./backend/data/seed_concepts_llm_generated.json")

# --- Seeding Logic ---
def load_seed_data(file_path: Path) -> list:
    """Loads seed data from the JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            logging.info(f"Successfully loaded {len(data)} items from {file_path}")
            return data
    except FileNotFoundError:
        logging.error(f"Seed data file not found at {file_path}")
        raise
    except json.JSONDecodeError:
        logging.error(f"Error decoding JSON from {file_path}")
        raise
    except Exception as e:
        logging.error(f"An error occurred loading seed data: {e}")
        raise

def main():
    """Main function to connect and seed the ChromaDB database."""
    try:
        seed_data = load_seed_data(SEED_DATA_PATH)
        if not seed_data:
            return # Stop if data loading failed

        logging.info(f"Initializing ChromaDB client at path: {CHROMADB_PATH}")
        os.makedirs(CHROMADB_PATH, exist_ok=True) # Ensure directory exists
        chroma_client = chromadb.PersistentClient(path=CHROMADB_PATH)

        logging.info(f"Using embedding model: {EMBEDDING_MODEL_NAME}")
        sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL_NAME
        )

        # Optional: Delete existing collection for a clean seed
        try:
            logging.warning(f"Attempting to delete existing collection: {COLLECTION_NAME}")
            chroma_client.delete_collection(name=COLLECTION_NAME)
            logging.info(f"Collection '{COLLECTION_NAME}' deleted.")
        except Exception as e:
            logging.info(f"Collection '{COLLECTION_NAME}' not found or could not be deleted (might be intended): {e}")


        logging.info(f"Getting or creating collection: {COLLECTION_NAME}")
        collection = chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=sentence_transformer_ef,
            # metadata={"hnsw:space": "cosine"} # Example
        )

        logging.info(f"Preparing data for {len(seed_data)} items...")
        ids = []
        documents = []
        metadatas = []

        for item in seed_data:
            item_id = item.get('id')
            item_type = item.get('type')
            properties = item.get('properties', {})
            name = properties.get('name')
            description = properties.get('description', '')

            if not item_id or not item_type or not name:
                logging.warning(f"Skipping item due to missing id, type, or name: {item}")
                continue

            ids.append(item_id)
            # Combine name and description for embedding
            doc_text = f"{name}: {description}"
            documents.append(doc_text)

            # Prepare metadata - include essential fields for filtering/identification
            meta = {
                "id": item_id,
                "name": name,
                "type": item_type,
                "description": description,
            }
            # Add other properties if they exist and are simple types (str, int, float)
            for key, value in properties.items():
                 if key not in ['name', 'description'] and isinstance(value, (str, int, float, bool)):
                     meta[key] = value
                 elif isinstance(value, list) and all(isinstance(x, str) for x in value): # Handle simple list of strings like aliases
                     meta[key] = ", ".join(value) # Convert list to comma-separated string

            metadatas.append(meta)

        logging.info(f"Adding {len(ids)} documents to ChromaDB collection '{COLLECTION_NAME}'...")
        if ids:
            # Add in batches if dataset becomes very large
            batch_size = 100 # Adjust as needed
            for i in range(0, len(ids), batch_size):
                batch_ids = ids[i:i + batch_size]
                batch_documents = documents[i:i + batch_size]
                batch_metadatas = metadatas[i:i + batch_size]
                collection.add(
                    ids=batch_ids,
                    documents=batch_documents,
                    metadatas=batch_metadatas
                )
                logging.info(f"Added batch {i//batch_size + 1}...")

            logging.info("Data added to ChromaDB successfully.")
        else:
            logging.info("No valid data found in the JSON to add.")

    except Exception as e:
        logging.error(f"An error occurred during ChromaDB seeding: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 