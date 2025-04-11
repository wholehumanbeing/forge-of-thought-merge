import logging
import sys
import os
from pathlib import Path
import json
import neo4j # Renamed import for clarity within this script context
# Use neo4j instead of GraphDatabase directly to align with exception handling below.

# Add the project root to the Python path
# This allows importing modules from the 'app' directory
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

# Now we can import from app.core, app.db and app.models
try:
    from app.core.config import settings # Import settings from config
    from app.models.ki_ontology import NodeType, RelationshipType
except ImportError as e:
    print(f"Error importing project modules: {e}")
    print(f"Ensure the script is run from the 'backend' directory or the project root is in PYTHONPATH.")
    print(f"Current sys.path: {sys.path}")
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
# REMOVED direct os.environ.get calls for Neo4j - now using settings
# Define the path to the data file relative to this script's location
DATA_FILE = Path(__file__).resolve().parent / "../data/seed_concepts_llm_generated.json"

# --- Helper Functions ---

def add_node(tx, node_id: str, node_type: NodeType, properties: dict):
    """
    Adds or updates a node in Neo4j using MERGE.
    Uses the node_id for merging and sets the label based on node_type.
    """
    # Use MERGE based on 'id' property. Set label and properties on create/match.
    # Note: This assumes 'id' is the unique identifier.
    # We use SET n:` + node_type.value + ` to set the label dynamically.
    # We also add a generic _Node label for potential cross-type queries if needed.
    query = (
        f"MERGE (n {{id: $node_id}}) "
        f"ON CREATE SET n :{node_type.value}, n += $properties, n._Node = true, n.created_at = timestamp() "
        f"ON MATCH SET n :{node_type.value}, n += $properties, n._Node = true, n.updated_at = timestamp() "
        "RETURN n"
    )
    tx.run(query, node_id=node_id, properties=properties)

def add_relationship(tx, start_node_id: str, end_node_id: str, relationship_type: RelationshipType, properties: dict):
    """
    Adds or updates a relationship between two nodes using MERGE.
    Matches nodes based on 'id'.
    """
    # Use MERGE to create the relationship if it doesn't exist between the specified nodes.
    # Match nodes by their 'id' property.
    query = (
        "MATCH (start_node {id: $start_node_id}), (end_node {id: $end_node_id}) "
        f"MERGE (start_node)-[r:{relationship_type.value}]->(end_node) "
        "ON CREATE SET r = $properties, r.created_at = timestamp() "
        "ON MATCH SET r += $properties, r.updated_at = timestamp() " # Update properties if relationship exists
        "RETURN type(r)"
    )
    tx.run(query, start_node_id=start_node_id, end_node_id=end_node_id, properties=properties)

def create_constraints(tx):
    """
    Ensures necessary constraints and indices exist in the database.
    """
    logger.info("Ensuring constraints and indices exist...")
    # Generic constraint for all nodes managed by this script (if using _Node label)
    tx.run("CREATE CONSTRAINT unique_node_internal_id IF NOT EXISTS FOR (n:_Node) REQUIRE n.id IS UNIQUE")

    primary_types = [NodeType.CONCEPT, NodeType.THINKER, NodeType.WORK, NodeType.SCHOOL_OF_THOUGHT, NodeType.ARCHETYPE, NodeType.SYMBOL, NodeType.MYTH] # Added missing types
    for node_type_enum in primary_types:
         tx.run(f"CREATE CONSTRAINT unique_{node_type_enum.value.lower()}_id IF NOT EXISTS FOR (n:{node_type_enum.value}) REQUIRE n.id IS UNIQUE")

    logger.info("Constraints and indices checked/created.")


# --- Main Execution Block ---

