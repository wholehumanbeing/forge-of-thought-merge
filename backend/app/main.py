import sys
import site
print("--- sys.path ---")
print(sys.path)
print("--- site packages ---")
print(site.getsitepackages())
print("--- user site packages ---")
print(site.getusersitepackages())
print("-----------------")

from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware # Import CORS middleware
import logging

from app.api.endpoints import synthesis
from app.api.endpoints import onboarding # Import the onboarding router
from app.api.endpoints import concepts # <-- Import the new concepts router
from app.api.endpoints import suggestions # <-- Import the new suggestions router
from app.api.dependencies import close_kg_connection, get_kg_interface
from app.core.config import settings
from app.db.knowledge_graph_interface import Neo4jKnowledgeGraph

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Context manager for application lifespan events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize resources (e.g., DB connections could be checked here)
    print("Starting up Forge of Thought API...")
    
    # Check if database is reachable, but don't fail app startup if it's not
    try:
        kg_interface = get_kg_interface()
        kg_interface.get_driver()
        print("Successfully connected to Neo4j database.")
    except Exception as e:
        print(f"WARNING: Could not connect to Neo4j database: {e}")
        print("The API will continue to start up, but database-dependent features may fail.")
        print("Fallback data will be used where possible.")
    
    yield
    # Shutdown: Cleanup resources
    print("Shutting down Forge of Thought API...")
    close_kg_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan # Use the lifespan context manager
)

# --- Add CORS Middleware ---
# Define allowed origins (your frontend URL)
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",  # Also include 127.0.0.1
    "http://localhost:5174",  # Vite dev server (Current)
    "http://127.0.0.1:5174",  # Also include 127.0.0.1 (Current)
    "http://localhost:8080",  # Add new frontend origin
    "http://localhost:8082",  # New frontend origin
    "http://127.0.0.1:8082",  # Also include 127.0.0.1 for new origin
]

# Configure CORS middleware with explicit parameters
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    expose_headers=["Content-Length", "Content-Type"],
    max_age=600,  # How long the results of a preflight request can be cached, in seconds
)
# --- End CORS Middleware ---

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    logger.info(f"Headers: {request.headers}")
    
    response = await call_next(request)
    
    logger.info(f"Response status: {response.status_code}")
    return response

@app.get("/")
def read_root():
    return {"message": "Welcome to the Forge of Thought API"}

@app.get("/health")
async def health_check():
    """Health check endpoint to verify API and database status"""
    status = {
        "api": "healthy",
        "database": "unknown"
    }
    
    try:
        kg_interface = get_kg_interface()
        # Try to get the driver but don't call verify_connection which raises an exception
        _ = kg_interface.get_driver()
        status["database"] = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        status["database"] = "disconnected"
        
    return status

# Include the synthesis API router
app.include_router(synthesis.router, prefix=settings.API_V1_STR, tags=["Synthesis & Lineage"])

# Include the onboarding API router
app.include_router(onboarding.router, prefix=f"{settings.API_V1_STR}/onboarding", tags=["Onboarding"])

# Include the concepts API router
app.include_router(concepts.router, prefix=f"{settings.API_V1_STR}/concepts", tags=["Concepts"])

# Include the suggestions API router
app.include_router(suggestions.router, prefix=f"{settings.API_V1_STR}/suggestions", tags=["Suggestions"])

# Placeholder for future routers
# from app.api import nodes, edges, graph # Example routers
# app.include_router(nodes.router, prefix=settings.API_V1_STR)
# app.include_router(edges.router, prefix=settings.API_V1_STR)
# app.include_router(graph.router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    # Note: Run with `uvicorn app.main:app --reload` from the `backend` directory
    # Use port from settings
    uvicorn.run(app, host="0.0.0.0", port=settings.SERVER_PORT) 