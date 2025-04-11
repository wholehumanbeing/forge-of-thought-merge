from pydantic import BaseModel
from typing import List, Optional

class ArchetypeSelectionRequest(BaseModel):
    archetype_id: str

class SeedConcept(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    x: Optional[float] = None # Optional initial position
    y: Optional[float] = None # Optional initial position

class ArchetypeSelectionResponse(BaseModel):
    seed_concepts: List[SeedConcept] 