# scripts/seed_neo4j.py
import os
import json
from dotenv import load_dotenv
from neo4j import GraphDatabase
import logging
from pathlib import Path # Added for easier path handling

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password") # Replace with your password retrieval logic

# Define path relative to the script location or use absolute path
# Assuming the script is run from the workspace root or similar
# Adjust the path as necessary based on your project structure
SEED_DATA_PATH = Path("./backend/data/seed_concepts_llm_generated.json")

# Relationship types from your JSON (ensure these match your ontology if needed)
# You might want to import these from your ontology definition eventually
# RELATIONSHIP_TYPES = {...} # Example if validation is needed

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

def clear_database(driver):
    """Removes all nodes and relationships from the database."""
    try:
        with driver.session() as session:
            logging.info("Clearing existing database...")
            session.run("MATCH (n) DETACH DELETE n")
            # Optional: Remove constraints if they exist
            # try: session.run("DROP CONSTRAINT unique_node_id")
            # except: logging.warning("Constraint unique_node_id not found or couldn't be dropped.")
            logging.info("Database cleared.")
    except Exception as e:
        logging.error(f"Error clearing database: {e}")
        raise

def create_constraints(driver, seed_data):
    """Creates constraints based on node types found in the data."""
    node_types = set(item['type'] for item in seed_data if 'type' in item)
    try:
        with driver.session() as session:
            for node_type in node_types:
                constraint_name = f"unique_{node_type.lower()}_id"
                query = f"CREATE CONSTRAINT {constraint_name} IF NOT EXISTS FOR (n:{node_type}) REQUIRE n.id IS UNIQUE"
                session.run(query)
                logging.info(f"Ensured constraint exists for type: {node_type}")
    except Exception as e:
        logging.error(f"Error creating constraints: {e}")
        # Decide if this is fatal or not; depends on if you cleared the DB
        # raise

def create_nodes_and_relationships(driver, seed_data):
    """Creates nodes and relationships from the loaded seed data."""
    try:
        with driver.session() as session:
            logging.info(f"Processing {len(seed_data)} items for nodes and relationships...")
            node_count = 0
            rel_count = 0

            # Create Nodes first
            for item in seed_data:
                node_id = item.get('id')
                node_type = item.get('type')
                properties = item.get('properties', {})

                if not node_id or not node_type:
                    logging.warning(f"Skipping item due to missing id or type: {item}")
                    continue

                # Ensure properties are suitable for Cypher parameters (e.g., no nested dicts directly)
                # Flatten or handle specific complex properties if needed
                params = {'id': node_id, 'type': node_type}
                params.update(properties) # Add all properties from the JSON

                # Use MERGE to avoid duplicates, set properties on create/match
                query = (
                    f"MERGE (n:{node_type} {{id: $id}}) "
                    "SET n = $params " # Overwrite properties on match/create
                    "RETURN n"
                )
                session.run(query, id=node_id, params=params)
                node_count += 1

            logging.info(f"Processed {node_count} nodes.")

            # Create Relationships second
            for item in seed_data:
                source_id = item.get('id')
                relationships = item.get('relationships', [])

                if not source_id:
                    continue # Should have been caught above, but safety check

                for rel in relationships:
                    target_id = rel.get('target_id')
                    rel_type = rel.get('type')
                    # rel_props = rel.get('properties', {}) # Add if relationships have properties

                    if not target_id or not rel_type:
                        logging.warning(f"Skipping relationship due to missing target_id or type: {rel} for source {source_id}")
                        continue

                    # MATCH nodes by ID (assuming they exist after node creation pass)
                    # Use the relationship type directly from the JSON
                    # Ensure rel_type is a valid Cypher relationship type string
                    rel_type_sanitized = "".join(c for c in rel_type if c.isalnum() or c == '_') # Basic sanitization

                    query = (
                        f"MATCH (a {{id: $source_id}}), (b {{id: $target_id}}) "
                        f"MERGE (a)-[r:{rel_type_sanitized}]->(b) "
                        # If relationships have properties: "SET r = $rel_props"
                    )
                    session.run(query, source_id=source_id, target_id=target_id) # Add rel_props=rel_props if needed
                    rel_count += 1

            logging.info(f"Processed {rel_count} relationships.")

    except Exception as e:
        logging.error(f"Error during node/relationship creation: {e}")
        import traceback
        traceback.print_exc()
        raise


def main():
    """Main function to connect and seed the database."""
    driver = None
    try:
        seed_data = load_seed_data(SEED_DATA_PATH)
        if not seed_data:
            return # Stop if data loading failed

        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
        logging.info(f"Connected to Neo4j at {NEO4J_URI}")

        # --- Choose whether to clear DB ---
        clear_database(driver) # Recommended when re-seeding from scratch

        # --- Create Constraints ---
        # Create constraints *after* clearing and *before* adding data
        create_constraints(driver, seed_data)

        # --- Create Nodes and Relationships ---
        create_nodes_and_relationships(driver, seed_data)

        logging.info("Neo4j seeding completed successfully.")

    except Exception as e:
        logging.error(f"An error occurred during Neo4j seeding: {e}")
    finally:
        if driver:
            driver.close()
            logging.info("Neo4j connection closed.")

if __name__ == "__main__":
    main() 