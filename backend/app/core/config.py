import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file variables
load_dotenv()

class Settings(BaseSettings):
    # Application Settings
    PROJECT_NAME: str = "Forge of Thought API"
    API_V1_STR: str = "/api/v1"
    SERVER_PORT: int = int(os.getenv("SERVER_PORT", "8000"))

    # Neo4j Database
    NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "password") # Replace default in .env!
    NEO4J_DATABASE: str = os.getenv("NEO4J_DATABASE", "neo4j") # Specify the database name

    # ChromaDB Vector Database
    CHROMA_HOST: str = os.getenv("CHROMA_HOST", "localhost")
    CHROMA_PORT: int = int(os.getenv("CHROMA_PORT", "8080"))
    CHROMA_COLLECTION: str = os.getenv("CHROMA_COLLECTION", "concepts")
    # Add path for persistent client
    CHROMA_DB_PATH: str = os.getenv("CHROMA_DB_PATH", "./chroma_data")

    # Optional: Specify embedding function or other Chroma settings if needed

    class Config:
        # If you have a .env file, pydantic-settings will load it automatically
        # Specify the path if it's not in the root
        # env_file = ".env"
        case_sensitive = True

# Instantiate settings
settings = Settings() 