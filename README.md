# Forge of Thought

## Quick start
```bash
python scripts/seed_neo4j.py && python scripts/seed_chromadb.py
uvicorn backend.app.main:app --reload --port 8000
npm --prefix frontend run dev
``` 