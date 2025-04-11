# This directory contains interfaces for interacting with databases.
#
# Local Development Setup Notes:
#
# Neo4j (Knowledge Graph):
# 1. Install Neo4j Desktop OR run via Docker:
#    docker run \
#        --name neo4j_dev \
#        --publish=7474:7474 --publish=7687:7687 \
#        --env NEO4J_AUTH=neo4j/your_dev_password \
#        neo4j:latest
#    (Replace 'your_dev_password' with a secure password)
#
# 2. Access Neo4j Browser at: http://localhost:7474
#    Login with user 'neo4j' and the password you set (e.g., 'your_dev_password').
#    You might be prompted to change the password on first login.
#
# 3. Update the project's .env file (create if it doesn't exist):
#    NEO4J_URI="neo4j://localhost:7687"
#    NEO4J_USER="neo4j"
#    NEO4J_PASSWORD="your_dev_password" # Use the password you set
#
# ChromaDB (Vector Database):
# 1. ChromaDB will be used in persistent local mode via the Python client library.
#    No separate server installation is strictly required for basic local development.
#
# 2. Specify the persistent storage path in the .env file:
#    CHROMA_DB_PATH="./chroma_db_data"
#    The Chroma client will automatically create this directory if it doesn't exist
#    when it's initialized with this path.
#
# Initial Data Population:
# - Note: Populating the Knowledge Graph (Neo4j) and Vector Database (ChromaDB)
#   with initial concepts and embeddings will be handled in subsequent setup steps
#   or via specific data loading scripts. 