if __name__ == "__main__":
    logger.info(f"Starting Neo4j population script using data from: {DATA_FILE}")

    driver = None # Initialize driver to None
    try:
        # Load data from JSON file first
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                concepts_data = json.load(f)
            logger.info(f"Successfully loaded {len(concepts_data)} items from {DATA_FILE}")
        except FileNotFoundError:
            logger.error(f"Data file not found: {DATA_FILE}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding JSON from {DATA_FILE}: {e}")
            sys.exit(1)
        except Exception as e:
            logger.error(f"An unexpected error occurred loading data: {e}", exc_info=True)
            sys.exit(1)

        # Establish connection to Neo4j using settings
        logger.info(f"Attempting to connect to Neo4j at URI: {settings.NEO4J_URI}")
        # Use neo4j.GraphDatabase.driver explicitly
        driver = neo4j.GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD) # Assuming password is plain string, adjust if SecretStr
            # If NEO4J_PASSWORD is a pydantic SecretStr, use: settings.NEO4J_PASSWORD.get_secret_value()
        )

        # Verify connectivity AFTER creating the driver instance
        logger.info("Verifying Neo4j connectivity...")
        driver.verify_connectivity()
        logger.info("Neo4j connectivity verified.")

        # --- Populate Database ---
        # Use the specified database from settings
        with driver.session(database=settings.NEO4J_DATABASE) as session:
            # Create constraints and indices first
            logger.info(f"Applying constraints to database '{settings.NEO4J_DATABASE}'...")
            session.execute_write(create_constraints)
            logger.info("Constraints applied.")

            # --- Populate Nodes ---
            logger.info("Starting node population...")
            nodes_processed = 0
            nodes_failed = 0
            # Node creation loop (reusing existing logic, just nested)
            for item in concepts_data:
                try:
                    node_id = item.get('id')
                    node_type_str = item.get('type')
                    properties = item.get('properties', {})

                    if not node_id or not node_type_str:
                        logger.warning(f"Skipping item due to missing 'id' or 'type': {item.get('id', 'N/A')}")
                        nodes_failed += 1
                        continue

                    try:
                        node_type_enum = NodeType(node_type_str)
                    except ValueError:
                        logger.error(f"Invalid NodeType '{node_type_str}' for node ID '{node_id}'. Skipping node.")
                        nodes_failed += 1
                        continue

                    session.execute_write(add_node, node_id=node_id, node_type=node_type_enum, properties=properties)
                    # logger.debug(f"Processed node: {node_id} ({node_type_str})") # Changed to debug
                    nodes_processed += 1

                except Exception as e:
                    logger.error(f"Failed to process node item (ID: {item.get('id', 'N/A')}): {e}", exc_info=True)
                    nodes_failed += 1
            logger.info(f"Node population finished. Processed: {nodes_processed}, Failed: {nodes_failed}")

            # --- Populate Relationships ---
            logger.info("Starting relationship population...")
            rels_processed = 0
            rels_failed = 0
            # Relationship creation loop (reusing existing logic, just nested)
            for item in concepts_data:
                start_node_id = item.get('id')
                if not start_node_id:
                    continue

                relationships = item.get('relationships')
                if isinstance(relationships, list):
                    for rel in relationships:
                        try:
                            target_node_id = rel.get('target_id')
                            rel_type_str = rel.get('type')
                            rel_properties = rel.get('properties', {})

                            if not target_node_id or not rel_type_str:
                                logger.warning(f"Skipping relationship from '{start_node_id}' due to missing 'target_id' or 'type': {rel}")
                                rels_failed += 1
                                continue

                            # --- Robust Relationship Type Handling ---
                            rel_type_enum = None
                            try:
                                # Attempt direct match first (case-sensitive based on Enum definition)
                                rel_type_enum = RelationshipType(rel_type_str)
                            except ValueError:
                                # Handle common variations or fall back to RELATED_TO
                                normalized_type = rel_type_str.upper().replace(" ", "_")
                                if normalized_type == "IS_A" or normalized_type == "INSTANCEOF":
                                     rel_type_enum = RelationshipType.INSTANCE_OF
                                elif normalized_type == "PART_OF" or normalized_type == "CONTAINED_IN": # Map CONTAINED_IN if LLM used it
                                     rel_type_enum = RelationshipType.PART_OF
                                # Add other specific mappings if needed (e.g., KEY_CONCEPT_IN -> DISCUSSED_BY or RELATED_TO?)
                                elif normalized_type == "KEY_CONCEPT_IN" or normalized_type == "ASSOCIATED_WITH":
                                     rel_type_enum = RelationshipType.RELATED_TO # Or map to DISCUSSED_BY if appropriate target type
                                elif normalized_type == "CONTAINS": # Map CONTAINS to inverse PART_OF is complex, use RELATED_TO
                                     rel_type_enum = RelationshipType.RELATED_TO
                                # Add more specific mappings here...
                                else:
                                     # Default fallback
                                     rel_type_enum = RelationshipType.RELATED_TO
                                     logger.warning(f"Unknown relationship type '{rel_type_str}' from {start_node_id} to {target_node_id}. Using fallback '{rel_type_enum.value}'.")
                                # Log successful mapping if it wasn't a direct match
                                if rel_type_enum and rel_type_enum.value != rel_type_str:
                                    logger.info(f"Mapped relationship type '{rel_type_str}' to '{rel_type_enum.value}' for {start_node_id} -> {target_node_id}.")


                            # --- Execute Relationship Addition ---
                            if rel_type_enum: # Ensure we successfully got an enum member
                                session.execute_write(add_relationship,
                                                      start_node_id=start_node_id,
                                                      end_node_id=target_node_id,
                                                      relationship_type=rel_type_enum, # Use the mapped/fallback enum member
                                                      properties=rel_properties)
                                # logger.debug(f"Processed relationship: {start_node_id} -[{rel_type_enum.value}]-> {target_node_id}") # Changed to debug
                                rels_processed += 1
                            else:
                                # This case should technically not be reachable with the RELATED_TO fallback,
                                # but it's good practice to handle it.
                                logger.error(f"Could not determine a valid RelationshipType for '{rel_type_str}' from {start_node_id} to {target_node_id}. Skipping relationship.")
                                rels_failed += 1

                        except neo4j.exceptions.ConstraintError as ce:
                            logger.error(f"Constraint error processing relationship (Start ID: {start_node_id}, Target ID: {rel.get('target_id', 'N/A')}): {ce}. This might indicate the target node doesn't exist or has ID issues.")
                            rels_failed += 1
                        except Exception as e:
                            logger.error(f"Failed to process relationship item (Start ID: {start_node_id}, Rel: {rel}): {e}", exc_info=True)
                            rels_failed += 1
            logger.info(f"Relationship population finished. Processed: {rels_processed}, Failed: {rels_failed}")

        logger.info("Neo4j population completed successfully.")

    # Specific Neo4j exception handling
    except neo4j.exceptions.AuthError as e:
        logger.critical(f"Neo4j Authentication Error: {e}. Check NEO4J_USER/NEO4J_PASSWORD in .env and ensure they are correctly loaded.")
        sys.exit(1)
    except neo4j.exceptions.ServiceUnavailable as e:
        # Provide more context in the error message
        logger.critical(f"Neo4j Service Unavailable: Couldn't connect to {settings.NEO4J_URI}. Check the URI in .env, network connectivity, and the Aura instance status. Error: {e}")
        sys.exit(1)
    except Exception as e:
        # General exception handler
        logger.critical(f"An unexpected error occurred during script execution: {e}", exc_info=True)
        sys.exit(1)
    finally:
        # Ensure the driver is closed if it was initialized
        if driver:
            driver.close()
            logger.info("Neo4j connection closed.")

    logger.info("Script finished.") 