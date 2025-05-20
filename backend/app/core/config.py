import os
from pathlib import Path
from pydantic import Field, validator
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file variables with proper path resolution
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent / ".env")

class Settings(BaseSettings):
    # Application Settings
    PROJECT_NAME: str = "Forge of Thought API"
    API_V1_STR: str = "/api/v1"
    SERVER_PORT: int = int(os.getenv("SERVER_PORT", "8001"))

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
    
    # ChromaDB Server settings for HttpClient
    CHROMA_SERVER_HOST: str = os.getenv("CHROMA_SERVER_HOST", "localhost")
    CHROMA_SERVER_HTTP_PORT: int = int(os.getenv("CHROMA_SERVER_HTTP_PORT", "8000"))
    CHROMA_DEFAULT_COLLECTION: str = os.getenv("CHROMA_DEFAULT_COLLECTION", "concepts")
    EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")

    # LLM API Keys
    # openai_api_key: str = Field(..., env="OPENAI_API_KEY") # Commented out OpenAI key
    google_api_key: str | None = Field(default=None, env="GOOGLE_API_KEY")
    OPENAI_API_KEY: str = ""
    # Map GOOGLE_API_KEY to GEMINI_API_KEY for compatibility
    GEMINI_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")

    # Optional: Specify embedding function or other Chroma settings if needed

    # @validator('openai_api_key') # Commented out OpenAI validator
    # def check_openai_key(cls, v):
    #     if not v:
    #         raise ValueError("OPENAI_API_KEY environment variable must be set.")
    #     return v

    # Removed the Google API key validator to make it optional
    # @validator('google_api_key')
    # def check_google_key(cls, v):
    #     if not v:
    #         raise ValueError("GOOGLE_API_KEY environment variable must be set.")
    #     return v

    class Config:
        # If you have a .env file, pydantic-settings will load it automatically
        # Specify the path if it's not in the root
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = True
        extra = "ignore"

# Instantiate settings
settings = Settings() 

# Check for required environment variables
# Removed GOOGLE_API_KEY from required list
required = ["NEO4J_URI","NEO4J_USER","NEO4J_PASSWORD","OPENAI_API_KEY"]
for k in required:
    if not os.getenv(k):
        raise RuntimeError(f"Missing env var {k}") 